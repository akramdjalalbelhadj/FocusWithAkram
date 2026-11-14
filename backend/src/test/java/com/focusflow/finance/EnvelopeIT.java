package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Depenses variables plafonnees (« enveloppes ») : depense du mois, total du mois, depassement, plafond du budget,
 * alerte et sauvegarde. Aujourd'hui = 30/10/2026 (Paris).
 */
class EnvelopeIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    private ResultActions send(MockHttpServletRequestBuilder req, String json) throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private String account() throws Exception {
        return JsonPath.read(body(send(post(API + "/accounts"), """
                {"name":"Compte","type":"CURRENT","openingBalance":1000}""").andExpect(status().isCreated())), "$.id");
    }

    private String category(String name, String parentId) throws Exception {
        send(post(API + "/categories"), """
                {"name":"%s","parentId":%s}""".formatted(name, parentId == null ? "null" : "\"" + parentId + "\""))
                .andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ?", UUID.class, name).toString();
    }

    private String envelope(String categoryId, String amount, String fromMonth) throws Exception {
        return JsonPath.read(body(send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":%s,"fromMonth":"%s"}""".formatted(categoryId, amount, fromMonth))
                .andExpect(status().isCreated())), "$.id");
    }

    private String expense(String account, String categoryId, String amount, String date, String label) throws Exception {
        return JsonPath.read(body(send(post(API + "/operations"), """
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"%s","amount":%s,"label":"%s",
                 "categoryId":"%s"}""".formatted(account, date, amount, label, categoryId))
                .andExpect(status().isCreated())), "$.id");
    }

    private String sheet(String month) throws Exception {
        return body(mvc.perform(get(API + "/months/" + month + "/sheet")).andExpect(status().isOk()));
    }

    private String budget(String month) throws Exception {
        return body(mvc.perform(get(API + "/budget").param("month", month)).andExpect(status().isOk()));
    }

    private static BigDecimal amount(String json, String path) {
        Object v = JsonPath.read(json, path);
        return v == null ? null : new BigDecimal(v.toString());
    }

    private Integer totalOperations() {
        return jdbc.queryForObject("select count(*) from fin_operation where label = 'Courses — total du mois'",
                Integer.class);
    }

    @Test
    void spendingCountsSubcategoriesAndRefundsButNotSchedulesNorGoalPurchases() throws Exception {
        String account = account();
        String courses = category("Courses", null);
        String alimentation = category("Alimentation", courses);
        String hygiene = category("Hygiene", courses);
        String loisirs = category("Loisirs", null);

        String created = body(send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":300,"fromMonth":"2026-10"}""".formatted(courses))
                .andExpect(status().isCreated()));
        String id = JsonPath.read(created, "$.id");
        assertThat((String) JsonPath.read(created, "$.label")).isEqualTo("Courses");
        assertThat((String) JsonPath.read(created, "$.category.id")).isEqualTo(courses);
        assertThat((String) JsonPath.read(created, "$.startMonth")).isEqualTo("2026-10");
        assertThat((Object) JsonPath.read(created, "$.endMonth")).isNull();
        assertThat((List<String>) JsonPath.read(created, "$.amounts[*].fromMonth")).containsExactly("2026-10");
        assertThat(amount(created, "$.currentAmount")).isEqualByComparingTo("300");
        // Une seule enveloppe par categorie.
        send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":100,"fromMonth":"2026-11"}""".formatted(courses))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ENVELOPE_CATEGORY_TAKEN"));
        send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":-1,"fromMonth":"2026-11"}""".formatted(loisirs))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));

        String food = expense(account, alimentation, "100", "2026-10-05", "Marche");
        expense(account, hygiene, "50", "2026-10-06", "Pharmacie");
        expense(account, courses, "30", "2026-10-07", "Epicerie");
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"PURCHASE_REFUND","status":"COMPLETED","date":"2026-10-08","amount":20,
                 "label":"Retour produit","categoryId":"%s","refundOfId":"%s"}""".formatted(account, alimentation, food))
                .andExpect(status().isCreated());
        expense(account, loisirs, "12", "2026-10-09", "Cinema");
        // Une echeance d'echeancier de la categorie reste une depense fixe.
        String basket = JsonPath.read(body(send(post(API + "/schedules"), """
                {"label":"Panier bio","type":"EXPENSE","kind":"SUBSCRIPTION","accountId":"%s","categoryId":"%s",
                 "amount":40,"essential":true,"frequency":"MONTHLY","startDate":"2026-10-02"}""".formatted(account, courses))
                .andExpect(status().isCreated())), "$.id");
        send(post(API + "/schedules/" + basket + "/occurrences/2026-10-02/complete"), """
                {"amount":40,"date":"2026-10-02"}""").andExpect(status().isOk());
        // Un achat d'objectif de la categorie compte dans les autres depenses.
        String goal = JsonPath.read(body(send(post(API + "/goals"), """
                {"name":"Robot cuisine","categoryId":"%s","estimatedPrice":200,"targetDate":"2026-12-01"}"""
                .formatted(courses)).andExpect(status().isCreated())), "$.id");
        send(post(API + "/goals/" + goal + "/purchase"), """
                {"amount":180,"date":"2026-10-30","accountId":"%s"}""".formatted(account)).andExpect(status().isOk());

        String oct = sheet("2026-10");
        assertThat((String) JsonPath.read(oct, "$.variable[0].envelopeId")).isEqualTo(id);
        assertThat(amount(oct, "$.variable[0].cap")).isEqualByComparingTo("300");
        assertThat(amount(oct, "$.variable[0].spent")).isEqualByComparingTo("160");
        assertThat(amount(oct, "$.variable[0].remaining")).isEqualByComparingTo("140");
        assertThat((Boolean) JsonPath.read(oct, "$.variable[0].exceeded")).isFalse();
        assertThat((Boolean) JsonPath.read(oct, "$.variable[0].commentRequired")).isFalse();
        assertThat((Integer) JsonPath.read(oct, "$.variable[0].operationCount")).isEqualTo(3);
        assertThat((List<String>) JsonPath.read(oct, "$.others[*].label")).containsExactly("Robot cuisine", "Cinema");
        assertThat((List<String>) JsonPath.read(oct, "$.fixed[*].label")).containsExactly("Panier bio");
        // 40 (fixe) + 160 (enveloppe) + 12 + 180 (autres).
        assertThat(amount(oct, "$.totals.expensesActual")).isEqualByComparingTo("392");
        assertThat(amount(oct, "$.totals.othersActual")).isEqualByComparingTo("192");

        // Une sous-categorie qui a sa propre enveloppe n'est plus comptee dans celle de sa racine.
        envelope(hygiene, "60", "2026-10");
        oct = sheet("2026-10");
        assertThat((List<String>) JsonPath.read(oct, "$.variable[*].label")).containsExactly("Courses", "Hygiene");
        assertThat(amount(oct, "$.variable[0].spent")).isEqualByComparingTo("110");
        assertThat(amount(oct, "$.variable[1].spent")).isEqualByComparingTo("50");
        assertThat(amount(oct, "$.totals.variableActual")).isEqualByComparingTo("160");
        assertThat(amount(oct, "$.totals.variablePlanned")).isEqualByComparingTo("360");
        // Mois avant le debut : aucune enveloppe.
        assertThat((Integer) JsonPath.read(sheet("2026-09"), "$.variable.length()")).isZero();
    }

    @Test
    void monthlyTotalCreatesUpdatesAndRemovesASingleOperation() throws Exception {
        String account = account();
        String courses = category("Courses", null);
        String id = envelope(courses, "300", "2026-09");
        expense(account, courses, "100", "2026-10-05", "Marche");

        String row = body(send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":250}""").andExpect(status().isOk()));
        assertThat(amount(row, "$.spent")).isEqualByComparingTo("250");
        assertThat((Integer) JsonPath.read(row, "$.operationCount")).isEqualTo(2);
        assertThat(totalOperations()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select amount from fin_operation where label = 'Courses — total du mois'",
                BigDecimal.class)).isEqualByComparingTo("150");
        // Mois en cours : datee d'aujourd'hui.
        assertThat(jdbc.queryForObject("select operation_date::text from fin_operation where label = 'Courses — total du mois'",
                String.class)).isEqualTo("2026-10-30");

        // Mise a jour : toujours une seule operation de total.
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":280}""").andExpect(status().isOk()).andExpect(jsonPath("$.spent").value(280));
        assertThat(totalOperations()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select amount from fin_operation where label = 'Courses — total du mois'",
                BigDecimal.class)).isEqualByComparingTo("180");

        // Total egal aux depenses deja saisies : l'operation de total est supprimee.
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":100}""").andExpect(status().isOk()).andExpect(jsonPath("$.spent").value(100))
                .andExpect(jsonPath("$.operationCount").value(1));
        assertThat(totalOperations()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from fin_envelope_month", Integer.class)).isZero();

        // Refus : total inferieur aux depenses deja saisies, mois a venir, mois hors suivi.
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":80}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("ENVELOPE_TOTAL_TOO_LOW"));
        send(put(API + "/envelopes/" + id + "/months/2026-11/actual"), """
                {"amount":80}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("FUTURE_COMPLETED_OPERATION"));
        send(put(API + "/envelopes/" + id + "/months/2026-08/actual"), """
                {"amount":80}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_ENVELOPE"));

        // Mois passe : datee du dernier jour du mois.
        send(put(API + "/envelopes/" + id + "/months/2026-09/actual"), """
                {"amount":200}""").andExpect(status().isOk()).andExpect(jsonPath("$.spent").value(200));
        assertThat(jdbc.queryForObject("select operation_date::text from fin_operation where label = 'Courses — total du mois'",
                String.class)).isEqualTo("2026-09-30");
        // Supprimer l'operation de total la retire simplement du suivi.
        String total = jdbc.queryForObject("select id from fin_operation where label = 'Courses — total du mois'",
                UUID.class).toString();
        mvc.perform(delete(API + "/operations/" + total)).andExpect(status().isNoContent());
        assertThat(amount(sheet("2026-09"), "$.variable[0].spent")).isEqualByComparingTo("0");
        send(put(API + "/envelopes/" + id + "/months/2026-09/actual"), """
                {"amount":210}""").andExpect(status().isOk()).andExpect(jsonPath("$.spent").value(210));
        assertThat(totalOperations()).isEqualTo(1);
    }

    @Test
    void overspendingRequiresACommentAndRaisesAnAlert() throws Exception {
        String account = account();
        String courses = category("Courses", null);
        String id = envelope(courses, "300", "2026-10");
        expense(account, courses, "320", "2026-10-10", "Courses de fete");

        String oct = sheet("2026-10");
        assertThat((Boolean) JsonPath.read(oct, "$.variable[0].exceeded")).isTrue();
        assertThat((Boolean) JsonPath.read(oct, "$.variable[0].commentRequired")).isTrue();
        assertThat(amount(oct, "$.variable[0].remaining")).isEqualByComparingTo("-20");
        String alerts = body(mvc.perform(get(API + "/alerts")));
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='ENVELOPE_OVER')].label")).containsExactly("Courses");
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='ENVELOPE_OVER')].refId")).containsExactly(id);
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='ENVELOPE_OVER')].severity"))
                .containsExactly("WARNING");
        assertThat(new BigDecimal(((List<Object>) JsonPath.read(alerts, "$[?(@.code=='ENVELOPE_OVER')].amount"))
                .getFirst().toString())).isEqualByComparingTo("20");

        send(put(API + "/envelopes/" + id + "/months/2026-10/comment"), """
                {"comment":"  Anniversaire  "}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value("Anniversaire"))
                .andExpect(jsonPath("$.commentRequired").value(false))
                .andExpect(jsonPath("$.exceeded").value(true));
        // Commentaire vide : supprime.
        send(put(API + "/envelopes/" + id + "/months/2026-10/comment"), """
                {"comment":" "}""")
                .andExpect(jsonPath("$.comment").doesNotExist())
                .andExpect(jsonPath("$.commentRequired").value(true));
        // Total du mois avec commentaire, puis sans : le commentaire est conserve.
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":330,"comment":"Repas de famille"}""")
                .andExpect(jsonPath("$.spent").value(330)).andExpect(jsonPath("$.comment").value("Repas de famille"));
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":325}""")
                .andExpect(jsonPath("$.spent").value(325)).andExpect(jsonPath("$.comment").value("Repas de famille"));
        assertThat((String) JsonPath.read(sheet("2026-10"), "$.variable[0].comment")).isEqualTo("Repas de famille");

        // Sous le plafond : plus d'alerte.
        send(put(API + "/envelopes/" + id + "/amount"), """
                {"fromMonth":"2026-10","amount":400}""").andExpect(status().isOk());
        assertThat((List<String>) JsonPath.read(body(mvc.perform(get(API + "/alerts"))),
                "$[?(@.code=='ENVELOPE_OVER')].code")).isEmpty();
    }

    @Test
    void budgetCapIsTheSumOfEnvelopesAndCapsChangeFromAMonth() throws Exception {
        account();
        String courses = category("Courses", null);
        String restaurants = category("Restaurants", null);
        send(put(API + "/preferences"), """
                {"safetyReserve":0,"savingsFloor":0,"defaultVariableCap":1000,"warningPercent":80}""")
                .andExpect(status().isOk());
        assertThat((String) JsonPath.read(budget("2026-10"), "$.capSource")).isEqualTo("DEFAULT");

        String coursesId = envelope(courses, "300", "2026-10");
        String restaurantsId = envelope(restaurants, "100", "2026-11");
        String oct = budget("2026-10");
        assertThat((String) JsonPath.read(oct, "$.capSource")).isEqualTo("ENVELOPES");
        assertThat(amount(oct, "$.variableCap")).isEqualByComparingTo("300");
        assertThat(amount(budget("2026-11"), "$.variableCap")).isEqualByComparingTo("400");
        mvc.perform(get(API + "/overview").param("month", "2026-11")).andExpect(jsonPath("$.budget.cap").value(400));

        String changed = body(send(put(API + "/envelopes/" + coursesId + "/amount"), """
                {"fromMonth":"2027-01","amount":350}""").andExpect(status().isOk()));
        assertThat((List<String>) JsonPath.read(changed, "$.amounts[*].fromMonth")).containsExactly("2026-10", "2027-01");
        assertThat(amount(changed, "$.currentAmount")).isEqualByComparingTo("300");
        assertThat(amount(budget("2026-12"), "$.variableCap")).isEqualByComparingTo("400");
        assertThat(amount(budget("2027-01"), "$.variableCap")).isEqualByComparingTo("450");
        assertThat(amount(sheet("2027-01"), "$.totals.variablePlanned")).isEqualByComparingTo("450");
        send(put(API + "/envelopes/" + coursesId + "/amount"), """
                {"fromMonth":"2026-09","amount":350}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));

        // Fin du suivi des restaurants apres decembre.
        send(post(API + "/envelopes/" + restaurantsId + "/end"), """
                {"lastMonth":"2026-12"}""").andExpect(status().isOk()).andExpect(jsonPath("$.endMonth").value("2026-12"));
        assertThat(amount(budget("2026-12"), "$.variableCap")).isEqualByComparingTo("400");
        assertThat(amount(budget("2027-01"), "$.variableCap")).isEqualByComparingTo("350");
        send(put(API + "/envelopes/" + restaurantsId + "/amount"), """
                {"fromMonth":"2027-02","amount":120}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));
        send(post(API + "/envelopes/" + restaurantsId + "/end"), """
                {"lastMonth":"2026-10"}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_ENVELOPE"));

        // Statistiques : plafond de chaque mois.
        String stats = body(mvc.perform(get(API + "/statistics").param("from", "2026-10").param("to", "2026-11")));
        assertThat(amount(stats, "$.months[0].variableCap")).isEqualByComparingTo("300");
        assertThat(amount(stats, "$.months[1].variableCap")).isEqualByComparingTo("400");

        // Libelle et ordre d'affichage.
        send(put(API + "/envelopes/" + restaurantsId), """
                {"label":"Sorties","position":-1}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.label").value("Sorties"));
        String list = body(mvc.perform(get(API + "/envelopes")).andExpect(status().isOk()));
        assertThat((List<String>) JsonPath.read(list, "$[*].label")).containsExactly("Sorties", "Courses");
        assertThat((Object) JsonPath.read(list, "$[0].currentAmount")).isNull();

        // Une categorie suivie ne se supprime pas ; supprimer l'enveloppe rend le plafond par defaut.
        mvc.perform(delete(API + "/categories/" + courses))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CATEGORY_IN_USE"));
        mvc.perform(delete(API + "/envelopes/" + coursesId)).andExpect(status().isNoContent());
        oct = budget("2026-10");
        assertThat((String) JsonPath.read(oct, "$.capSource")).isEqualTo("DEFAULT");
        assertThat(amount(oct, "$.variableCap")).isEqualByComparingTo("1000");
        assertThat((List<String>) JsonPath.read(body(mvc.perform(get(API + "/envelopes"))), "$[*].label"))
                .containsExactly("Sorties");
    }

    @Test
    void archivedCategoryIsRefused() throws Exception {
        String old = category("Ancienne", null);
        send(put(API + "/categories/" + old), """
                {"name":"Ancienne","parentId":null,"archived":true}""").andExpect(status().isOk());
        send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":50,"fromMonth":"2026-10"}""".formatted(old))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CATEGORY_ARCHIVED"));
        send(post(API + "/envelopes"), """
                {"amount":50,"fromMonth":"2026-10"}""").andExpect(status().isBadRequest());
    }

    @Test
    void envelopesAndDatedAmountsSurviveABackupRoundTrip() throws Exception {
        String account = account();
        String courses = category("Courses", null);
        String logement = category("Logement", null);
        String rent = JsonPath.read(body(send(post(API + "/schedules"), """
                {"label":"Loyer","type":"EXPENSE","kind":"BILL","accountId":"%s","categoryId":"%s","amount":350,
                 "essential":true,"frequency":"MONTHLY","startDate":"2026-11-05"}""".formatted(account, logement))
                .andExpect(status().isCreated())), "$.id");
        send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2027-01","amount":400}""").andExpect(status().isOk());
        String id = envelope(courses, "300", "2026-10");
        send(put(API + "/envelopes/" + id + "/amount"), """
                {"fromMonth":"2026-12","amount":320}""").andExpect(status().isOk());
        expense(account, courses, "100", "2026-10-05", "Marche");
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":350,"comment":"Invites"}""").andExpect(status().isOk());

        String backup = body(mvc.perform(get("/api/v1/export/backup")));
        assertThat((Integer) JsonPath.read(backup, "$.version")).isEqualTo(6);
        assertThat((Integer) JsonPath.read(backup, "$.finance.envelopes.length()")).isEqualTo(1);
        assertThat((List<String>) JsonPath.read(backup, "$.finance.schedules[0].amounts[*].fromMonth"))
                .containsExactly("2027-01");

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.finance.schedulesCreated").value(1));
        String schedule = body(mvc.perform(get(API + "/schedules")));
        assertThat((List<String>) JsonPath.read(schedule, "$[0].amounts[*].fromMonth")).containsExactly("2026-11", "2027-01");
        assertThat(amount(sheet("2027-01"), "$.fixed[0].planned")).isEqualByComparingTo("400");
        String envelopes = body(mvc.perform(get(API + "/envelopes")));
        assertThat((List<String>) JsonPath.read(envelopes, "$[0].amounts[*].fromMonth")).containsExactly("2026-10", "2026-12");
        String oct = sheet("2026-10");
        assertThat(amount(oct, "$.variable[0].spent")).isEqualByComparingTo("350");
        assertThat((String) JsonPath.read(oct, "$.variable[0].comment")).isEqualTo("Invites");
        // L'operation de total restauree est reprise par une nouvelle saisie (pas de doublon).
        send(put(API + "/envelopes/" + id + "/months/2026-10/actual"), """
                {"amount":360}""").andExpect(status().isOk()).andExpect(jsonPath("$.spent").value(360));
        assertThat(totalOperations()).isEqualTo(1);

        // Reimport : rien n'est duplique.
        send(post("/api/v1/import"), backup).andExpect(jsonPath("$.errors.length()").value(0));
        assertThat(jdbc.queryForObject("select count(*) from fin_envelope", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from fin_schedule_amount", Integer.class)).isEqualTo(1);
    }
}
