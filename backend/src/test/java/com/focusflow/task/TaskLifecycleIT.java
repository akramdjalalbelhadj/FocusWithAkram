package com.focusflow.task;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class TaskLifecycleIT extends IntegrationTest {

    private String create(String body) throws Exception {
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.id");
    }

    private void expectStatus(String method, String path, String body, int expected) throws Exception {
        var builder = switch (method) {
            case "PATCH" -> patch(path);
            case "GET" -> get(path);
            default -> post(path);
        };
        mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().is(expected));
    }

    private String project(String name) throws Exception {
        return JsonPath.read(mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\"}")).andReturn().getResponse().getContentAsString(), "$.id");
    }

    @Test
    void aTaskCanBelongToSeveralProjects() throws Exception {
        String a = project("Alpha");
        String b = project("Beta");
        String id = create("{\"title\":\"Partagee\",\"projectIds\":[\"" + b + "\",\"" + a + "\"]}");
        mvc.perform(get("/api/v1/tasks/" + id))
                .andExpect(jsonPath("$.project.id").value(b))
                .andExpect(jsonPath("$.projects.length()").value(2))
                .andExpect(jsonPath("$.projects[1].id").value(a));
        mvc.perform(get("/api/v1/tasks").param("projectId", a)).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/projects/" + a)).andExpect(jsonPath("$.totalTasks").value(1));

        mvc.perform(patch("/api/v1/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"projectIds\":[\"" + a + "\"]}"))
                .andExpect(jsonPath("$.projects.length()").value(1))
                .andExpect(jsonPath("$.project.id").value(a));
        mvc.perform(get("/api/v1/tasks").param("projectId", b)).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void creationRecordsCreatedAtServerSideAndLeavesActualDatesEmpty() throws Exception {
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Ecrire le rapport","quadrant":"Q1",
                                 "plannedStartAt":"2026-10-30T12:00:00Z","plannedEndAt":"2026-10-30T15:00:00Z",
                                 "createdAt":"2000-01-01T00:00:00Z"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.quadrant").value("Q1"))
                .andExpect(jsonPath("$.important").value(true))
                .andExpect(jsonPath("$.urgent").value(true))
                .andExpect(jsonPath("$.actualStartAt").doesNotExist())
                .andExpect(jsonPath("$.actualEndAt").doesNotExist())
                .andExpect(jsonPath("$.timing.plannedDurationSeconds").value(3 * 3600))
                .andReturn().getResponse().getContentAsString();
        // createdAt est attribuee par le backend et non modifiable par le client.
        org.assertj.core.api.Assertions.assertThat(Instant.parse(JsonPath.read(res, "$.createdAt"))).isEqualTo(START);
    }

    @Test
    void startKeepsOriginalActualStartAcrossPauseAndResume() throws Exception {
        String id = create("{\"title\":\"T\"}");
        mvc.perform(post("/api/v1/tasks/" + id + "/start"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.actualStartAt").value("2026-10-30T10:00:00Z"));

        clock.advance(Duration.ofHours(2));
        mvc.perform(patch("/api/v1/tasks/" + id + "/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"TODO\"}"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.actualStartAt").value("2026-10-30T10:00:00Z"));

        clock.advance(Duration.ofHours(1));
        mvc.perform(post("/api/v1/tasks/" + id + "/start"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.actualStartAt").value("2026-10-30T10:00:00Z"));
    }

    @Test
    void explicitRetroactiveStartIsAcceptedButNotInTheFuture() throws Exception {
        String id = create("{\"title\":\"T\"}");
        mvc.perform(post("/api/v1/tasks/" + id + "/start").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actualStartAt\":\"2026-10-29T08:30:00Z\"}"))
                .andExpect(jsonPath("$.actualStartAt").value("2026-10-29T08:30:00Z"));
        expectStatus("POST", "/api/v1/tasks/" + id + "/start", "{\"actualStartAt\":\"2026-11-30T08:30:00Z\"}", 422);
    }

    @Test
    void completeArchivesTaskKeepsPlanAndComputesVariances() throws Exception {
        String id = create("""
                {"title":"Livrable","quadrant":"Q2",
                 "plannedStartAt":"2026-10-30T09:00:00Z","plannedEndAt":"2026-10-30T12:00:00Z"}""");
        clock.set(Instant.parse("2026-10-30T09:25:00Z"));
        mvc.perform(post("/api/v1/tasks/" + id + "/start")).andExpect(status().isOk());
        clock.set(Instant.parse("2026-10-30T13:10:00Z"));

        mvc.perform(post("/api/v1/tasks/" + id + "/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"))
                .andExpect(jsonPath("$.plannedStartAt").value("2026-10-30T09:00:00Z"))
                .andExpect(jsonPath("$.plannedEndAt").value("2026-10-30T12:00:00Z"))
                .andExpect(jsonPath("$.actualEndAt").value("2026-10-30T13:10:00Z"))
                .andExpect(jsonPath("$.archivedAt").value("2026-10-30T13:10:00Z"))
                .andExpect(jsonPath("$.timing.plannedDurationSeconds").value(3 * 3600))
                .andExpect(jsonPath("$.timing.actualElapsedSeconds").value(3 * 3600 + 45 * 60))
                .andExpect(jsonPath("$.timing.startVarianceSeconds").value(25 * 60))
                .andExpect(jsonPath("$.timing.endVarianceSeconds").value(70 * 60))
                .andExpect(jsonPath("$.timing.durationVarianceSeconds").value(45 * 60))
                .andExpect(jsonPath("$.timing.punctuality").value("LATE"));

        // Disparait des vues actives, apparait dans les archives.
        mvc.perform(get("/api/v1/eisenhower/matrix")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/tasks/archives"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].section").value("TODAY"))
                .andExpect(jsonPath("$.items[0].task.title").value("Livrable"));
    }

    @Test
    void completingAnUnstartedTaskRequiresAnExplicitActualStart() throws Exception {
        String id = create("{\"title\":\"Jamais demarree\"}");
        mvc.perform(post("/api/v1/tasks/" + id + "/complete"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("ACTUAL_START_REQUIRED"));

        mvc.perform(post("/api/v1/tasks/" + id + "/complete").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actualStartAt\":\"2026-10-30T08:00:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actualStartAt").value("2026-10-30T08:00:00Z"))
                .andExpect(jsonPath("$.actualEndAt").value("2026-10-30T10:00:00Z"));
    }

    @Test
    void completeRejectsStartAfterEnd() throws Exception {
        String id = create("{\"title\":\"T\"}");
        mvc.perform(post("/api/v1/tasks/" + id + "/complete").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actualStartAt\":\"2026-10-30T09:59:00Z\",\"actualEndAt\":\"2026-10-30T09:00:00Z\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("ACTUAL_DATES_INCONSISTENT"));
    }

    @Test
    void plannedDatesMustBeOrderedAndAreLockedOnceDone() throws Exception {
        expectStatus("POST", "/api/v1/tasks",
                "{\"title\":\"T\",\"plannedStartAt\":\"2026-10-30T15:00:00Z\",\"plannedEndAt\":\"2026-10-30T12:00:00Z\"}", 422);

        String id = create("{\"title\":\"T\",\"plannedStartAt\":\"2026-10-30T11:00:00Z\",\"plannedEndAt\":\"2026-10-30T12:00:00Z\"}");
        mvc.perform(patch("/api/v1/tasks/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"plannedEndAt\":\"2026-10-30T18:00:00Z\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.plannedEndAt").value("2026-10-30T18:00:00Z"));

        mvc.perform(post("/api/v1/tasks/" + id + "/start")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/tasks/" + id + "/complete")).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/tasks/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"plannedEndAt\":\"2026-10-31T18:00:00Z\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PLANNED_DATES_LOCKED"));
    }

    @Test
    void restoreStartsANewCycleAndKeepsThePreviousExecution() throws Exception {
        String id = create("""
                {"title":"Cyclique","plannedStartAt":"2026-10-30T09:00:00Z","plannedEndAt":"2026-10-30T11:00:00Z"}""");
        mvc.perform(post("/api/v1/tasks/" + id + "/start"));
        clock.advance(Duration.ofHours(1));
        mvc.perform(post("/api/v1/tasks/" + id + "/complete")).andExpect(status().isOk());

        clock.advance(Duration.ofDays(1));
        mvc.perform(post("/api/v1/tasks/" + id + "/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.executionNumber").value(2))
                .andExpect(jsonPath("$.actualStartAt").doesNotExist())
                .andExpect(jsonPath("$.actualEndAt").doesNotExist())
                .andExpect(jsonPath("$.archivedAt").doesNotExist());
        mvc.perform(get("/api/v1/tasks/archives")).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/eisenhower/matrix")).andExpect(jsonPath("$.total").value(1));

        mvc.perform(post("/api/v1/tasks/" + id + "/start"));
        clock.advance(Duration.ofHours(2));
        mvc.perform(post("/api/v1/tasks/" + id + "/complete")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/tasks/" + id + "/executions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].executionNumber").value(1))
                .andExpect(jsonPath("$[0].timing.actualElapsedSeconds").value(3600))
                .andExpect(jsonPath("$[1].executionNumber").value(2))
                .andExpect(jsonPath("$[1].timing.actualElapsedSeconds").value(7200));
    }

    @Test
    void restoringAnActiveTaskIsRejected() throws Exception {
        String id = create("{\"title\":\"T\"}");
        mvc.perform(post("/api/v1/tasks/" + id + "/restore"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TASK_NOT_DONE"));
    }

    @Test
    void timelineMarksFutureEventsAsNotYetOccurred() throws Exception {
        String id = create("""
                {"title":"T","plannedStartAt":"2026-10-30T09:00:00Z","plannedEndAt":"2026-10-31T09:00:00Z"}""");
        mvc.perform(get("/api/v1/tasks/" + id + "/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type=='PLANNED_START')].occurred").value(true))
                .andExpect(jsonPath("$[?(@.type=='PLANNED_END')].occurred").value(false))
                .andExpect(jsonPath("$[?(@.type=='ACTUAL_START')].occurred").value(false));
    }
}
