package com.focusflow.folderdeletion;

import static org.assertj.core.api.Assertions.assertThat;
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

/**
 * Lot 27 : un projet dans plusieurs dossiers, et suppression de dossiers avec le sort de leurs projets.
 * Situation : dossier A {X, Y}, dossier B {Y, Z} ; taches « tX » (X), « tY » (Y), « tXZ » (X et Z).
 */
class MultiFolderIT extends IntegrationTest {

    private String a, b, x, y, z;

    private String create(String url, String json) throws Exception {
        String response = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String body(String url) throws Exception {
        return mvc.perform(get(url)).andReturn().getResponse().getContentAsString();
    }

    private void seed() throws Exception {
        a = create("/api/v1/project-folders", "{\"name\":\"A\"}");
        b = create("/api/v1/project-folders", "{\"name\":\"B\"}");
        x = create("/api/v1/projects", "{\"name\":\"X\",\"folderIds\":[\"" + a + "\"]}");
        y = create("/api/v1/projects", "{\"name\":\"Y\",\"folderIds\":[\"" + a + "\",\"" + b + "\"]}");
        z = create("/api/v1/projects", "{\"name\":\"Z\",\"folderIds\":[\"" + b + "\"]}");
        create("/api/v1/tasks", "{\"title\":\"tX\",\"projectId\":\"" + x + "\"}");
        create("/api/v1/tasks", "{\"title\":\"tY\",\"projectId\":\"" + y + "\"}");
        create("/api/v1/tasks", "{\"title\":\"tXZ\",\"projectIds\":[\"" + x + "\",\"" + z + "\"]}");
    }

    private String deletion(List<String> folders, String mode, boolean dryRun) throws Exception {
        String ids = String.join("\",\"", folders);
        return mvc.perform(post("/api/v1/project-folders/deletion").param("dryRun", String.valueOf(dryRun))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"folderIds\":[\"" + ids + "\"],\"mode\":\"" + mode + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private List<String> projectNames() throws Exception {
        return JsonPath.read(body("/api/v1/projects"), "$[*].name");
    }

    private List<String> taskTitles() throws Exception {
        return JsonPath.read(body("/api/v1/tasks?size=50"), "$.items[*].title");
    }

    @Test
    void aProjectBelongsToSeveralFoldersAndCountsInEach() throws Exception {
        seed();
        mvc.perform(get("/api/v1/projects/" + y)).andExpect(jsonPath("$.folderIds.length()").value(2));
        mvc.perform(get("/api/v1/project-folders"))
                .andExpect(jsonPath("$[0].name").value("A")).andExpect(jsonPath("$[0].projectCount").value(2))
                .andExpect(jsonPath("$[1].name").value("B")).andExpect(jsonPath("$[1].projectCount").value(2));
        // Ancienne forme : un seul dossier remplace la liste ; null retire de tous les dossiers.
        mvc.perform(patch("/api/v1/projects/" + y).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderId\":\"" + b + "\"}")).andExpect(jsonPath("$.folderIds.length()").value(1));
        mvc.perform(patch("/api/v1/projects/" + y).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderIds\":[]}")).andExpect(jsonPath("$.folderIds.length()").value(0));
    }

    @Test
    void keepProjectsUnfilesThoseLeftWithoutFolder() throws Exception {
        seed();
        String preview = deletion(List.of(a), "KEEP_PROJECTS", true);
        assertThat((Integer) JsonPath.read(preview, "$.projectsUnfiled")).isEqualTo(1);
        assertThat((String) JsonPath.read(preview, "$.keptProjects[0].name")).isEqualTo("Y");
        assertThat((List<String>) JsonPath.read(preview, "$.keptProjects[0].otherFolders")).containsExactly("B");
        assertThat((Integer) JsonPath.read(body("/api/v1/project-folders"), "$.length()")).isEqualTo(2);

        deletion(List.of(a), "KEEP_PROJECTS", false);
        assertThat(projectNames()).containsExactly("X", "Y", "Z");
        mvc.perform(get("/api/v1/projects/" + x)).andExpect(jsonPath("$.folderIds.length()").value(0));
        mvc.perform(get("/api/v1/projects/" + y)).andExpect(jsonPath("$.folderIds[0]").value(b))
                .andExpect(jsonPath("$.folderIds.length()").value(1));
        assertThat(taskTitles()).hasSize(3);
    }

    @Test
    void deleteProjectsKeepsProjectsOfAnotherFolderAndTheTasks() throws Exception {
        seed();
        String report = deletion(List.of(a), "DELETE_PROJECTS", false);
        assertThat((Integer) JsonPath.read(report, "$.projectsDeleted")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.tasksKept")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(report, "$.tasksDeleted")).isZero();
        // Y fait aussi partie de B : il n'est pas supprime.
        assertThat(projectNames()).containsExactly("Y", "Z");
        assertThat(taskTitles()).containsExactlyInAnyOrder("tX", "tY", "tXZ");
        mvc.perform(get("/api/v1/tasks").param("q", "tXZ"))
                .andExpect(jsonPath("$.items[0].project.name").value("Z"))
                .andExpect(jsonPath("$.items[0].projects.length()").value(1));
        List<java.util.Map<String, Object>> tx = JsonPath.read(body("/api/v1/tasks?q=tX"), "$.items[?(@.title == 'tX')]");
        assertThat(tx.get(0).get("project")).isNull();
    }

    @Test
    void deleteProjectsAndTasksKeepsTasksSharedWithAKeptProject() throws Exception {
        seed();
        String report = deletion(List.of(a), "DELETE_PROJECTS_AND_TASKS", false);
        assertThat((Integer) JsonPath.read(report, "$.foldersDeleted")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.projectsDeleted")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.tasksDeleted")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.tasksKept")).isEqualTo(1);
        assertThat(projectNames()).containsExactly("Y", "Z");
        // tX (seulement X) est supprimee ; tXZ reste avec Z ; tY n'est pas concernee.
        assertThat(taskTitles()).containsExactlyInAnyOrder("tY", "tXZ");
    }

    @Test
    void deletingEveryFolderWithProjectsAndTasksEmptiesThePage() throws Exception {
        seed();
        String preview = deletion(List.of(a, b), "DELETE_PROJECTS_AND_TASKS", true);
        assertThat((Integer) JsonPath.read(preview, "$.projectsDeleted")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(preview, "$.tasksDeleted")).isEqualTo(3);
        assertThat(projectNames()).hasSize(3);

        deletion(List.of(a, b), "DELETE_PROJECTS_AND_TASKS", false);
        assertThat(projectNames()).isEmpty();
        assertThat(taskTitles()).isEmpty();
        assertThat((Integer) JsonPath.read(body("/api/v1/project-folders"), "$.length()")).isZero();
    }

    /** « Projets sans dossier » est le dossier par defaut (virtuel) : son nom ne peut pas etre pris. */
    @Test
    void theDefaultFolderNameIsReserved() throws Exception {
        mvc.perform(post("/api/v1/project-folders").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" projets SANS dossier \"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FOLDER_NAME_RESERVED"));
        String f = create("/api/v1/project-folders", "{\"name\":\"DMP\"}");
        mvc.perform(patch("/api/v1/project-folders/" + f).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Projets sans dossier\"}"))
                .andExpect(status().isConflict());
        // Un fichier qui contiendrait ce dossier : il est signale, ses projets arrivent sans dossier.
        String file = """
                {"version":7,"folders":[{"id":"00000000-0000-0000-0000-0000000000f1","name":"Projets sans dossier"}],
                 "projects":[{"name":"Libre","archived":false,"folderIds":["00000000-0000-0000-0000-0000000000f1"]}]}""";
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(jsonPath("$.projectsCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(1));
        assertThat((List<Object>) JsonPath.read(body("/api/v1/projects"), "$[?(@.name == 'Libre')].folderIds[*]")).isEmpty();
    }

    @Test
    void emptySelectionIsRejected() throws Exception {
        mvc.perform(post("/api/v1/project-folders/deletion").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"folderIds\":[],\"mode\":\"KEEP_PROJECTS\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("FOLDER_DELETION_EMPTY"));
    }

    @Test
    void backupAndProjectExportKeepEveryFolderOfAProject() throws Exception {
        seed();
        String backup = body("/api/v1/export/backup");
        assertThat((Integer) JsonPath.read(backup, "$.version")).isEqualTo(7);
        resetState();
        mvc.perform(post("/api/v1/import").contentType(MediaType.APPLICATION_JSON).content(backup))
                .andExpect(jsonPath("$.foldersCreated").value(2))
                .andExpect(jsonPath("$.errors.length()").value(0));
        String projects = body("/api/v1/projects");
        assertThat((List<Object>) JsonPath.read(projects, "$[?(@.name == 'Y')].folderIds[*]")).hasSize(2);

        // Export du seul dossier A : le fichier ne contient que A, et Y n'y est range que dans A.
        String folderA = ((List<String>) JsonPath.read(body("/api/v1/project-folders"), "$[?(@.name == 'A')].id")).get(0);
        String file = body("/api/v1/export/projects?folderId=" + folderA);
        assertThat((List<String>) JsonPath.read(file, "$.folders[*].name")).containsExactly("A");
        assertThat((List<String>) JsonPath.read(file, "$.projects[*].name")).containsExactly("X", "Y");
        assertThat((List<Object>) JsonPath.read(file, "$.projects[?(@.name == 'Y')].folderIds[*]")).hasSize(1);
    }
}
