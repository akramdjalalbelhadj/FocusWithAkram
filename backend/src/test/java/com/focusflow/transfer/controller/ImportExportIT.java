package com.focusflow.transfer.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
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
                .andExpect(jsonPath("$.code").value("IMPORT_UNSUPPORTED_VERSION"));
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
