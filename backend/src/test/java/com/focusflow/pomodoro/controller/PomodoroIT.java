package com.focusflow.pomodoro.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class PomodoroIT extends IntegrationTest {

    private String createTask(String title) throws Exception {
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"" + title + "\"}"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.id");
    }

    private String startSession(String body) throws Exception {
        String res = mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.session.id");
    }

    @Test
    void startUsesConfiguredDurationAndLinksTheTask() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/settings")
                .contentType(MediaType.APPLICATION_JSON).content("{\"workMinutes\":40}"));
        String task = createTask("Focus");
        mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.session.plannedSeconds").value(40 * 60))
                .andExpect(jsonPath("$.session.remainingSeconds").value(40 * 60))
                .andExpect(jsonPath("$.session.taskTitle").value("Focus"))
                .andExpect(jsonPath("$.session.next.type").value("SHORT_BREAK"))
                .andExpect(jsonPath("$.serverTime").value("2026-10-30T10:00:00Z"));
        // Travailler sur une tache la demarre.
        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void onlyOneSessionCanBeActiveAtATime() throws Exception {
        startSession("{\"type\":\"WORK\"}");
        mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"WORK\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_ALREADY_ACTIVE"));
    }

    @Test
    void activeSessionSurvivesReloadWithCorrectRemainingTime() throws Exception {
        startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(7));
        mvc.perform(get("/api/v1/pomodoro/sessions/active"))
                .andExpect(jsonPath("$.session.status").value("RUNNING"))
                .andExpect(jsonPath("$.session.remainingSeconds").value(18 * 60))
                .andExpect(jsonPath("$.session.expectedEndAt").value("2026-10-30T10:25:00Z"));
    }

    @Test
    void pauseThenResumeShiftsTheEndByThePauseDuration() throws Exception {
        String id = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(10));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/pause"))
                .andExpect(jsonPath("$.session.status").value("PAUSED"))
                .andExpect(jsonPath("$.session.remainingSeconds").value(15 * 60));
        clock.advance(Duration.ofMinutes(30));
        mvc.perform(get("/api/v1/pomodoro/sessions/active")).andExpect(jsonPath("$.session.remainingSeconds").value(15 * 60));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/resume"))
                .andExpect(jsonPath("$.session.status").value("RUNNING"))
                // Reprise a 10:40 avec 15 min restantes : la pause de 30 min decale la fin de 10:25 a 10:55.
                .andExpect(jsonPath("$.session.expectedEndAt").value("2026-10-30T10:55:00Z"));
    }

    @Test
    void completeIsRefusedEarlyThenAcceptedAndCountedExactlyOnce() throws Exception {
        String task = createTask("Focus");
        String id = startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}");

        clock.advance(Duration.ofMinutes(10));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SESSION_NOT_FINISHED"));

        clock.advance(Duration.ofMinutes(16));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("COMPLETED"))
                .andExpect(jsonPath("$.session.workedSeconds").value(25 * 60))
                .andExpect(jsonPath("$.session.next.type").value("SHORT_BREAK"));
        // Rejouer la requete (double clic, reessai reseau) ne double pas le temps.
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.timeSpentSeconds").value(25 * 60));
        mvc.perform(get("/api/v1/pomodoro/sessions/active")).andExpect(jsonPath("$.session").doesNotExist());
    }

    @Test
    void interruptedSessionKeepsWorkedTimeButIsNotACompletedPomodoro() throws Exception {
        String task = createTask("Focus");
        String id = startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}");
        clock.advance(Duration.ofMinutes(9));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/cancel"))
                .andExpect(jsonPath("$.session.status").value("CANCELLED"))
                .andExpect(jsonPath("$.session.workedSeconds").value(9 * 60));

        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.timeSpentSeconds").value(9 * 60));
        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(jsonPath("$.kpis.pomodorosToday").value(0))
                .andExpect(jsonPath("$.kpis.focusSecondsToday").value(9 * 60));
    }

    @Test
    void sessionAbandonedForHoursIsSettledAtItsTheoreticalEndWithoutGhostTime() throws Exception {
        String task = createTask("Focus");
        startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}");
        clock.advance(Duration.ofHours(6)); // navigateur ferme, ordinateur en veille...

        mvc.perform(get("/api/v1/pomodoro/sessions/active"))
                .andExpect(jsonPath("$.session.status").value("COMPLETED"))
                .andExpect(jsonPath("$.session.workedSeconds").value(25 * 60))
                .andExpect(jsonPath("$.session.endedAt").value("2026-10-30T10:25:00Z"));
        mvc.perform(get("/api/v1/pomodoro/sessions/active")).andExpect(jsonPath("$.session").doesNotExist());
        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.timeSpentSeconds").value(25 * 60));
        // On peut alors enchainer sur une nouvelle session.
        startSession("{\"type\":\"SHORT_BREAK\"}");
    }

    @Test
    void breaksDoNotCountAsWorkedTimeAndCannotHaveATask() throws Exception {
        String task = createTask("Focus");
        mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SHORT_BREAK\",\"taskId\":\"" + task + "\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TASK_ON_BREAK"));

        String id = startSession("{\"type\":\"SHORT_BREAK\"}");
        clock.advance(Duration.ofMinutes(6));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete")).andExpect(jsonPath("$.session.workedSeconds").value(0));
        mvc.perform(get("/api/v1/dashboard/summary")).andExpect(jsonPath("$.kpis.focusSecondsToday").value(0));
    }

    @Test
    void longBreakIsSuggestedAfterTheConfiguredNumberOfSessions() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/settings")
                .contentType(MediaType.APPLICATION_JSON).content("{\"sessionsBeforeLong\":2,\"longBreakMinutes\":20}"));
        String first = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(26));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + first + "/complete")).andExpect(jsonPath("$.session.next.type").value("SHORT_BREAK"));

        String brk = startSession("{\"type\":\"SHORT_BREAK\"}");
        clock.advance(Duration.ofMinutes(6));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + brk + "/complete"))
                .andExpect(jsonPath("$.session.next.type").value("WORK"))
                .andExpect(jsonPath("$.session.next.sequenceNumber").value(2));

        String second = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(26));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + second + "/complete"))
                .andExpect(jsonPath("$.session.next.type").value("LONG_BREAK"))
                .andExpect(jsonPath("$.session.next.plannedSeconds").value(20 * 60));
    }

    @Test
    void cannotWorkOnAFinishedTaskAndHistoryListsSessions() throws Exception {
        String task = createTask("Fini");
        mvc.perform(post("/api/v1/tasks/" + task + "/complete").contentType(MediaType.APPLICATION_JSON)
                .content("{\"actualStartAt\":\"2026-10-30T09:00:00Z\"}"));
        mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}"))
                .andExpect(status().isUnprocessableEntity());

        String id = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete"));
        mvc.perform(get("/api/v1/pomodoro/history")).andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void dailyHistoryListsEachPomodoroWithDateTimeAndDurationPerDay() throws Exception {
        String task = createTask("Histo");
        String a = startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + a + "/complete"));
        String b = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(10));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + b + "/cancel"));
        clock.advance(Duration.ofDays(1));
        String c = startSession("{\"type\":\"WORK\"}");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + c + "/complete"));

        mvc.perform(get("/api/v1/pomodoro/history/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].date").value("2026-10-31"))
                .andExpect(jsonPath("$[0].workedSeconds").value(25 * 60))
                .andExpect(jsonPath("$[1].date").value("2026-10-30"))
                .andExpect(jsonPath("$[1].workedSeconds").value(35 * 60))
                .andExpect(jsonPath("$[1].completedSessions").value(1))
                .andExpect(jsonPath("$[1].interruptedSessions").value(1))
                .andExpect(jsonPath("$[1].sessions.length()").value(2))
                .andExpect(jsonPath("$[1].sessions[1].taskTitle").value("Histo"))
                .andExpect(jsonPath("$[1].sessions[1].startedAt").value("2026-10-30T10:00:00Z"));
    }

    @Test
    void sessionsOfEachExecutionCycleStayWithTheirCycle() throws Exception {
        String task = createTask("Cycles");
        String s1 = startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + s1 + "/complete"));
        mvc.perform(post("/api/v1/tasks/" + task + "/complete")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/tasks/" + task + "/restore"));

        String s2 = startSession("{\"type\":\"WORK\",\"taskId\":\"" + task + "\",\"plannedSeconds\":600}");
        clock.advance(Duration.ofMinutes(10));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + s2 + "/complete"));

        mvc.perform(get("/api/v1/tasks/" + task + "/executions"))
                .andExpect(jsonPath("$[0].sessions.length()").value(1))
                .andExpect(jsonPath("$[0].timing.activeSeconds").value(25 * 60))
                .andExpect(jsonPath("$[1].current").value(true))
                .andExpect(jsonPath("$[1].timing.activeSeconds").value(10 * 60));
        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.timeSpentSeconds").value(35 * 60));
    }
}
