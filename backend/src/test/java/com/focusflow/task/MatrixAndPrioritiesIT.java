package com.focusflow.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class MatrixAndPrioritiesIT extends IntegrationTest {

    private String create(String title, String quadrant, String extra) throws Exception {
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"quadrant\":\"" + quadrant + "\"" + extra + "}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.id");
    }

    private List<String> titles(String path, String jsonPath) throws Exception {
        String body = mvc.perform(get(path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, jsonPath);
    }

    @Test
    void movingToAQuadrantUpdatesImportanceAndUrgency() throws Exception {
        String id = create("A", "Q4", "");
        mvc.perform(patch("/api/v1/tasks/" + id + "/quadrant").contentType(MediaType.APPLICATION_JSON).content("{\"quadrant\":\"Q1\"}"))
                .andExpect(jsonPath("$.important").value(true))
                .andExpect(jsonPath("$.urgent").value(true));
        mvc.perform(patch("/api/v1/tasks/" + id + "/quadrant").contentType(MediaType.APPLICATION_JSON).content("{\"quadrant\":\"Q3\"}"))
                .andExpect(jsonPath("$.important").value(false))
                .andExpect(jsonPath("$.urgent").value(true));
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[2].tasks[*].title")).containsExactly("A");
    }

    @Test
    void reorderPersistsTheOrderAndSupportsCrossQuadrantDropAndUndo() throws Exception {
        String a = create("A", "Q2", "");
        String b = create("B", "Q2", "");
        String c = create("C", "Q2", "");
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[1].tasks[*].title")).containsExactly("A", "B", "C");

        // Reordonner dans le quadrant.
        mvc.perform(patch("/api/v1/tasks/reorder").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quadrant\":\"Q2\",\"taskIds\":[\"" + c + "\",\"" + a + "\",\"" + b + "\"]}"))
                .andExpect(status().isOk());
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[1].tasks[*].title")).containsExactly("C", "A", "B");

        // Glisser B vers Q1 : B change de quadrant et ses criteres suivent.
        mvc.perform(patch("/api/v1/tasks/reorder").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quadrant\":\"Q1\",\"taskIds\":[\"" + b + "\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].quadrant").value("Q1"));
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[0].tasks[*].title")).containsExactly("B");

        // Annulation : on renvoie l'etat precedent.
        mvc.perform(patch("/api/v1/tasks/reorder").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quadrant\":\"Q2\",\"taskIds\":[\"" + c + "\",\"" + a + "\",\"" + b + "\"]}"))
                .andExpect(status().isOk());
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[1].tasks[*].title")).containsExactly("C", "A", "B");
        assertThat(titles("/api/v1/eisenhower/matrix", "$.quadrants[0].tasks[*].title")).isEmpty();
    }

    @Test
    void matrixCountsAndOverdueFlagsPerQuadrant() throws Exception {
        create("En retard", "Q1", ",\"plannedEndAt\":\"2026-10-29T10:00:00Z\"");
        create("Dans le futur", "Q1", ",\"plannedEndAt\":\"2026-11-10T10:00:00Z\"");
        create("Sans date", "Q4", "");
        mvc.perform(get("/api/v1/eisenhower/matrix"))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.quadrants[0].count").value(2))
                .andExpect(jsonPath("$.quadrants[0].overdueCount").value(1))
                .andExpect(jsonPath("$.quadrants[3].count").value(1));
    }

    @Test
    void matrixFiltersByQueryAndStatus() throws Exception {
        create("Rapport trimestriel", "Q2", "");
        String other = create("Courses", "Q4", "");
        mvc.perform(post("/api/v1/tasks/" + other + "/start"));
        mvc.perform(get("/api/v1/eisenhower/matrix").param("q", "rapport")).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/eisenhower/matrix").param("status", "IN_PROGRESS")).andExpect(jsonPath("$.total").value(1));
        // Les caracteres speciaux LIKE sont traites litteralement.
        mvc.perform(get("/api/v1/eisenhower/matrix").param("q", "%")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void prioritiesFollowQuadrantThenOverdueThenDueDateThenManualOrder() throws Exception {
        create("Q4 simple", "Q4", "");
        create("Q3 simple", "Q3", "");
        create("Q2 echeance lointaine", "Q2", ",\"plannedEndAt\":\"2026-11-20T10:00:00Z\"");
        create("Q2 echeance proche", "Q2", ",\"plannedEndAt\":\"2026-11-02T10:00:00Z\"");
        create("Q2 en retard", "Q2", ",\"plannedEndAt\":\"2026-10-20T10:00:00Z\"");
        create("Q1 sans date", "Q1", "");

        assertThat(titles("/api/v1/tasks/priorities", "$[*].title")).containsExactly(
                "Q1 sans date", "Q2 en retard", "Q2 echeance proche", "Q2 echeance lointaine", "Q3 simple", "Q4 simple");
    }

    @Test
    void inProgressComesFirstAmongSameDueDateAndOverdueNeverMovesQuadrant() throws Exception {
        create("A", "Q2", ",\"plannedEndAt\":\"2026-10-01T10:00:00Z\"");
        String b = create("B", "Q2", ",\"plannedEndAt\":\"2026-10-01T10:00:00Z\"");
        mvc.perform(post("/api/v1/tasks/" + b + "/start"));

        assertThat(titles("/api/v1/tasks/priorities", "$[*].title")).containsExactly("B", "A");
        // Le retard n'a jamais deplace la tache hors de son quadrant.
        mvc.perform(get("/api/v1/tasks/" + b)).andExpect(jsonPath("$.quadrant").value("Q2")).andExpect(jsonPath("$.overdue").value(true));
    }

    @Test
    void finishedTasksLeaveActiveViewsAndAppearInDoneMode() throws Exception {
        String a = create("A", "Q1", "");
        create("B", "Q1", "");
        mvc.perform(post("/api/v1/tasks/" + a + "/complete").contentType(MediaType.APPLICATION_JSON)
                .content("{\"actualStartAt\":\"2026-10-30T09:00:00Z\"}")).andExpect(status().isOk());

        assertThat(titles("/api/v1/tasks/priorities", "$[*].title")).containsExactly("B");
        assertThat(titles("/api/v1/tasks/priorities?mode=DONE", "$[*].title")).containsExactly("A");
        assertThat(titles("/api/v1/tasks/priorities?mode=ALL", "$[*].title")).containsExactly("B");
    }

    @Test
    void todayAndWeekAndOverdueModes() throws Exception {
        create("Aujourd'hui", "Q2", ",\"plannedEndAt\":\"2026-10-30T16:00:00Z\"");
        create("Cette semaine", "Q2", ",\"plannedEndAt\":\"2026-11-01T10:00:00Z\"");
        create("Le mois prochain", "Q2", ",\"plannedEndAt\":\"2026-12-01T10:00:00Z\"");
        create("Passe", "Q2", ",\"plannedEndAt\":\"2026-10-10T10:00:00Z\"");

        assertThat(titles("/api/v1/tasks/priorities?mode=TODAY", "$[*].title")).containsExactly("Aujourd'hui");
        assertThat(titles("/api/v1/tasks/priorities?mode=WEEK", "$[*].title")).containsExactly("Aujourd'hui", "Cette semaine");
        assertThat(titles("/api/v1/tasks/priorities?mode=OVERDUE", "$[*].title")).containsExactly("Passe");
    }

    @Test
    void subtasksTrackProgressWithoutChangingTheParentStatusByDefault() throws Exception {
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Parent\",\"subtasks\":[\"un\",\"deux\"]}")).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(res, "$.id");
        String s1 = JsonPath.read(res, "$.subtasks[0].id");
        String s2 = JsonPath.read(res, "$.subtasks[1].id");

        mvc.perform(patch("/api/v1/tasks/" + id + "/subtasks/" + s1).contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"));
        mvc.perform(patch("/api/v1/tasks/" + id + "/subtasks/" + s2).contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"))
                .andExpect(jsonPath("$.subtasksDone").value(2))
                .andExpect(jsonPath("$.subtasksTotal").value(2))
                .andExpect(jsonPath("$.status").value("TODO"));
    }

    @Test
    void optionalSettingLetsSubtasksDriveTheParentStatus() throws Exception {
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content("{\"subtasksCompleteParent\":true}"));
        String res = mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Parent\",\"subtasks\":[\"un\",\"deux\"]}")).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(res, "$.id");
        String s1 = JsonPath.read(res, "$.subtasks[0].id");
        String s2 = JsonPath.read(res, "$.subtasks[1].id");

        mvc.perform(patch("/api/v1/tasks/" + id + "/subtasks/" + s1).contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mvc.perform(patch("/api/v1/tasks/" + id + "/subtasks/" + s2).contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"))
                .andExpect(jsonPath("$.status").value("DONE"))
                .andExpect(jsonPath("$.archivedAt").exists());
    }

    @Test
    void validationErrorsUseProblemDetailWithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void unknownTaskIsAProblemDetail404() throws Exception {
        mvc.perform(get("/api/v1/tasks/" + java.util.UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
