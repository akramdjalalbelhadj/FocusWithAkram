package com.focusflow.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Module Notes & idees : saisie, organisation, transformation en taches de la matrice, suppression, sauvegarde. */
class NoteIT extends IntegrationTest {

    private static final String IDEA = """
            Je souhaite ajouter un tableau de bord permettant de suivre ma progression hebdomadaire.

            ## Pistes
            - [ ] Visualiser les **taches realisees**.
            - [x] Afficher les objectifs atteints.
            - Etudier les [graphiques](https://example.org) interactifs.
            """;

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, String json)
            throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String quote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    private String body(ResultActions actions) throws Exception {
        return actions.andReturn().getResponse().getContentAsString();
    }

    private String createNote(String json) throws Exception {
        return JsonPath.read(body(send(post("/api/v1/notes"), json).andExpect(status().isCreated())), "$.id");
    }

    private String createCategory(String name) throws Exception {
        return JsonPath.read(body(send(post("/api/v1/note-categories"), "{\"name\":\"" + name + "\"}")
                .andExpect(status().isCreated())), "$.id");
    }

    private ResultActions taskFromNote(String noteId, String taskJson, boolean allowDuplicate) throws Exception {
        return send(post("/api/v1/notes/" + noteId + "/tasks"),
                "{\"task\":" + taskJson + ",\"allowDuplicate\":" + allowDuplicate + "}");
    }

    @Test
    void anIdeaIsCapturedWithATitleOnlyThenOrganisedAndFound() throws Exception {
        String technique = createCategory("Technique");
        String quick = createNote("{\"title\":\"  Idee rapide  \"}");
        mvc.perform(get("/api/v1/notes/" + quick))
                .andExpect(jsonPath("$.title").value("Idee rapide"))
                .andExpect(jsonPath("$.content").value(""))
                .andExpect(jsonPath("$.favorite").value(false))
                .andExpect(jsonPath("$.category").doesNotExist())
                .andExpect(jsonPath("$.tasks.length()").value(0));

        clock.advance(Duration.ofMinutes(1));
        String dashboard = createNote("""
                {"title":"Tableau de bord hebdomadaire","content":%s,"categoryId":"%s",
                 "tags":["Produit"," produit ","stats"],"favorite":true}""".formatted(quote(IDEA), technique));
        mvc.perform(get("/api/v1/notes/" + dashboard))
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.category.name").value("Technique"));

        // Recherche dans le contenu, extrait sans syntaxe Markdown.
        mvc.perform(get("/api/v1/notes").param("q", "OBJECTIFS atteints"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(dashboard))
                .andExpect(jsonPath("$.items[0].excerpt").value(
                        "Je souhaite ajouter un tableau de bord permettant de suivre ma progression hebdomadaire. Pistes "
                                + "Visualiser les taches realisees. Afficher les objectifs atteints. Etudier les graphiques interactifs."));
        mvc.perform(get("/api/v1/notes").param("categoryId", technique)).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/notes").param("tag", "PRODUIT")).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/notes").param("favorite", "true")).andExpect(jsonPath("$.items[0].id").value(dashboard));
        mvc.perform(get("/api/v1/notes").param("q", "100%")).andExpect(jsonPath("$.totalItems").value(0));

        // Tri : derniere modification d'abord par defaut, titre sans tenir compte de la casse sur demande.
        mvc.perform(get("/api/v1/notes")).andExpect(jsonPath("$.items[0].id").value(dashboard));
        mvc.perform(get("/api/v1/notes").param("sort", "title").param("dir", "asc"))
                .andExpect(jsonPath("$.items[0].id").value(quick));
        mvc.perform(get("/api/v1/notes/tags")).andExpect(jsonPath("$[0]").value("Produit"))
                .andExpect(jsonPath("$[1]").value("stats"));
    }

    @Test
    void editingIsPartialAndOnlyContentChangesTheModificationDate() throws Exception {
        String id = createNote("{\"title\":\"Idee\",\"content\":\"Premier jet\"}");
        String created = JsonPath.read(body(mvc.perform(get("/api/v1/notes/" + id))), "$.updatedAt");

        clock.advance(Duration.ofMinutes(5));
        send(patch("/api/v1/notes/" + id), "{\"favorite\":true}")
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.updatedAt").value(created));
        send(patch("/api/v1/notes/" + id), "{\"content\":\"- [ ] Second jet\"}")
                .andExpect(jsonPath("$.title").value("Idee"))
                .andExpect(jsonPath("$.content").value("- [ ] Second jet"))
                .andExpect(jsonPath("$.updatedAt").value(START.plus(Duration.ofMinutes(5)).toString()));

        send(patch("/api/v1/notes/" + id), "{\"title\":\"   \"}").andExpect(status().isBadRequest());
        send(patch("/api/v1/notes/" + id), "{\"content\":\"" + "x".repeat(100_001) + "\"}")
                .andExpect(status().isBadRequest());
        send(patch("/api/v1/notes/" + id), "{\"tags\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\",\"h\",\"i\",\"j\",\"k\"]}")
                .andExpect(status().isBadRequest());
        send(post("/api/v1/notes"), "{\"title\":\"\"}").andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/notes/" + id)).andExpect(jsonPath("$.content").value("- [ ] Second jet"));
    }

    @Test
    void anIdeaBecomesSeveralTasksInTheirQuadrantsAndKeepsTheLink() throws Exception {
        String note = createNote("{\"title\":\"Tableau de bord\",\"content\":\"Pistes\"}");
        String noteBefore = body(mvc.perform(get("/api/v1/notes/" + note)));

        String t1 = JsonPath.read(body(taskFromNote(note, """
                {"title":"Etudier les indicateurs","quadrant":"Q1","plannedEndAt":"2026-11-02T18:00:00Z","tags":["produit"]}""",
                false).andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceNoteId").value(note))
                .andExpect(jsonPath("$.quadrant").value("Q1"))
                .andExpect(jsonPath("$.plannedEndAt").value("2026-11-02T18:00:00Z"))), "$.id");
        clock.advance(Duration.ofMinutes(1));
        taskFromNote(note, "{\"title\":\"Concevoir l'interface\"}", false)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.quadrant").value("Q2"));
        clock.advance(Duration.ofMinutes(1));
        taskFromNote(note, "{\"title\":\"Implementer les graphiques\",\"quadrant\":\"Q3\"}", false)
                .andExpect(status().isCreated());

        // Les taches rejoignent la matrice existante.
        mvc.perform(get("/api/v1/eisenhower/matrix"))
                .andExpect(jsonPath("$.quadrants[0].tasks[0].title").value("Etudier les indicateurs"))
                .andExpect(jsonPath("$.quadrants[1].tasks[0].title").value("Concevoir l'interface"))
                .andExpect(jsonPath("$.quadrants[2].tasks[0].title").value("Implementer les graphiques"));
        mvc.perform(get("/api/v1/tasks/" + t1)).andExpect(jsonPath("$.sourceNoteId").value(note));

        // Terminer une tache ne change pas l'idee, qui n'a pas de statut ; son avancement est calcule.
        mvc.perform(post("/api/v1/tasks/" + t1 + "/start")).andExpect(status().isOk());
        clock.advance(Duration.ofMinutes(30));
        mvc.perform(post("/api/v1/tasks/" + t1 + "/complete")).andExpect(status().isOk());
        String after = body(mvc.perform(get("/api/v1/notes/" + note))
                .andExpect(jsonPath("$.tasks.length()").value(3))
                .andExpect(jsonPath("$.tasks[0].status").value("DONE"))
                .andExpect(jsonPath("$.tasks[0].archivedAt").exists()));
        assertThat((String) JsonPath.read(after, "$.updatedAt")).isEqualTo(JsonPath.read(noteBefore, "$.updatedAt"));
        assertThat((Integer) JsonPath.read(after, "$.version")).isEqualTo(JsonPath.read(noteBefore, "$.version"));
        mvc.perform(get("/api/v1/notes"))
                .andExpect(jsonPath("$.items[0].taskCount").value(3))
                .andExpect(jsonPath("$.items[0].tasksDone").value(1));

        // Le lien survit a la restauration et a la duplication.
        mvc.perform(post("/api/v1/tasks/" + t1 + "/restore")).andExpect(jsonPath("$.sourceNoteId").value(note));
        mvc.perform(post("/api/v1/tasks/" + t1 + "/duplicate")).andExpect(jsonPath("$.sourceNoteId").value(note));

        String other = createNote("{\"title\":\"Encore une idee\"}");
        mvc.perform(get("/api/v1/notes").param("withTasks", "true"))
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(note));
        mvc.perform(get("/api/v1/notes").param("withTasks", "false"))
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(other));
    }

    @Test
    void aDuplicateTaskFromTheSameIdeaNeedsAnExplicitConfirmation() throws Exception {
        String note = createNote("{\"title\":\"Idee\"}");
        String other = createNote("{\"title\":\"Autre idee\"}");
        taskFromNote(note, "{\"title\":\"Etudier\"}", false).andExpect(status().isCreated());

        taskFromNote(note, "{\"title\":\"  ETUDIER \"}", false)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOTE_TASK_DUPLICATE"));
        // Meme titre depuis une autre idee, ou tache ordinaire : aucun doublon signale.
        taskFromNote(other, "{\"title\":\"Etudier\"}", false).andExpect(status().isCreated());
        send(post("/api/v1/tasks"), "{\"title\":\"Etudier\"}").andExpect(status().isCreated());

        taskFromNote(note, "{\"title\":\"Etudier\"}", true).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/notes/" + note)).andExpect(jsonPath("$.tasks.length()").value(2));
    }

    @Test
    void aTaskFromAnIdeaFollowsTheUsualTaskRules() throws Exception {
        String note = createNote("{\"title\":\"Idee\"}");
        taskFromNote(note, """
                {"title":"Dates incoherentes","plannedStartAt":"2026-11-02T10:00:00Z","plannedEndAt":"2026-11-02T09:00:00Z"}""",
                false).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PLANNED_DATES_INCONSISTENT"));
        taskFromNote(note, "{\"title\":\"\"}", false).andExpect(status().isBadRequest());
        send(post("/api/v1/notes/" + note + "/tasks"), "{}").andExpect(status().isBadRequest());
        taskFromNote("00000000-0000-0000-0000-000000000000", "{\"title\":\"X\"}", false).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/notes/" + note)).andExpect(jsonPath("$.tasks.length()").value(0));
        mvc.perform(get("/api/v1/tasks")).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void deletingAnIdeaWithTasksIsRefusedUnlessForcedAndTheTasksAreKept() throws Exception {
        String note = createNote("{\"title\":\"Idee\"}");
        String task = JsonPath.read(body(taskFromNote(note, "{\"title\":\"Faire\",\"quadrant\":\"Q1\"}", false)), "$.id");

        mvc.perform(delete("/api/v1/notes/" + note))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOTE_HAS_TASKS"))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("une tache")));
        mvc.perform(get("/api/v1/notes/" + note)).andExpect(status().isOk());

        mvc.perform(delete("/api/v1/notes/" + note).param("force", "true")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notes/" + note)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/tasks/" + task))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceNoteId").doesNotExist())
                .andExpect(jsonPath("$.quadrant").value("Q1"));

        // Sans tache (ou apres suppression de ses taches), la suppression simple suffit.
        String second = createNote("{\"title\":\"Seconde\"}");
        String t2 = JsonPath.read(body(taskFromNote(second, "{\"title\":\"T\"}", false)), "$.id");
        mvc.perform(delete("/api/v1/tasks/" + t2)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/notes/" + second)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/notes/" + second)).andExpect(status().isNotFound());
    }

    @Test
    void categoriesAreManagedAndTheirDeletionKeepsTheIdeas() throws Exception {
        String perso = createCategory("Personnel");
        send(post("/api/v1/note-categories"), "{\"name\":\" personnel \"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOTE_CATEGORY_NAME_TAKEN"));
        send(post("/api/v1/note-categories"), "{\"name\":\"Pro\",\"color\":\"rouge\"}").andExpect(status().isBadRequest());
        String pro = createCategory("Pro");
        send(patch("/api/v1/note-categories/" + pro), "{\"name\":\"PERSONNEL\"}").andExpect(status().isConflict());
        send(patch("/api/v1/note-categories/" + pro), "{\"name\":\"Professionnel\",\"color\":\"#22c55e\"}")
                .andExpect(jsonPath("$.name").value("Professionnel"))
                .andExpect(jsonPath("$.color").value("#22c55e"));
        // Changer seulement la casse de son propre nom est permis.
        send(patch("/api/v1/note-categories/" + perso), "{\"name\":\"personnel\"}").andExpect(status().isOk());

        String note = createNote("{\"title\":\"Idee\",\"categoryId\":\"" + pro + "\"}");
        mvc.perform(get("/api/v1/note-categories"))
                .andExpect(jsonPath("$[0].name").value("personnel"))
                .andExpect(jsonPath("$[0].noteCount").value(0))
                .andExpect(jsonPath("$[1].noteCount").value(1));

        mvc.perform(delete("/api/v1/note-categories/" + pro)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notes/" + note))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").doesNotExist());
        send(patch("/api/v1/notes/" + note), "{\"categoryId\":\"" + pro + "\"}").andExpect(status().isNotFound());
    }

    @Test
    void theEditorModeIsAValidatedSetting() throws Exception {
        mvc.perform(get("/api/v1/settings")).andExpect(jsonPath("$.noteEditorMode").value("MARKDOWN"));
        send(patch("/api/v1/settings"), "{\"noteEditorMode\":\"RICH\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.noteEditorMode").value("RICH"));
        send(patch("/api/v1/settings"), "{\"noteEditorMode\":\"WORD\"}").andExpect(status().isBadRequest());
    }

    @Test
    void ideasCategoriesTaskLinksAndEditorModeSurviveABackupRoundTrip() throws Exception {
        String category = createCategory("Technique");
        String note = createNote("{\"title\":\"Idee\",\"content\":\"## Pistes\\n- [ ] A\",\"categoryId\":\"" + category
                + "\",\"tags\":[\"x\"],\"favorite\":true}");
        taskFromNote(note, "{\"title\":\"Tache issue\"}", false).andExpect(status().isCreated());
        send(patch("/api/v1/settings"), "{\"noteEditorMode\":\"RICH\"}").andExpect(status().isOk());

        String backup = body(mvc.perform(get("/api/v1/export/backup")).andExpect(status().isOk()));
        assertThat((Integer) JsonPath.read(backup, "$.version")).isEqualTo(5);
        assertThat((String) JsonPath.read(backup, "$.tasks[0].sourceNoteId")).isEqualTo(note);
        assertThat((List<?>) JsonPath.read(backup, "$.notes.notes")).hasSize(1);

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes.categoriesCreated").value(1))
                .andExpect(jsonPath("$.notes.notesCreated").value(1))
                .andExpect(jsonPath("$.tasksCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(0));
        mvc.perform(get("/api/v1/notes/" + note))
                .andExpect(jsonPath("$.content").value("## Pistes\n- [ ] A"))
                .andExpect(jsonPath("$.category.name").value("Technique"))
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.tasks[0].title").value("Tache issue"));
        mvc.perform(get("/api/v1/settings")).andExpect(jsonPath("$.noteEditorMode").value("RICH"));

        // Reimport : rien n'est duplique.
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.notes.notesCreated").value(0))
                .andExpect(jsonPath("$.notes.notesSkipped").value(1))
                .andExpect(jsonPath("$.notes.categoriesReused").value(1))
                .andExpect(jsonPath("$.errors.length()").value(0));
        mvc.perform(get("/api/v1/notes")).andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void anOlderBackupWithoutNotesIsStillImported() throws Exception {
        String v3 = """
                {"version":3,"projects":[],"sessions":[],"tasks":[
                  {"title":"Ancienne","status":"TODO","important":true,"urgent":false,"position":0,
                   "createdAt":"2026-10-01T08:00:00Z","executionNumber":1}]}""";
        send(post("/api/v1/import"), v3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasksCreated").value(1))
                .andExpect(jsonPath("$.notes").doesNotExist());
    }
}
