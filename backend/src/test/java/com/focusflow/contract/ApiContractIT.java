package com.focusflow.contract;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Contrats HTTP sensibles a l'extraction des DTO et a la presence des champs PATCH. */
class ApiContractIT extends IntegrationTest {
    private String create(String url, String json) throws Exception {
        String response = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    @Test
    void projectPatchDistinguishesOmittedAndExplicitNullFields() throws Exception {
        String id = create("/api/v1/projects", """
                {"name":"Organisation", "description":"A conserver", "color":"#123456",
                 "dueAt":"2026-11-02T12:00:00Z"}
                """);
        mvc.perform(patch("/api/v1/projects/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":null,\"dueAt\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Organisation"))
                .andExpect(jsonPath("$.color").value("#123456"))
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.dueAt").doesNotExist())
                .andExpect(jsonPath("$.version").doesNotExist());
    }

    @Test
    void taskPatchPreservesPlanningAndCanExplicitlyClearIt() throws Exception {
        String project = create("/api/v1/projects", "{\"name\":\"Organisation\"}");
        String id = create("/api/v1/tasks", """
                {"title":"Tache", "projectId":"%s", "plannedStartAt":"2026-10-30T11:00:00Z",
                 "plannedEndAt":"2026-10-30T12:00:00Z"}
                """.formatted(project));
        mvc.perform(patch("/api/v1/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Tache modifiee\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project.id").value(project))
                .andExpect(jsonPath("$.plannedStartAt").value("2026-10-30T11:00:00Z"))
                .andExpect(jsonPath("$.plannedEndAt").value("2026-10-30T12:00:00Z"));
        mvc.perform(patch("/api/v1/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"projectId\":null,\"plannedStartAt\":null,\"plannedEndAt\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").doesNotExist())
                .andExpect(jsonPath("$.plannedStartAt").doesNotExist())
                .andExpect(jsonPath("$.plannedEndAt").doesNotExist())
                .andExpect(jsonPath("$.title").value("Tache modifiee"));
    }

    @Test
    void settingsPatchOnlyChangesSuppliedFields() throws Exception {
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workMinutes\":37,\"autoStartBreaks\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.shortBreakMinutes").value(5));
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soundName\":\"chime\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workMinutes").value(37))
                .andExpect(jsonPath("$.autoStartBreaks").value(true))
                .andExpect(jsonPath("$.soundName").value("chime"));
    }

    @Test
    void malformedTypedRequestsKeepTheProblemDetailContract() throws Exception {
        mvc.perform(patch("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workMinutes\":\"pas-un-nombre\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void centralizedExceptionsKeepStatusAndBusinessCodes() throws Exception {
        mvc.perform(get("/api/v1/projects/00000000-0000-0000-0000-000000000001"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        create("/api/v1/projects", "{\"name\":\"Unique\"}");
        mvc.perform(post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Unique\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROJECT_NAME_TAKEN"));
    }

    @Test
    void globalSearchStillReturnsTaskAndProjectDtos() throws Exception {
        create("/api/v1/projects", "{\"name\":\"Organisation projet\"}");
        create("/api/v1/tasks", "{\"title\":\"Organisation tache\"}");
        mvc.perform(get("/api/v1/search").param("q", "Organisation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks[0].title").value("Organisation tache"))
                .andExpect(jsonPath("$.projects[0].name").value("Organisation projet"));
    }
}
