package com.focusflow.transfer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.hamcrest.Matchers;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ImportExportIT extends IntegrationTest {

    private String seed() throws Exception {
        String project = JsonPath.read(mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Projet\"}")).andReturn().getResponse().getContentAsString(), "$.id");
        String done = JsonPath.read(mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Terminee, avec virgule\",\"projectId\":\"" + project
                        + "\",\"tags\":[\"urgent\"],\"subtasks\":[\"a\"],\"plannedEndAt\":\"2026-10-30T12:00:00Z\"}"))
                .andReturn().getResponse().getContentAsString(), "$.id");
        String session = JsonPath.read(mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"WORK\",\"taskId\":\"" + done + "\"}")).andReturn().getResponse().getContentAsString(), "$.session.id");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + session + "/complete"));
        mvc.perform(post("/api/v1/tasks/" + done + "/complete"));
        mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Active\",\"quadrant\":\"Q1\"}"));
        return done;
    }

    @Test
    void backupRoundTripRestoresTasksHistoryAndSessions() throws Exception {
        seed();
        String backup = mvc.perform(get("/api/v1/export/backup")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(backup, "$.tasks.length()")).isEqualTo(2);

        resetState();
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.totalItems").value(0));

        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasksCreated").value(2))
                .andExpect(jsonPath("$.projectsCreated").value(1))
                .andExpect(jsonPath("$.sessionsCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(0));

        mvc.perform(get("/api/v1/tasks/archives"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].task.title").value("Terminee, avec virgule"))
                .andExpect(jsonPath("$.items[0].task.timeSpentSeconds").value(25 * 60))
                .andExpect(jsonPath("$.items[0].task.tags[0]").value("urgent"))
                .andExpect(jsonPath("$.items[0].task.project.name").value("Projet"));
        mvc.perform(get("/api/v1/eisenhower/matrix")).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void reimportingTheSameFileCreatesNoDuplicates() throws Exception {
        seed();
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse().getContentAsString();

        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(jsonPath("$.tasksCreated").value(0))
                .andExpect(jsonPath("$.tasksSkipped").value(2))
                .andExpect(jsonPath("$.projectsReused").value(1))
                .andExpect(jsonPath("$.sessionsCreated").value(0));
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/projects")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void dryRunValidatesWithoutWriting() throws Exception {
        seed();
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse().getContentAsString();
        resetState();

        mvc.perform(post("/api/v1/import").param("dryRun", "true").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(jsonPath("$.tasksCreated").value(2));
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/projects")).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void invalidTasksAreReportedAndDoNotBlockTheOthers() throws Exception {
        String file = """
                {"version":1,"projects":[],"sessions":[],"tasks":[
                 {"title":"Terminee sans fin","status":"DONE","important":true,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","actualStartAt":"2026-10-02T10:00:00Z","executionNumber":1},
                 {"title":"Valide","status":"TODO","important":false,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":1},
                 {"title":"En cours sans debut","status":"IN_PROGRESS","important":false,"urgent":false,"position":1,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":1}]}""";
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.tasksCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(2));
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.items[0].title").value("Valide"));
    }

    @Test
    void unsupportedVersionIsRejected() throws Exception {
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content("{\"version\":99}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("IMPORT_UNSUPPORTED_VERSION"))
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("plus recente")));
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("IMPORT_UNSUPPORTED_VERSION"));
    }

    @Test
    void backupRestoresSettingsAndTop3() throws Exception {
        seed();
        String active = JsonPath.read(mvc.perform(get("/api/v1/tasks")).andReturn().getResponse().getContentAsString(),
                "$.items[0].id");
        mvc.perform(put("/api/v1/dashboard/top3").contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskIds\":[\"" + active + "\"]}")).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"theme\":\"DARK\",\"workMinutes\":50}")).andExpect(status().isOk());
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(backup, "$.version")).isEqualTo(3);

        resetState();
        mvc.perform(get("/api/v1/settings")).andExpect(jsonPath("$.theme").value("SYSTEM"));

        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settingsRestored").value(true))
                .andExpect(jsonPath("$.dailyGoalsCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(0));
        mvc.perform(get("/api/v1/settings"))
                .andExpect(jsonPath("$.theme").value("DARK"))
                .andExpect(jsonPath("$.workMinutes").value(50));
        mvc.perform(get("/api/v1/dashboard/top3")).andExpect(jsonPath("$.tasks[0].id").value(active));

        // Reimport : le Top 3 existe deja, rien n'est duplique.
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(jsonPath("$.dailyGoalsCreated").value(0))
                .andExpect(jsonPath("$.dailyGoalsSkipped").value(1));
    }

    @Test
    void dryRunDoesNotChangeSettings() throws Exception {
        String file = """
                {"version":2,"settings":{"theme":"DARK","workMinutes":40}}""";
        mvc.perform(post("/api/v1/import").param("dryRun", "true").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.settingsRestored").value(true));
        mvc.perform(get("/api/v1/settings"))
                .andExpect(jsonPath("$.theme").value("SYSTEM"))
                .andExpect(jsonPath("$.workMinutes").value(25));
    }

    @Test
    void invalidSettingsAreReportedWithoutPartialRestore() throws Exception {
        String file = """
                {"version":2,"settings":{"theme":"DARK","workMinutes":999}}""";
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settingsRestored").value(false))
                .andExpect(jsonPath("$.errors.length()").value(1));
        mvc.perform(get("/api/v1/settings")).andExpect(jsonPath("$.theme").value("SYSTEM"));
    }

    /** Regression : un cycle ou une sous-tache invalide faisait echouer tout l'import au lieu d'etre signale. */
    @Test
    void invalidCyclesAndSubtasksAreReportedPerTaskWithoutAbortingTheImport() throws Exception {
        String file = """
                {"version":1,"tasks":[
                 {"title":"Cycle sans fin","status":"TODO","important":false,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":2,
                  "executions":[{"executionNumber":1,"actualStartAt":"2026-10-02T10:00:00Z","archivedAt":"2026-10-02T11:00:00Z"}]},
                 {"title":"Cycles en double","status":"TODO","important":false,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":3,
                  "executions":[
                   {"executionNumber":1,"actualStartAt":"2026-10-02T10:00:00Z","actualEndAt":"2026-10-02T11:00:00Z","archivedAt":"2026-10-02T11:00:00Z"},
                   {"executionNumber":1,"actualStartAt":"2026-10-03T10:00:00Z","actualEndAt":"2026-10-03T11:00:00Z","archivedAt":"2026-10-03T11:00:00Z"}]},
                 {"title":"Sous-tache trop longue","status":"TODO","important":false,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":1,
                  "subtasks":[{"title":"%s","done":false,"position":0}]},
                 {"title":"Valide","status":"TODO","important":false,"urgent":false,"position":0,
                  "createdAt":"2026-10-01T10:00:00Z","executionNumber":1}],
                 "projects":[{"name":"%s","archived":false}]}""".formatted("x".repeat(250), "p".repeat(130));
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasksCreated").value(1))
                .andExpect(jsonPath("$.projectsCreated").value(0))
                .andExpect(jsonPath("$.errors.length()").value(4));
        mvc.perform(get("/api/v1/tasks"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Valide"));
    }

    /** Une session dont la tache existe deja avec le meme identifiant est rattachee ; une simple ressemblance ne suffit pas. */
    @Test
    void sessionsAttachToExistingTaskOnlyWhenIdentifiersMatch() throws Exception {
        String body = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Existante\"}")).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        String createdAt = JsonPath.read(body, "$.createdAt");
        String file = """
                {"version":2,"tasks":[
                  {"id":"%1$s","title":"Existante","status":"TODO","important":false,"urgent":false,"position":0,
                   "createdAt":"%2$s","executionNumber":1},
                  {"id":"00000000-0000-0000-0000-000000000099","title":"Existante","status":"TODO","important":false,
                   "urgent":false,"position":0,"createdAt":"%2$s","executionNumber":1}],
                 "sessions":[
                  {"id":"00000000-0000-0000-0000-000000000001","taskId":"%1$s","executionNumber":1,"type":"WORK",
                   "status":"COMPLETED","plannedSeconds":1500,"workedSeconds":1500,"sequenceNumber":1,
                   "startedAt":"2026-10-29T10:00:00Z","endedAt":"2026-10-29T10:25:00Z"},
                  {"id":"00000000-0000-0000-0000-000000000002","taskId":"00000000-0000-0000-0000-000000000099",
                   "executionNumber":1,"type":"WORK","status":"COMPLETED","plannedSeconds":1500,"workedSeconds":1500,
                   "sequenceNumber":1,"startedAt":"2026-10-29T11:00:00Z","endedAt":"2026-10-29T11:25:00Z"}]}"""
                .formatted(id, createdAt);
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.tasksSkipped").value(2))
                .andExpect(jsonPath("$.sessionsCreated").value(1))
                .andExpect(jsonPath("$.sessionsSkipped").value(1));
        mvc.perform(get("/api/v1/tasks/" + id)).andExpect(jsonPath("$.timeSpentSeconds").value(1500));
    }

    @Test
    void csvExportQuotesFieldsAndFiltersByScope() throws Exception {
        seed();
        String csv = mvc.perform(get("/api/v1/export/tasks").param("format", "csv").param("scope", "ARCHIVED"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv).contains("\"Terminee, avec virgule\"").contains("DONE").doesNotContain("Active");
        assertThat(csv.lines().count()).isEqualTo(2);

        mvc.perform(get("/api/v1/export/tasks").param("format", "json").param("scope", "ACTIVE"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Active"));
    }
}
