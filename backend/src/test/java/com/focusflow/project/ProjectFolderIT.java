package com.focusflow.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Lot 23 : dossiers de projets, export de projets choisis et import de cet export. */
class ProjectFolderIT extends IntegrationTest {

    private String create(String url, String json) throws Exception {
        String response = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    @Test
    void foldersGroupProjectsAndTasksStayOnTheirProject() throws Exception {
        String dmp = create("/api/v1/project-folders", "{\"name\":\"DMP\",\"color\":\"#0ea5e9\"}");
        String app = create("/api/v1/projects", "{\"name\":\"Appli A\",\"folderId\":\"" + dmp + "\"}");
        create("/api/v1/projects", "{\"name\":\"Appli B\"}");
        String task = create("/api/v1/tasks", "{\"title\":\"Corriger\",\"projectId\":\"" + app + "\"}");

        mvc.perform(get("/api/v1/project-folders"))
                .andExpect(jsonPath("$[0].name").value("DMP"))
                .andExpect(jsonPath("$[0].projectCount").value(1));
        mvc.perform(get("/api/v1/projects/" + app)).andExpect(jsonPath("$.folderIds[0]").value(dmp));
        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.project.id").value(app));

        // Nom unique sans tenir compte de la casse ; couleur validee.
        mvc.perform(post("/api/v1/project-folders").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"dmp\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FOLDER_NAME_TAKEN"));
        mvc.perform(post("/api/v1/project-folders").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"MES\",\"color\":\"rouge\"}")).andExpect(status().isBadRequest());

        // Renommer, sortir le projet du dossier, puis supprimer le dossier : projet et tache restent.
        mvc.perform(patch("/api/v1/project-folders/" + dmp).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"DMP 2026\"}")).andExpect(jsonPath("$.name").value("DMP 2026"));
        mvc.perform(patch("/api/v1/projects/" + app).contentType(MediaType.APPLICATION_JSON).content("{\"folderId\":null}"))
                .andExpect(jsonPath("$.folderIds.length()").value(0));
        mvc.perform(patch("/api/v1/projects/" + app).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderId\":\"" + dmp + "\"}")).andExpect(jsonPath("$.folderIds[0]").value(dmp));
        mvc.perform(delete("/api/v1/project-folders/" + dmp)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/projects/" + app)).andExpect(jsonPath("$.folderIds.length()").value(0));
        mvc.perform(get("/api/v1/tasks/" + task)).andExpect(jsonPath("$.project.id").value(app));
    }

    @Test
    void unknownFolderIsRejected() throws Exception {
        String app = create("/api/v1/projects", "{\"name\":\"Appli\"}");
        mvc.perform(patch("/api/v1/projects/" + app).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderId\":\"00000000-0000-0000-0000-000000000001\"}")).andExpect(status().isNotFound());
    }

    @Test
    void exportOfAFolderCarriesItsProjectsTasksAndSessionsAndReimportsElsewhere() throws Exception {
        String dmp = create("/api/v1/project-folders", "{\"name\":\"DMP\",\"color\":\"#0ea5e9\"}");
        String mes = create("/api/v1/project-folders", "{\"name\":\"MES\"}");
        String a = create("/api/v1/projects", "{\"name\":\"Appli A\",\"folderId\":\"" + dmp + "\"}");
        String b = create("/api/v1/projects", "{\"name\":\"Appli B\",\"folderId\":\"" + dmp + "\"}");
        String other = create("/api/v1/projects", "{\"name\":\"Ligne 1\",\"folderId\":\"" + mes + "\"}");
        create("/api/v1/tasks", "{\"title\":\"Commune\",\"projectIds\":[\"" + a + "\",\"" + other + "\"]}");
        create("/api/v1/tasks", "{\"title\":\"Seule B\",\"projectId\":\"" + b + "\"}");
        create("/api/v1/tasks", "{\"title\":\"Hors export\",\"projectId\":\"" + other + "\"}");

        String file = mvc.perform(get("/api/v1/export/projects").param("folderId", dmp))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(file, "$.version")).isEqualTo(7);
        assertThat((List<String>) JsonPath.read(file, "$.folders[*].name")).containsExactly("DMP");
        assertThat((List<String>) JsonPath.read(file, "$.projects[*].name")).containsExactly("Appli A", "Appli B");
        assertThat((List<String>) JsonPath.read(file, "$.tasks[*].title")).containsExactlyInAnyOrder("Commune", "Seule B");

        // Sans les taches : seulement dossiers et projets.
        String light = mvc.perform(get("/api/v1/export/projects").param("id", other).param("withTasks", "false"))
                .andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(light, "$.tasks.length()")).isZero();
        assertThat((List<String>) JsonPath.read(light, "$.folders[*].name")).containsExactly("MES");

        // Reimport dans la meme base : rien n'est duplique.
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.foldersReused").value(1))
                .andExpect(jsonPath("$.projectsReused").value(2))
                .andExpect(jsonPath("$.tasksCreated").value(0));

        // Import dans une base vide : dossier recree, taches rattachees a leurs projets (le projet hors export est ignore).
        resetState();
        mvc.perform(post("/api/v1/import").param("dryRun", "true").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.foldersCreated").value(1))
                .andExpect(jsonPath("$.projectsCreated").value(2));
        mvc.perform(get("/api/v1/project-folders")).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.foldersCreated").value(1))
                .andExpect(jsonPath("$.projectsCreated").value(2))
                .andExpect(jsonPath("$.tasksCreated").value(2))
                .andExpect(jsonPath("$.errors.length()").value(0));
        mvc.perform(get("/api/v1/project-folders"))
                .andExpect(jsonPath("$[0].name").value("DMP"))
                .andExpect(jsonPath("$[0].color").value("#0ea5e9"))
                .andExpect(jsonPath("$[0].projectCount").value(2));
        mvc.perform(get("/api/v1/tasks").param("q", "Commune"))
                .andExpect(jsonPath("$.items[0].project.name").value("Appli A"))
                .andExpect(jsonPath("$.items[0].projects.length()").value(1));
    }

    @Test
    void backupKeepsFoldersAndEveryProjectOfATask() throws Exception {
        String dmp = create("/api/v1/project-folders", "{\"name\":\"DMP\"}");
        String a = create("/api/v1/projects", "{\"name\":\"Appli A\",\"folderId\":\"" + dmp + "\"}");
        String b = create("/api/v1/projects", "{\"name\":\"Appli B\"}");
        create("/api/v1/tasks", "{\"title\":\"Double\",\"projectIds\":[\"" + b + "\",\"" + a + "\"]}");
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse().getContentAsString();

        resetState();
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(jsonPath("$.foldersCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(0));
        mvc.perform(get("/api/v1/tasks"))
                .andExpect(jsonPath("$.items[0].project.name").value("Appli B"))
                .andExpect(jsonPath("$.items[0].projects[1].name").value("Appli A"));
        String projects = mvc.perform(get("/api/v1/projects")).andReturn().getResponse().getContentAsString();
        assertThat((List<Object>) JsonPath.read(projects, "$[?(@.name == 'Appli A')].folderIds[0]")).hasSize(1).doesNotContainNull();
        assertThat((List<Object>) JsonPath.read(projects, "$[?(@.name == 'Appli B')].folderIds[0]")).isEmpty();
    }

    @Test
    void reusedProjectWithoutFolderJoinsTheImportedFolder() throws Exception {
        create("/api/v1/projects", "{\"name\":\"Appli A\"}");
        String file = """
                {"version":6,"folders":[{"id":"00000000-0000-0000-0000-0000000000f1","name":"DMP"}],
                 "projects":[{"id":"00000000-0000-0000-0000-0000000000a1","name":"appli a",
                   "folderId":"00000000-0000-0000-0000-0000000000f1","archived":false}]}""";
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.projectsReused").value(1));
        mvc.perform(get("/api/v1/project-folders")).andExpect(jsonPath("$[0].projectCount").value(1));
    }

    @Test
    void emptySelectionExportsNothingAndIsRejected() throws Exception {
        mvc.perform(get("/api/v1/export/projects"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("EXPORT_NO_PROJECT"));
    }
}
