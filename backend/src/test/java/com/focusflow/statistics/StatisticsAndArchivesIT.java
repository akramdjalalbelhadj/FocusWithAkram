package com.focusflow.statistics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class StatisticsAndArchivesIT extends IntegrationTest {

    private String createTask(String title, String plannedEnd) throws Exception {
        String planned = plannedEnd == null ? "" : ",\"plannedEndAt\":\"" + plannedEnd + "\"";
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\"" + planned + "}")).andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.id");
    }

    private void complete(String id, String start, String end) throws Exception {
        mvc.perform(post("/api/v1/tasks/" + id + "/complete").contentType(MediaType.APPLICATION_JSON)
                .content("{\"actualStartAt\":\"" + start + "\",\"actualEndAt\":\"" + end + "\"}")).andExpect(status().isOk());
    }

    @Test
    void groupsByLocalDayOfActualEndNotByUtcDayOrCreation() throws Exception {
        // 23:30 UTC le 29 = 00:30 le 30 a Paris (CET) : "aujourd'hui" cote utilisateur.
        String t1 = createTask("Apres minuit local", "2026-10-30T00:00:00Z");
        complete(t1, "2026-10-29T08:00:00Z", "2026-10-29T23:30:00Z");
        String t2 = createTask("Hier", "2026-10-29T12:00:00Z");
        complete(t2, "2026-10-29T08:00:00Z", "2026-10-29T14:00:00Z");

        mvc.perform(get("/api/v1/tasks/archives"))
                .andExpect(jsonPath("$.items[0].task.title").value("Apres minuit local"))
                .andExpect(jsonPath("$.items[0].section").value("TODAY"))
                .andExpect(jsonPath("$.items[0].day").value("2026-10-30"))
                .andExpect(jsonPath("$.items[1].section").value("YESTERDAY"))
                .andExpect(jsonPath("$.items[1].day").value("2026-10-29"));
        mvc.perform(get("/api/v1/tasks/archives").param("order", "asc"))
                .andExpect(jsonPath("$.items[0].task.title").value("Hier"));
        mvc.perform(get("/api/v1/tasks/archives/facets"))
                .andExpect(jsonPath("$[0].date").value("2026-10-30"))
                .andExpect(jsonPath("$[0].count").value(1))
                .andExpect(jsonPath("$[1].date").value("2026-10-29"));
    }

    @Test
    void periodFilterHandlesTheAutumnDaylightSavingChange() throws Exception {
        clock.set(Instant.parse("2026-11-02T10:00:00Z"));
        // Le 25 octobre 2026 dure 25 h a Paris : de 2026-10-24T22:00Z a 2026-10-25T23:00Z.
        String before = createTask("Avant (24 local)", null);
        complete(before, "2026-10-24T08:00:00Z", "2026-10-24T21:59:00Z");
        String start = createTask("Debut du 25", null);
        complete(start, "2026-10-24T08:00:00Z", "2026-10-24T22:30:00Z");
        String end = createTask("Fin du 25", null);
        complete(end, "2026-10-24T08:00:00Z", "2026-10-25T22:30:00Z");
        String after = createTask("Apres (26 local)", null);
        complete(after, "2026-10-24T08:00:00Z", "2026-10-25T23:30:00Z");

        String body = mvc.perform(get("/api/v1/tasks/archives").param("from", "2026-10-25").param("to", "2026-10-25").param("order", "asc"))
                .andReturn().getResponse().getContentAsString();
        List<String> titles = JsonPath.read(body, "$.items[*].task.title");
        assertThat(titles).containsExactly("Debut du 25", "Fin du 25");
    }

    @Test
    void periodFilterHandlesTheSpringDaylightSavingChange() throws Exception {
        clock.set(Instant.parse("2026-04-10T10:00:00Z"));
        // Le 29 mars 2026 dure 23 h : de 2026-03-28T23:00Z a 2026-03-29T22:00Z.
        String in = createTask("Dans le 29", null);
        complete(in, "2026-03-28T08:00:00Z", "2026-03-29T21:59:00Z");
        String out = createTask("Hors du 29", null);
        complete(out, "2026-03-28T08:00:00Z", "2026-03-29T22:00:00Z");

        String body = mvc.perform(get("/api/v1/tasks/archives").param("from", "2026-03-29").param("to", "2026-03-29"))
                .andReturn().getResponse().getContentAsString();
        assertThat((List<String>) JsonPath.read(body, "$.items[*].task.title")).containsExactly("Dans le 29");
    }

    @Test
    void archiveFiltersByTitleProjectAndQuadrant() throws Exception {
        String project = JsonPath.read(mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Alpha\"}")).andReturn().getResponse().getContentAsString(), "$.id");
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Rapport final\",\"quadrant\":\"Q1\",\"projectId\":\"" + project + "\"}"))
                .andReturn().getResponse().getContentAsString();
        complete(JsonPath.read(res, "$.id"), "2026-10-30T08:00:00Z", "2026-10-30T09:00:00Z");
        complete(createTask("Autre", null), "2026-10-30T08:00:00Z", "2026-10-30T09:30:00Z");

        mvc.perform(get("/api/v1/tasks/archives").param("q", "rapport")).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/tasks/archives").param("projectId", project)).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/tasks/archives").param("quadrant", "Q1")).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/tasks/archives").param("quadrant", "Q3")).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void statisticsAreComputedFromRecordedDataInTheUserTimeZone() throws Exception {
        String early = createTask("En avance", "2026-10-30T00:00:00Z");
        complete(early, "2026-10-29T08:00:00Z", "2026-10-29T23:30:00Z"); // -30 min, jour local 30
        String late = createTask("En retard", "2026-10-29T12:00:00Z");
        complete(late, "2026-10-29T08:00:00Z", "2026-10-29T14:00:00Z"); // +2 h, jour local 29
        createTask("Reste a faire", "2026-10-01T10:00:00Z");

        mvc.perform(get("/api/v1/statistics/productivity").param("from", "2026-10-29").param("to", "2026-10-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeZone").value("Europe/Paris"))
                .andExpect(jsonPath("$.tasks.created").value(3))
                .andExpect(jsonPath("$.tasks.completed").value(2))
                .andExpect(jsonPath("$.tasks.overdueNow").value(1))
                .andExpect(jsonPath("$.tasks.byStatus.DONE").value(2))
                .andExpect(jsonPath("$.tasks.byStatus.TODO").value(1))
                .andExpect(jsonPath("$.tasks.activeByQuadrant.Q2").value(1))
                .andExpect(jsonPath("$.planning.early").value(1))
                .andExpect(jsonPath("$.planning.late").value(1))
                .andExpect(jsonPath("$.planning.averageEndVarianceSeconds").value(2700))
                .andExpect(jsonPath("$.planning.comparisons.length()").value(0))
                .andExpect(jsonPath("$.daily.length()").value(2))
                .andExpect(jsonPath("$.daily[0].date").value("2026-10-29"))
                .andExpect(jsonPath("$.daily[0].tasksCompleted").value(1))
                .andExpect(jsonPath("$.daily[1].tasksCompleted").value(1));

        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(jsonPath("$.today").value("2026-10-30"))
                .andExpect(jsonPath("$.kpis.completedToday").value(1))
                .andExpect(jsonPath("$.kpis.remainingTasks").value(1))
                .andExpect(jsonPath("$.kpis.overdueTasks").value(1))
                .andExpect(jsonPath("$.week.length()").value(7));
    }

    @Test
    void statisticsCompareDurationsAndRejectInvalidRanges() throws Exception {
        String t = createTask("Compare", "2026-10-29T12:00:00Z");
        mvc.perform(patch("/api/v1/tasks/" + t).contentType(MediaType.APPLICATION_JSON)
                .content("{\"plannedStartAt\":\"2026-10-29T09:00:00Z\"}")).andExpect(status().isOk());
        complete(t, "2026-10-29T09:25:00Z", "2026-10-29T13:10:00Z");

        mvc.perform(get("/api/v1/statistics/productivity").param("from", "2026-10-29").param("to", "2026-10-29"))
                .andExpect(jsonPath("$.planning.comparisons[0].plannedSeconds").value(3 * 3600))
                .andExpect(jsonPath("$.planning.comparisons[0].elapsedSeconds").value(3 * 3600 + 45 * 60))
                .andExpect(jsonPath("$.planning.totalPlannedSeconds").value(3 * 3600))
                .andExpect(jsonPath("$.planning.totalElapsedSeconds").value(3 * 3600 + 45 * 60));

        mvc.perform(get("/api/v1/statistics/productivity").param("from", "2026-10-30").param("to", "2026-10-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/statistics/productivity").param("from", "2020-01-01").param("to", "2026-10-01"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void focusStatisticsAndDailyGoalFollowRealSessions() throws Exception {
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content("{\"dailyFocusGoalMinutes\":30}"));
        String project = JsonPath.read(mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Deep work\",\"color\":\"#22c55e\"}")).andReturn().getResponse().getContentAsString(), "$.id");
        String task = JsonPath.read(mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Etude\",\"projectId\":\"" + project + "\"}")).andReturn().getResponse().getContentAsString(), "$.id");

        for (int i = 0; i < 2; i++) {
            String id = JsonPath.read(mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}")).andReturn().getResponse().getContentAsString(), "$.session.id");
            clock.advance(Duration.ofMinutes(25));
            mvc.perform(post("/api/v1/pomodoro/sessions/" + id + "/complete")).andExpect(status().isOk());
        }

        mvc.perform(get("/api/v1/statistics/productivity").param("from", "2026-10-30").param("to", "2026-10-30"))
                .andExpect(jsonPath("$.focus.totalSeconds").value(50 * 60))
                .andExpect(jsonPath("$.focus.completedSessions").value(2))
                .andExpect(jsonPath("$.focus.averageSessionSeconds").value(25 * 60))
                .andExpect(jsonPath("$.focus.daysGoalReached").value(1))
                .andExpect(jsonPath("$.focus.byProject[0].name").value("Deep work"))
                .andExpect(jsonPath("$.focus.byProject[0].focusSeconds").value(50 * 60))
                .andExpect(jsonPath("$.focus.byTask[0].title").value("Etude"));
        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(jsonPath("$.kpis.pomodorosToday").value(2))
                .andExpect(jsonPath("$.kpis.dailyGoalProgress").value(1.0));
    }

    @Test
    void top3IsLimitedToThreeActiveTasksAndTracksProgress() throws Exception {
        String a = createTask("A", null);
        String b = createTask("B", null);
        String c = createTask("C", null);
        String d = createTask("D", null);

        mvc.perform(put("/api/v1/dashboard/top3").contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskIds\":[\"" + a + "\",\"" + b + "\",\"" + c + "\",\"" + d + "\"]}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/dashboard/top3").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskIds\":[\"" + c + "\",\"" + a + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks[0].title").value("C"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.done").value(0));

        complete(c, "2026-10-30T08:00:00Z", "2026-10-30T09:00:00Z");
        mvc.perform(get("/api/v1/dashboard/summary")).andExpect(jsonPath("$.top3.done").value(1)).andExpect(jsonPath("$.top3.total").value(2));
        mvc.perform(put("/api/v1/dashboard/top3").contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskIds\":[\"" + c + "\"]}")).andExpect(status().isUnprocessableEntity());
    }
}
