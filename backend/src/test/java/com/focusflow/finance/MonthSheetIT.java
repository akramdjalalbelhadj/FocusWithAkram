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
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Feuille du mois (lot 13) : montants dates des echeanciers, reel et commentaire des echeances, totaux et epargne.
 * Aujourd'hui = 30/10/2026 (Paris), sauf mention contraire.
 */
class MonthSheetIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";
    private static final Instant NOV_29 = Instant.parse("2026-11-29T10:00:00Z");

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

    private String category(String name) throws Exception {
        send(post(API + "/categories"), "{\"name\":\"" + name + "\"}").andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ?", UUID.class, name).toString();
    }

    private String schedule(String json) throws Exception {
        return JsonPath.read(body(send(post(API + "/schedules"), json).andExpect(status().isCreated())), "$.id");
    }

    private String rent(String account, String logement) throws Exception {
        return schedule("""
                {"label":"Loyer","type":"EXPENSE","kind":"BILL","accountId":"%s","categoryId":"%s","amount":350,
                 "essential":true,"frequency":"MONTHLY","startDate":"2026-11-05"}""".formatted(account, logement));
    }

    private String salary(String account) throws Exception {
        return schedule("""
                {"label":"Salaire","type":"INCOME","kind":"SALARY","accountId":"%s","incomeKind":"SALARY","amount":2290,
                 "frequency":"MONTHLY","startDate":"2026-11-28","endDate":"2027-02-28"}""".formatted(account));
    }

    private String sheet(String month) throws Exception {
        return body(mvc.perform(get(API + "/months/" + month + "/sheet")).andExpect(status().isOk()));
    }

    private static BigDecimal amount(String json, String path) {
        Object v = JsonPath.read(json, path);
        return v == null ? null : new BigDecimal(v.toString());
    }

    @Test
    void rentChangesFromJanuaryWithoutTouchingEarlierMonths() throws Exception {
        String rent = rent(account(), category("Logement"));

        String changed = body(send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2027-01","amount":400}""").andExpect(status().isOk()));
        assertThat((List<String>) JsonPath.read(changed, "$.amounts[*].fromMonth")).containsExactly("2026-11", "2027-01");
        assertThat(amount(changed, "$.amounts[0].amount")).isEqualByComparingTo("350");
        assertThat(amount(changed, "$.amounts[1].amount")).isEqualByComparingTo("400");
        assertThat(amount(changed, "$.amount")).isEqualByComparingTo("350");
        // Equivalent mensuel au montant valable aujourd'hui.
        assertThat(amount(changed, "$.monthlyEquivalent")).isEqualByComparingTo("350");

        assertThat(amount(sheet("2026-11"), "$.fixed[0].planned")).isEqualByComparingTo("350");
        assertThat(amount(sheet("2026-12"), "$.fixed[0].planned")).isEqualByComparingTo("350");
        String january = sheet("2027-01");
        assertThat(amount(january, "$.fixed[0].planned")).isEqualByComparingTo("400");
        assertThat((String) JsonPath.read(january, "$.fixed[0].key")).isEqualTo(rent + "/2027-01-05");
        assertThat((Boolean) JsonPath.read(january, "$.fixed[0].essential")).isTrue();
        assertThat(amount(sheet("2027-03"), "$.fixed[0].planned")).isEqualByComparingTo("400");
        // Le budget et la prevision utilisent le montant du mois.
        assertThat(amount(body(mvc.perform(get(API + "/budget").param("month", "2027-01"))), "$.essentialExpected"))
                .isEqualByComparingTo("400");

        // Ce mois seulement : decembre ajuste, puis un changement « a partir de decembre » ne le modifie pas.
        send(put(API + "/schedules/" + rent + "/occurrences/2026-12-05"), """
                {"amount":380,"date":"2026-12-05","comment":"Regularisation des charges"}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Regularisation des charges"));
        send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2026-12","amount":390}""").andExpect(status().isOk());
        String december = sheet("2026-12");
        assertThat(amount(december, "$.fixed[0].planned")).isEqualByComparingTo("380");
        assertThat((Boolean) JsonPath.read(december, "$.fixed[0].adjusted")).isTrue();
        assertThat((String) JsonPath.read(december, "$.fixed[0].comment")).isEqualTo("Regularisation des charges");
        assertThat((String) JsonPath.read(december, "$.fixed[0].status")).isEqualTo("PLANNED");
        assertThat(amount(sheet("2026-11"), "$.fixed[0].planned")).isEqualByComparingTo("350");
        assertThat(amount(sheet("2027-01"), "$.fixed[0].planned")).isEqualByComparingTo("400");

        // Le mois de la premiere echeance modifie le montant de base.
        send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2026-11","amount":360}""")
                .andExpect(jsonPath("$.amount").value(360))
                .andExpect(jsonPath("$.amounts.length()").value(3));
        assertThat(amount(sheet("2026-11"), "$.fixed[0].planned")).isEqualByComparingTo("360");

        // Suppression d'une version : le montant precedent s'applique de nouveau.
        String removed = body(mvc.perform(delete(API + "/schedules/" + rent + "/amount/2027-01")).andExpect(status().isOk()));
        assertThat((List<String>) JsonPath.read(removed, "$.amounts[*].fromMonth")).containsExactly("2026-11", "2026-12");
        assertThat(amount(sheet("2027-01"), "$.fixed[0].planned")).isEqualByComparingTo("390");

        // Refus : avant la premiere echeance, suppression du premier montant, version inexistante.
        send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2026-10","amount":300}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));
        mvc.perform(delete(API + "/schedules/" + rent + "/amount/2026-11"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));
        mvc.perform(delete(API + "/schedules/" + rent + "/amount/2027-05"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));
        send(put(API + "/schedules/" + rent + "/amount"), """
                {"fromMonth":"2027-02","amount":0}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));

        // Le remplacement complet garde sa semantique sur le montant de base ; les versions suivantes restent.
        send(put(API + "/schedules/" + rent), """
                {"label":"Loyer","type":"EXPENSE","kind":"BILL","accountId":"%s","categoryId":"%s","amount":355,
                 "essential":true,"frequency":"MONTHLY","startDate":"2026-11-05"}"""
                .formatted(jdbc.queryForObject("select id from fin_account", UUID.class),
                        jdbc.queryForObject("select id from fin_category where name = 'Logement'", UUID.class)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(355))
                .andExpect(jsonPath("$.amounts[1].fromMonth").value("2026-12"));
    }

    @Test
    void salaryOverFourMonthsWithActualCommentResetAndSkip() throws Exception {
        String account = account();
        String salary = salary(account);
        // Present de novembre 2026 a fevrier 2027 seulement.
        assertThat((Integer) JsonPath.read(sheet("2026-10"), "$.incomes.length()")).isZero();
        for (String month : List.of("2026-11", "2026-12", "2027-01", "2027-02")) {
            String s = sheet(month);
            assertThat((Integer) JsonPath.read(s, "$.incomes.length()")).as(month).isEqualTo(1);
            assertThat(amount(s, "$.incomes[0].planned")).isEqualByComparingTo("2290");
            assertThat((String) JsonPath.read(s, "$.incomes[0].status")).isEqualTo("PLANNED");
            assertThat((String) JsonPath.read(s, "$.incomes[0].incomeKind")).isEqualTo("SALARY");
            assertThat((Object) JsonPath.read(s, "$.incomes[0].operationId")).isNull();
        }
        assertThat((Integer) JsonPath.read(sheet("2027-03"), "$.incomes.length()")).isZero();
        // Fin au 28/02/2027 : un changement de montant apres la fin est refuse.
        send(put(API + "/schedules/" + salary + "/amount"), """
                {"fromMonth":"2027-03","amount":2400}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT_CHANGE"));

        // Le reel ne se saisit pas a l'avance.
        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-28/complete"), """
                {"amount":2100,"date":"2026-11-28"}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("FUTURE_COMPLETED_OPERATION"));

        clock.set(NOV_29);
        String late = sheet("2026-11");
        assertThat((String) JsonPath.read(late, "$.incomes[0].status")).isEqualTo("LATE");
        assertThat((String) JsonPath.read(late, "$.period")).isEqualTo("CURRENT");

        // Reel plus bas avec commentaire : l'ecart et le commentaire apparaissent.
        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-28/complete"), """
                {"amount":2100,"date":"2026-11-28","comment":"Absence maladie"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plannedAmount").value(2290))
                .andExpect(jsonPath("$.description").value("Absence maladie"));
        String nov = sheet("2026-11");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].status")).isEqualTo("DONE");
        assertThat(amount(nov, "$.incomes[0].planned")).isEqualByComparingTo("2290");
        assertThat(amount(nov, "$.incomes[0].actual")).isEqualByComparingTo("2100");
        assertThat(amount(nov, "$.incomes[0].difference")).isEqualByComparingTo("-190");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].comment")).isEqualTo("Absence maladie");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].operationId")).isNotNull();
        assertThat(amount(nov, "$.totals.incomePlanned")).isEqualByComparingTo("2290");
        assertThat(amount(nov, "$.totals.incomeActual")).isEqualByComparingTo("2100");
        assertThat(amount(nov, "$.account.balance")).isEqualByComparingTo("3100");

        // Ressaisie du reel : la meme operation est corrigee, le prevu est conserve.
        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-28/complete"), """
                {"amount":2150,"date":"2026-11-27","comment":"Absence (corrigee)"}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.plannedAmount").value(2290));
        nov = sheet("2026-11");
        assertThat(amount(nov, "$.incomes[0].actual")).isEqualByComparingTo("2150");
        assertThat(amount(nov, "$.incomes[0].difference")).isEqualByComparingTo("-140");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].date")).isEqualTo("2026-11-27");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].dueDate")).isEqualTo("2026-11-28");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].comment")).isEqualTo("Absence (corrigee)");
        assertThat(jdbc.queryForObject("select count(*) from fin_operation where schedule_id is not null", Integer.class))
                .isEqualTo(1);
        assertThat(amount(nov, "$.account.balance")).isEqualByComparingTo("3150");

        // Annulation de la saisie : l'echeance redevient prevue (en retard).
        mvc.perform(delete(API + "/schedules/" + salary + "/occurrences/2026-11-28")).andExpect(status().isNoContent());
        nov = sheet("2026-11");
        assertThat((String) JsonPath.read(nov, "$.incomes[0].status")).isEqualTo("LATE");
        assertThat((Object) JsonPath.read(nov, "$.incomes[0].actual")).isNull();
        assertThat((Object) JsonPath.read(nov, "$.incomes[0].comment")).isNull();
        assertThat(amount(nov, "$.account.balance")).isEqualByComparingTo("1000");
        mvc.perform(delete(API + "/schedules/" + salary + "/occurrences/2026-11-28")).andExpect(status().isNoContent());

        // Echeance sautee : exclue des totaux ; annuler le saut la rend de nouveau prevue.
        mvc.perform(post(API + "/schedules/" + salary + "/occurrences/2026-12-28/skip")).andExpect(status().isOk());
        String dec = sheet("2026-12");
        assertThat((String) JsonPath.read(dec, "$.incomes[0].status")).isEqualTo("SKIPPED");
        assertThat(amount(dec, "$.totals.incomePlanned")).isEqualByComparingTo("0");
        assertThat((String) JsonPath.read(dec, "$.period")).isEqualTo("FUTURE");
        mvc.perform(delete(API + "/schedules/" + salary + "/occurrences/2026-12-28")).andExpect(status().isNoContent());
        assertThat((String) JsonPath.read(sheet("2026-12"), "$.incomes[0].status")).isEqualTo("PLANNED");

        // Ce mois seulement : janvier ajuste, fevrier inchange.
        send(put(API + "/schedules/" + salary + "/occurrences/2027-01-28"), """
                {"amount":2400,"date":"2027-01-27","comment":"Prime"}""").andExpect(status().isOk());
        String jan = sheet("2027-01");
        assertThat(amount(jan, "$.incomes[0].planned")).isEqualByComparingTo("2400");
        assertThat((Boolean) JsonPath.read(jan, "$.incomes[0].adjusted")).isTrue();
        assertThat((String) JsonPath.read(jan, "$.incomes[0].date")).isEqualTo("2027-01-27");
        assertThat((String) JsonPath.read(jan, "$.incomes[0].comment")).isEqualTo("Prime");
        String feb = sheet("2027-02");
        assertThat(amount(feb, "$.incomes[0].planned")).isEqualByComparingTo("2290");
        assertThat((Boolean) JsonPath.read(feb, "$.incomes[0].adjusted")).isFalse();
        assertThat((String) JsonPath.read(sheet("2026-10"), "$.period")).isEqualTo("PAST");
    }

    @Test
    void totalsCompareThePlannedAndActualSavings() throws Exception {
        String account = account();
        String logement = category("Logement");
        String courses = category("Courses");
        String loisirs = category("Loisirs");
        String salary = salary(account);
        String rent = rent(account, logement);
        send(post(API + "/envelopes"), """
                {"categoryId":"%s","amount":300,"fromMonth":"2026-11"}""".formatted(courses)).andExpect(status().isCreated());
        send(put(API + "/preferences"), """
                {"safetyReserve":0,"savingsFloor":0,"defaultSavingsTarget":500,"warningPercent":80}""")
                .andExpect(status().isOk());
        // Revenu ponctuel prevu.
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"INCOME","status":"PLANNED","date":"2026-11-30","amount":40,
                 "label":"Remboursement mutuelle","incomeKind":"OTHER"}""".formatted(account)).andExpect(status().isCreated());

        clock.set(NOV_29);
        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-28/complete"), """
                {"amount":2290,"date":"2026-11-28"}""").andExpect(status().isOk());
        send(post(API + "/schedules/" + rent + "/occurrences/2026-11-05/complete"), """
                {"amount":350,"date":"2026-11-05"}""").andExpect(status().isOk());
        for (String expense : List.of(
                "{\"date\":\"2026-11-10\",\"amount\":120,\"label\":\"Supermarche\",\"categoryId\":\"" + courses + "\"}",
                "{\"date\":\"2026-11-12\",\"amount\":25,\"label\":\"Cinema\",\"categoryId\":\"" + loisirs + "\"}",
                "{\"date\":\"2026-11-20\",\"amount\":15,\"label\":\"Livre\",\"categoryId\":\"" + loisirs + "\"}")) {
            send(post(API + "/operations"), expense.replace("{", "{\"accountId\":\"" + account
                    + "\",\"type\":\"EXPENSE\",\"status\":\"COMPLETED\",")).andExpect(status().isCreated());
        }

        String nov = sheet("2026-11");
        assertThat((String) JsonPath.read(nov, "$.month")).isEqualTo("2026-11");
        assertThat((String) JsonPath.read(nov, "$.today")).isEqualTo("2026-11-29");
        assertThat((List<String>) JsonPath.read(nov, "$.incomes[*].label")).containsExactly("Salaire", "Remboursement mutuelle");
        assertThat((String) JsonPath.read(nov, "$.incomes[1].status")).isEqualTo("PLANNED");
        assertThat((Object) JsonPath.read(nov, "$.incomes[1].scheduleId")).isNull();
        assertThat((String) JsonPath.read(nov, "$.fixed[0].status")).isEqualTo("DONE");
        assertThat(amount(nov, "$.variable[0].spent")).isEqualByComparingTo("120");
        assertThat((List<String>) JsonPath.read(nov, "$.others[*].label")).containsExactly("Livre", "Cinema");
        assertThat(amount(nov, "$.totals.incomePlanned")).isEqualByComparingTo("2330");
        assertThat(amount(nov, "$.totals.incomeActual")).isEqualByComparingTo("2290");
        assertThat(amount(nov, "$.totals.fixedPlanned")).isEqualByComparingTo("350");
        assertThat(amount(nov, "$.totals.fixedActual")).isEqualByComparingTo("350");
        assertThat(amount(nov, "$.totals.variablePlanned")).isEqualByComparingTo("300");
        assertThat(amount(nov, "$.totals.variableActual")).isEqualByComparingTo("120");
        assertThat(amount(nov, "$.totals.expensesActual")).isEqualByComparingTo("510");
        assertThat(amount(nov, "$.totals.othersActual")).isEqualByComparingTo("40");
        assertThat(amount(nov, "$.totals.expensesPlanned")).isEqualByComparingTo("650");
        assertThat(amount(nov, "$.totals.savingsPlanned")).isEqualByComparingTo("1680");
        assertThat(amount(nov, "$.totals.savingsActual")).isEqualByComparingTo("1780");
        assertThat(amount(nov, "$.savingsTarget")).isEqualByComparingTo("500");
        assertThat(amount(nov, "$.account.balance")).isEqualByComparingTo("2780");
        // Le bilan du mois donne les memes depenses payees.
        assertThat(amount(body(mvc.perform(get(API + "/overview").param("month", "2026-11"))), "$.totals.expensesPaid"))
                .isEqualByComparingTo("510");

        // Objectif propre au mois.
        send(put(API + "/budget/2026-11"), """
                {"variableCap":null,"savingsTarget":600}""").andExpect(status().isOk());
        assertThat(amount(sheet("2026-11"), "$.savingsTarget")).isEqualByComparingTo("600");
    }

    @Test
    void sheetWithoutAccountIsEmpty() throws Exception {
        String empty = sheet("2026-10");
        assertThat((Object) JsonPath.read(empty, "$.account")).isNull();
        assertThat((Object) JsonPath.read(empty, "$.savingsTarget")).isNull();
        assertThat(amount(empty, "$.totals.savingsActual")).isEqualByComparingTo("0");
        mvc.perform(get(API + "/months/2026-13/sheet")).andExpect(status().isBadRequest());
    }
}
