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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Echeanciers, budget mensuel et preferences. Aujourd'hui = 30/10/2026 (Paris). */
class FinanceBudgetIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    private ResultActions send(MockHttpServletRequestBuilder req, String json) throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String account() throws Exception {
        return JsonPath.read(send(post(API + "/accounts"), """
                {"name":"Courant","type":"CURRENT","openingBalance":1000}""")
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String category(String name) throws Exception {
        send(post(API + "/categories"), "{\"name\":\"" + name + "\"}").andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ?", UUID.class, name).toString();
    }

    private String schedule(String json) throws Exception {
        return JsonPath.read(send(post(API + "/schedules"), json).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String salary(String account) throws Exception {
        return schedule("""
                {"label":"Salaire","type":"INCOME","kind":"SALARY","accountId":"%s","incomeKind":"SALARY","amount":2200,
                 "frequency":"MONTHLY","startDate":"2026-10-28"}""".formatted(account));
    }

    private String budget(String month) throws Exception {
        return mvc.perform(get(API + "/budget").param("month", month)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static BigDecimal amount(String json, String path) {
        return new BigDecimal(JsonPath.read(json, path).toString());
    }

    private BigDecimal balance(String accountId) throws Exception {
        String body = mvc.perform(get(API + "/accounts")).andReturn().getResponse().getContentAsString();
        List<Number> values = JsonPath.read(body, "$[?(@.id=='" + accountId + "')].balance");
        return new BigDecimal(values.getFirst().toString());
    }

    @Test
    void plannedSalaryIsExpectedButNotAvailableUntilReceived() throws Exception {
        String courant = account();
        String salary = salary(courant);

        String october = budget("2026-10");
        assertThat(amount(october, "$.totals.incomeExpected")).isEqualByComparingTo("2200");
        assertThat(amount(october, "$.totals.incomeReceived")).isEqualByComparingTo("0");
        assertThat((Boolean) JsonPath.read(october, "$.incomes[0].virtual")).isTrue();
        assertThat((Boolean) JsonPath.read(october, "$.incomes[0].overdue")).isTrue();
        assertThat(balance(courant)).isEqualByComparingTo("1000");
        // La vue d'ensemble propose l'echeance en retard.
        mvc.perform(get(API + "/overview").param("month", "2026-10"))
                .andExpect(jsonPath("$.overdueCount").value(1))
                .andExpect(jsonPath("$.upcoming[0].scheduleId").value(salary));

        send(post(API + "/schedules/" + salary + "/occurrences/2026-10-28/complete"), """
                {"amount":2150,"date":"2026-10-30"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.plannedAmount").value(2200))
                .andExpect(jsonPath("$.dueDate").value("2026-10-28"))
                .andExpect(jsonPath("$.virtual").value(false));
        assertThat(balance(courant)).isEqualByComparingTo("3150");
        october = budget("2026-10");
        assertThat(amount(october, "$.totals.incomeExpected")).isEqualByComparingTo("2200");
        assertThat(amount(october, "$.totals.incomeReceived")).isEqualByComparingTo("2150");
        assertThat((Integer) JsonPath.read(october, "$.incomes.length()")).isEqualTo(1);

        // Une echeance ne se paie pas deux fois.
        send(post(API + "/schedules/" + salary + "/occurrences/2026-10-28/complete"), """
                {"amount":2150,"date":"2026-10-30"}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OCCURRENCE_ALREADY_RECORDED"));
        assertThat(balance(courant)).isEqualByComparingTo("3150");
        // La prevision des mois suivants reutilise le salaire prevu.
        assertThat(amount(budget("2026-11"), "$.totals.incomeExpected")).isEqualByComparingTo("2200");
    }

    @Test
    void monthsCanBeSkippedOrAdjustedWithoutChangingTheSchedule() throws Exception {
        String salary = salary(account());
        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-28/skip"), "{}")
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(amount(budget("2026-11"), "$.totals.incomeExpected")).isEqualByComparingTo("0");

        send(put(API + "/schedules/" + salary + "/occurrences/2026-12-28"), """
                {"amount":2300,"date":"2026-12-24"}""")
                .andExpect(jsonPath("$.status").value("PLANNED"))
                .andExpect(jsonPath("$.amount").value(2300));
        assertThat(amount(budget("2026-12"), "$.totals.incomeExpected")).isEqualByComparingTo("2300");
        assertThat(amount(budget("2027-01"), "$.totals.incomeExpected")).isEqualByComparingTo("2200");

        send(post(API + "/schedules/" + salary + "/occurrences/2026-11-15/skip"), "{}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_OCCURRENCE"));
        // Un echeancier avec un historique ne se supprime pas : il se resilie.
        mvc.perform(delete(API + "/schedules/" + salary))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SCHEDULE_IN_USE"));
        mvc.perform(post(API + "/schedules/" + salary + "/end")).andExpect(jsonPath("$.status").value("ENDED"));
        assertThat(amount(budget("2027-01"), "$.totals.incomeExpected")).isEqualByComparingTo("0");
    }

    @Test
    void budgetSeparatesEssentialsAndTracksTheVariableCap() throws Exception {
        String courant = account();
        String logement = category("Logement");
        String loisirs = category("Loisirs");
        salary(courant);
        schedule("""
                {"label":"Loyer","type":"EXPENSE","kind":"BILL","accountId":"%s","categoryId":"%s","amount":500,
                 "essential":true,"frequency":"MONTHLY","startDate":"2026-11-01"}""".formatted(courant, logement));
        schedule("""
                {"label":"Streaming","type":"EXPENSE","kind":"SUBSCRIPTION","accountId":"%s","categoryId":"%s",
                 "amount":13.49,"frequency":"MONTHLY","startDate":"2026-11-10"}""".formatted(courant, loisirs));
        send(put(API + "/preferences"), """
                {"safetyReserve":200,"savingsFloor":0,"defaultVariableCap":1000,"defaultSavingsTarget":500,
                 "warningPercent":80}""").andExpect(status().isOk());

        String nov = budget("2026-11");
        assertThat((String) JsonPath.read(nov, "$.capSource")).isEqualTo("DEFAULT");
        assertThat(amount(nov, "$.essentialExpected")).isEqualByComparingTo("500");
        assertThat(amount(nov, "$.totals.variablePlanned")).isEqualByComparingTo("13.49");
        assertThat((List<String>) JsonPath.read(nov, "$.essentials[*].label")).containsExactly("Loyer");
        assertThat((List<String>) JsonPath.read(nov, "$.plannedVariable[*].label")).containsExactly("Streaming");
        // Epargne theorique = revenus attendus - indispensables - plafond variable = 2200 - 500 - 1000.
        assertThat(amount(nov, "$.theoreticalSavings")).isEqualByComparingTo("700");
        assertThat((String) JsonPath.read(nov, "$.state")).isEqualTo("OK");

        // Budget propre au mois d'octobre : plafond 100.
        send(put(API + "/budget/2026-10"), """
                {"variableCap":100,"savingsTarget":null}""").andExpect(jsonPath("$.capSource").value("MONTH"));
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-29","amount":85,"label":"Sortie",
                 "categoryId":"%s"}""".formatted(courant, loisirs)).andExpect(status().isCreated());
        String oct = budget("2026-10");
        assertThat((String) JsonPath.read(oct, "$.state")).isEqualTo("WARNING");
        assertThat((Integer) JsonPath.read(oct, "$.variableUsedPercent")).isEqualTo(85);
        assertThat(amount(oct, "$.variableRemaining")).isEqualByComparingTo("15");
        assertThat((String) JsonPath.read(oct, "$.savingsTargetSource")).isEqualTo("DEFAULT");

        // Le depassement est signale mais l'enregistrement d'une depense reelle n'est jamais bloque.
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-30","amount":20,"label":"Cinema",
                 "categoryId":"%s"}""".formatted(courant, loisirs)).andExpect(status().isCreated());
        oct = budget("2026-10");
        assertThat((String) JsonPath.read(oct, "$.state")).isEqualTo("OVER");
        assertThat(amount(oct, "$.variableRemaining")).isEqualByComparingTo("-5");
        mvc.perform(get(API + "/overview").param("month", "2026-10"))
                .andExpect(jsonPath("$.budget.state").value("OVER"))
                .andExpect(jsonPath("$.safetyReserve").value(200));
    }

    @Test
    void installmentsEndAfterTheirLastPayment() throws Exception {
        String courant = account();
        String equipement = category("Equipement");
        String body = send(post(API + "/schedules"), """
                {"label":"Velo en 3 fois","type":"EXPENSE","kind":"INSTALLMENT","accountId":"%s","categoryId":"%s",
                 "amount":150,"frequency":"MONTHLY","startDate":"2026-11-05","occurrences":3}""".formatted(courant, equipement))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endDate").value("2027-01-05"))
                .andExpect(jsonPath("$.nextDueDate").value("2026-11-05"))
                .andReturn().getResponse().getContentAsString();
        assertThat(amount(body, "$.monthlyEquivalent")).isEqualByComparingTo("150");
        assertThat(amount(budget("2027-01"), "$.totals.expensesPlanned")).isEqualByComparingTo("150");
        assertThat(amount(budget("2027-02"), "$.totals.expensesPlanned")).isEqualByComparingTo("0");
    }

    @Test
    void pausedSubscriptionsAreNotExpectedUntilResumed() throws Exception {
        String courant = account();
        String abonnements = category("Abonnements");
        String claude = schedule("""
                {"label":"Claude","type":"EXPENSE","kind":"SUBSCRIPTION","accountId":"%s","categoryId":"%s",
                 "amount":21.60,"frequency":"MONTHLY","startDate":"2026-11-15"}""".formatted(courant, abonnements));
        mvc.perform(post(API + "/schedules/" + claude + "/pause")).andExpect(jsonPath("$.status").value("PAUSED"))
                .andExpect(jsonPath("$.nextDueDate").doesNotExist());
        assertThat(amount(budget("2026-11"), "$.totals.expensesPlanned")).isEqualByComparingTo("0");
        mvc.perform(post(API + "/schedules/" + claude + "/resume"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.nextDueDate").value("2026-11-15"));
        assertThat(amount(budget("2026-11"), "$.totals.expensesPlanned")).isEqualByComparingTo("21.60");
    }

    @Test
    void invalidSchedulesAndPreferencesAreRejected() throws Exception {
        String courant = account();
        send(post(API + "/schedules"), """
                {"label":"Sans categorie","type":"EXPENSE","kind":"BILL","accountId":"%s","amount":10,
                 "frequency":"MONTHLY","startDate":"2026-11-01"}""".formatted(courant))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_SCHEDULE"));
        send(post(API + "/schedules"), """
                {"label":"Fin avant debut","type":"INCOME","kind":"OTHER","accountId":"%s","incomeKind":"OTHER",
                 "amount":10,"frequency":"MONTHLY","startDate":"2026-11-01","endDate":"2026-10-01"}""".formatted(courant))
                .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE"));
        send(put(API + "/preferences"), """
                {"safetyReserve":-1,"savingsFloor":0,"warningPercent":80}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
        send(put(API + "/preferences"), """
                {"safetyReserve":0,"savingsFloor":0,"warningPercent":120}""")
                .andExpect(status().isBadRequest());
    }

    @Test
    void schedulesBudgetsAndPreferencesSurviveABackupRoundTrip() throws Exception {
        String courant = account();
        String salary = salary(courant);
        send(post(API + "/schedules/" + salary + "/occurrences/2026-10-28/complete"), """
                {"amount":2150,"date":"2026-10-29"}""").andExpect(status().isOk());
        send(put(API + "/budget/2026-11"), """
                {"variableCap":900,"savingsTarget":400}""").andExpect(status().isOk());
        send(put(API + "/preferences"), """
                {"safetyReserve":300,"savingsFloor":1000,"defaultVariableCap":1000,"warningPercent":75}""")
                .andExpect(status().isOk());
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.finance.schedulesCreated").value(1))
                .andExpect(jsonPath("$.finance.budgetsRestored").value(1))
                .andExpect(jsonPath("$.finance.preferencesRestored").value(true));
        String nov = budget("2026-11");
        assertThat(amount(nov, "$.variableCap")).isEqualByComparingTo("900");
        assertThat(amount(nov, "$.totals.incomeExpected")).isEqualByComparingTo("2200");
        String oct = budget("2026-10");
        assertThat(amount(oct, "$.totals.incomeReceived")).isEqualByComparingTo("2150");
        assertThat((Boolean) JsonPath.read(oct, "$.incomes[0].virtual")).isFalse();
        mvc.perform(get(API + "/preferences")).andExpect(jsonPath("$.savingsFloor").value(1000))
                .andExpect(jsonPath("$.warningPercent").value(75));

        // Reimport : l'echeance deja enregistree n'est pas dupliquee.
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.finance.schedulesSkipped").value(1))
                .andExpect(jsonPath("$.finance.operationsCreated").value(0));
        assertThat(balance(courant)).isEqualByComparingTo("3150");
    }
}
