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
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Lot 25 : conflits a l'import de projets (dossier ou projet deja present) et leur traitement. */
class ImportConflictIT extends IntegrationTest {

    private String create(String url, String json) throws Exception {
        String response = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String body(String url) throws Exception {
        return mvc.perform(get(url)).andReturn().getResponse().getContentAsString();
    }

    private String importFile(String file, String mode, boolean dryRun) throws Exception {
        return mvc.perform(post("/api/v1/import").param("conflicts", mode).param("dryRun", String.valueOf(dryRun))
                        .contentType(MediaType.APPLICATION_JSON).content(file))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    /**
     * Fichier : DMP {Appli A (tache « Livrer A »), Appli B}, MES {Ligne 1 (tache « Regler »)}, une tache commune
     * a Appli B et Ligne 1. On vide la base, puis on recree seulement DMP / Appli A, modifie : DMP est en conflit.
     */
    private String exportThenKeepOnlyDmp() throws Exception {
        String dmp = create("/api/v1/project-folders", "{\"name\":\"DMP\",\"color\":\"#0ea5e9\"}");
        String mes = create("/api/v1/project-folders", "{\"name\":\"MES\"}");
        String a = create("/api/v1/projects", "{\"name\":\"Appli A\",\"description\":\"Version du fichier\",\"folderId\":\"" + dmp + "\"}");
        String b = create("/api/v1/projects", "{\"name\":\"Appli B\",\"folderId\":\"" + dmp + "\"}");
        String l1 = create("/api/v1/projects", "{\"name\":\"Ligne 1\",\"folderId\":\"" + mes + "\"}");
        create("/api/v1/tasks", "{\"title\":\"Livrer A\",\"projectId\":\"" + a + "\"}");
        create("/api/v1/tasks", "{\"title\":\"Regler\",\"projectId\":\"" + l1 + "\"}");
        create("/api/v1/tasks", "{\"title\":\"Commune\",\"projectIds\":[\"" + b + "\",\"" + l1 + "\"]}");
        String file = body("/api/v1/export/projects");
        return file;
    }

    @Test
    void conflictsAreDetectedAndSkipImportsOnlyTheOtherFolders() throws Exception {
        String file = exportThenKeepOnlyDmp();
        resetState();
        String dmp = create("/api/v1/project-folders", "{\"name\":\"dmp\",\"color\":\"#ef4444\"}");
        create("/api/v1/projects", "{\"name\":\"APPLI A\",\"description\":\"Version locale\",\"folderId\":\"" + dmp + "\"}");

        String preview = importFile(file, "SKIP", true);
        assertThat((Integer) JsonPath.read(preview, "$.conflicts.length()")).isEqualTo(1);
        assertThat((String) JsonPath.read(preview, "$.conflicts[0].folder")).isEqualTo("DMP");
        assertThat((Boolean) JsonPath.read(preview, "$.conflicts[0].folderExists")).isTrue();
        assertThat((Integer) JsonPath.read(preview, "$.conflicts[0].projectCount")).isEqualTo(2);
        assertThat((String) JsonPath.read(preview, "$.conflicts[0].existingProjects[0].name")).isEqualTo("APPLI A");
        assertThat((String) JsonPath.read(preview, "$.conflicts[0].existingProjects[0].currentFolder")).isEqualTo("dmp");
        assertThat((Integer) JsonPath.read(preview, "$.projectsIgnored")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(preview, "$.projectsCreated")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(body("/api/v1/projects"), "$.length()")).isEqualTo(1);

        String report = importFile(file, "SKIP", false);
        assertThat((String) JsonPath.read(report, "$.conflictMode")).isEqualTo("SKIP");
        assertThat((Integer) JsonPath.read(report, "$.foldersCreated")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.tasksIgnored")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(report, "$.tasksCreated")).isEqualTo(2);
        // DMP et ses projets sont restes tels quels ; MES et Ligne 1 sont importes.
        String projects = body("/api/v1/projects");
        assertThat((List<String>) JsonPath.read(projects, "$[*].name")).containsExactlyInAnyOrder("APPLI A", "Ligne 1");
        assertThat((List<String>) JsonPath.read(projects, "$[?(@.name == 'APPLI A')].description"))
                .containsExactly("Version locale");
        mvc.perform(get("/api/v1/project-folders"))
                .andExpect(jsonPath("$[0].name").value("dmp"))
                .andExpect(jsonPath("$[0].color").value("#ef4444"));
        // La tache commune (Appli B ignore, Ligne 1 importe) est importee avec Ligne 1 seulement.
        mvc.perform(get("/api/v1/tasks").param("q", "Commune"))
                .andExpect(jsonPath("$.items[0].projects.length()").value(1))
                .andExpect(jsonPath("$.items[0].project.name").value("Ligne 1"));
    }

    @Test
    void replaceOverwritesFoldersProjectsAndTasksButKeepsSessionsAndTop3() throws Exception {
        String file = exportThenKeepOnlyDmp();
        String a = ((List<String>) JsonPath.read(body("/api/v1/projects"), "$[?(@.name == 'Appli A')].id")).get(0);
        String task = JsonPath.read(body("/api/v1/tasks?q=Livrer"), "$.items[0].id");
        // Modifications locales apres l'export : elles seront ecrasees par le fichier.
        mvc.perform(patch("/api/v1/projects/" + a).contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"Version locale\",\"color\":\"#ef4444\",\"folderId\":null}"));
        mvc.perform(patch("/api/v1/tasks/" + task).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Livrer A (modifie)\"}")).andExpect(status().isOk());
        String session = JsonPath.read(mvc.perform(post("/api/v1/pomodoro/sessions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"WORK\",\"taskId\":\"" + task + "\"}")).andReturn().getResponse().getContentAsString(), "$.session.id");
        clock.advance(Duration.ofMinutes(25));
        mvc.perform(post("/api/v1/pomodoro/sessions/" + session + "/complete")).andExpect(status().isOk());
        mvc.perform(put("/api/v1/dashboard/top3").contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskIds\":[\"" + task + "\"]}")).andExpect(status().isOk());

        String preview = importFile(file, "REPLACE", true);
        assertThat((Integer) JsonPath.read(preview, "$.conflicts.length()")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(preview, "$.projectsReplaced")).isEqualTo(3);

        String report = importFile(file, "REPLACE", false);
        assertThat((List<String>) JsonPath.read(report, "$.errors")).isEmpty();
        assertThat((Integer) JsonPath.read(report, "$.tasksReplaced")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(report, "$.tasksCreated")).isZero();

        mvc.perform(get("/api/v1/projects/" + a))
                .andExpect(jsonPath("$.description").value("Version du fichier"))
                .andExpect(jsonPath("$.folderId").exists());
        mvc.perform(get("/api/v1/tasks/" + task))
                .andExpect(jsonPath("$.title").value("Livrer A"))
                .andExpect(jsonPath("$.project.name").value("Appli A"))
                .andExpect(jsonPath("$.timeSpentSeconds").value(1500));
        mvc.perform(get("/api/v1/dashboard/top3")).andExpect(jsonPath("$.tasks[0].id").value(task));
        assertThat((Integer) JsonPath.read(body("/api/v1/tasks"), "$.totalItems")).isEqualTo(3);
    }

    @Test
    void withoutConflictsTheModeChangesNothing() throws Exception {
        String file = exportThenKeepOnlyDmp();
        resetState();
        String report = importFile(file, "SKIP", false);
        assertThat((Integer) JsonPath.read(report, "$.conflicts.length()")).isZero();
        assertThat((Integer) JsonPath.read(report, "$.projectsCreated")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(report, "$.tasksCreated")).isEqualTo(3);
    }
}
