package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;
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

/** Alertes, statistiques, simulations et calendrier financier. Aujourd'hui = 30/10/2026 (Paris). */
class InsightIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    private ResultActions send(MockHttpServletRequestBuilder req, String json) throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String id(ResultActions r) throws Exception {
        return JsonPath.read(r.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String account(String name, String type, String opening) throws Exception {
        return id(send(post(API + "/accounts"), """
                {"name":"%s","type":"%s","openingBalance":%s}""".formatted(name, type, opening)));
    }

    private String category(String name, String parentId) throws Exception {
        String parent = parentId == null ? "" : ",\"parentId\":\"" + parentId + "\"";
        send(post(API + "/categories"), "{\"name\":\"" + name + "\"" + parent + "}").andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ?", UUID.class, name).toString();
    }

    private String operation(String json) throws Exception {
        return id(send(post(API + "/operations"), json));
    }

    private String read(String path) throws Exception {
        return mvc.perform(get(path)).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString();
    }

    private static BigDecimal first(String json, String path) {
        List<Object> values = JsonPath.read(json, path);
        return new BigDecimal(values.getFirst().toString());
    }

    private static BigDecimal amount(String json, String path) {
        return new BigDecimal(JsonPath.read(json, path).toString());
    }

    private void salary(String account) throws Exception {
        send(post(API + "/schedules"), """
                {"label":"Salaire","type":"INCOME","kind":"SALARY","accountId":"%s","incomeKind":"SALARY","amount":2200,
                 "frequency":"MONTHLY","startDate":"2026-11-28"}""".formatted(account)).andExpect(status().isCreated());
    }

    @Test
    void alertsAreDerivedFromBudgetSchedulesForecastAndGoals() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        String loisirs = category("Loisirs", null);
        send(put(API + "/preferences"), """
                {"safetyReserve":5000,"savingsFloor":0,"warningPercent":80}""").andExpect(status().isOk());
        send(put(API + "/budget/2026-10"), """
                {"variableCap":100}""").andExpect(status().isOk());
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-29","amount":120,"label":"Concert",
                 "categoryId":"%s"}""".formatted(courant, loisirs));
        operation("""
                {"accountId":"%s","type":"INCOME","status":"PLANNED","date":"2026-10-20","amount":2000,"label":"Paie",
                 "incomeKind":"SALARY"}""".formatted(courant));
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"PLANNED","date":"2026-10-25","amount":50,"label":"Facture",
                 "categoryId":"%s"}""".formatted(courant, loisirs));
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"PLANNED","date":"2026-11-03","amount":500,"label":"Loyer",
                 "categoryId":"%s","essential":true}""".formatted(courant, loisirs));
        send(post(API + "/goals"), """
                {"name":"Velo","estimatedPrice":5000,"targetDate":"2026-11-15","important":true}""")
                .andExpect(status().isCreated());

        String alerts = read(API + "/alerts");
        assertThat((List<String>) JsonPath.read(alerts, "$[*].code")).containsExactlyInAnyOrder("BUDGET_OVER",
                "INCOME_LATE", "EXPENSES_OVERDUE", "DUE_SOON", "RESERVE_BREACH", "GOAL_NOT_FEASIBLE");
        // Gravite decroissante : les alertes « danger » d'abord, l'information en dernier.
        assertThat((List<String>) JsonPath.read(alerts, "$[*].severity")).containsExactly("DANGER", "DANGER", "DANGER",
                "DANGER", "WARNING", "INFO");
        assertThat(first(alerts, "$[?(@.code=='BUDGET_OVER')].amount")).isEqualByComparingTo("20");
        assertThat((List<Integer>) JsonPath.read(alerts, "$[?(@.code=='BUDGET_OVER')].count")).containsExactly(120);
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='DUE_SOON')].label")).containsExactly("Loyer");
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='INCOME_LATE')].date")).containsExactly("2026-10-20");
        // 880 + 2000 (paie en retard, comptee aujourd'hui) - 50 = 2830, puis - 500 le 03/11.
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='RESERVE_BREACH')].date")).containsExactly("2026-10-30");
        assertThat(first(alerts, "$[?(@.code=='RESERVE_BREACH')].amount")).isEqualByComparingTo("2330");
        assertThat((List<String>) JsonPath.read(alerts, "$[?(@.code=='GOAL_NOT_FEASIBLE')].label")).containsExactly("Velo");
    }

    @Test
    void noAlertWhenEverythingIsUnderControl() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        salary(courant);
        assertThat((List<Object>) JsonPath.read(read(API + "/alerts"), "$")).isEmpty();
    }

    @Test
    void statisticsSummariseCompleteMonthsByCategory() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        String courses = category("Courses", null);
        String supermarche = category("Supermarche", courses);
        String loisirs = category("Loisirs", null);
        String hightech = category("High-tech", null);
        operation("""
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-09-28","amount":2000,"label":"Paie",
                 "incomeKind":"SALARY"}""".formatted(courant));
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-09-10","amount":300,"label":"Plein",
                 "categoryId":"%s"}""".formatted(courant, supermarche));
        operation("""
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-10-28","amount":2000,"label":"Paie",
                 "incomeKind":"SALARY"}""".formatted(courant));
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-05","amount":200,"label":"Marche",
                 "categoryId":"%s"}""".formatted(courant, courses));
        String jeu = operation("""
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-06","amount":100,"label":"Jeu",
                 "categoryId":"%s"}""".formatted(courant, loisirs));
        operation("""
                {"accountId":"%s","type":"PURCHASE_REFUND","status":"COMPLETED","date":"2026-10-07","amount":50,
                 "label":"Retour jeu","categoryId":"%s","refundOfId":"%s"}""".formatted(courant, loisirs, jeu));
        send(put(API + "/budget/2026-10"), """
                {"variableCap":150,"savingsTarget":500}""").andExpect(status().isOk());
        String watch = id(send(post(API + "/goals"), """
                {"name":"Montre","categoryId":"%s","estimatedPrice":400,"targetDate":"2026-11-15"}""".formatted(hightech)));
        send(post(API + "/goals/" + watch + "/purchase"), """
                {"amount":380,"date":"2026-10-30","accountId":"%s"}""".formatted(courant)).andExpect(status().isOk());

        String s = read(API + "/statistics");
        assertThat((String) JsonPath.read(s, "$.from")).isEqualTo("2025-11");
        assertThat((String) JsonPath.read(s, "$.to")).isEqualTo("2026-10");
        assertThat((List<Object>) JsonPath.read(s, "$.months")).hasSize(12);
        // Depenses nettes : 300 + 200 + 100 - 50 + 380 (achat d'objectif).
        assertThat(amount(s, "$.totals.incomeReceived")).isEqualByComparingTo("4000");
        assertThat(amount(s, "$.totals.expensesPaid")).isEqualByComparingTo("930");
        assertThat(amount(s, "$.totals.goalPurchasesPaid")).isEqualByComparingTo("380");
        // Epargne de la periode : ce qui reste des revenus apres les depenses.
        assertThat(amount(s, "$.totals.savedToSavings")).isEqualByComparingTo("0");
        assertThat(amount(s, "$.totals.unspent")).isEqualByComparingTo("3070");
        assertThat(amount(s, "$.totals.averageIncome")).isEqualByComparingTo("333.33");
        assertThat(amount(s, "$.totals.averageExpenses")).isEqualByComparingTo("77.50");
        assertThat((Integer) JsonPath.read(s, "$.totals.savingsRate")).isEqualTo(77);
        assertThat(amount(s, "$.months[11].expensesPaid")).isEqualByComparingTo("630");
        assertThat(amount(s, "$.months[10].incomeReceived")).isEqualByComparingTo("2000");
        // Seuil et objectif du mois : octobre depasse son plafond variable (250 pour 150), septembre n'en a pas.
        assertThat(amount(s, "$.months[11].variableCap")).isEqualByComparingTo("150");
        assertThat(amount(s, "$.months[11].variablePaid")).isEqualByComparingTo("250");
        assertThat(amount(s, "$.months[11].savingsTarget")).isEqualByComparingTo("500");
        assertThat((Object) JsonPath.read(s, "$.months[10].variableCap")).isNull();

        assertThat((List<String>) JsonPath.read(s, "$.categories[*].name")).containsExactly("Courses", "High-tech", "Loisirs");
        assertThat((List<Integer>) JsonPath.read(s, "$.categories[*].percent")).containsExactly(54, 41, 5);
        assertThat(amount(s, "$.categories[0].amount")).isEqualByComparingTo("500");
        assertThat((List<String>) JsonPath.read(s, "$.categories[0].children[*].name")).containsExactly("Supermarche");
        assertThat(amount(s, "$.categories[2].amount")).isEqualByComparingTo("50");

        assertThat((List<String>) JsonPath.read(s, "$.topExpenses[*].label")).containsExactly("Montre", "Plein", "Marche",
                "Jeu");
        assertThat(amount(s, "$.purchases[0].variance")).isEqualByComparingTo("-20");

        mvc.perform(get(API + "/statistics").param("from", "2026-10").param("to", "2026-01"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_PERIOD"));
        mvc.perform(get(API + "/statistics").param("from", "2024-01").param("to", "2026-10"))
                .andExpect(jsonPath("$.code").value("INVALID_PERIOD"));
    }

    @Test
    void aSimulationAppliesHypothesesWithoutWritingAnything() throws Exception {
        String courant = account("Courant", "CURRENT", "100");
        salary(courant);
        String watch = id(send(post(API + "/goals"), """
                {"name":"Montre","estimatedPrice":400,"targetDate":"2026-12-01","important":true}"""));

        // Salaire en baisse de 2 000 : 100 + 200 le 28/11 ne suffisent plus le 01/12.
        String r = send(post(API + "/simulation"), """
                {"salaryDelta":-2000}""").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((List<String>) JsonPath.read(r, "$.baseline.goals[*].verdict")).containsExactly("FEASIBLE");
        assertThat((List<String>) JsonPath.read(r, "$.simulated.goals[*].verdict")).containsExactly("NOT_FEASIBLE");

        // Meme baisse, achat reporte au 29/01/2027 : trois salaires de 200 le rendent possible.
        r = send(post(API + "/simulation"), """
                {"salaryDelta":-2000,"postponements":[{"goalId":"%s","targetDate":"2027-01-29"}]}""".formatted(watch))
                .andReturn().getResponse().getContentAsString();
        assertThat((List<String>) JsonPath.read(r, "$.simulated.goals[*].verdict")).containsExactly("FEASIBLE");
        assertThat((List<String>) JsonPath.read(r, "$.simulated.goals[*].evaluatedDate")).containsExactly("2027-01-29");

        // Achat supplementaire urgent et important : il passe avant la montre et n'est pas finance le 02/11.
        r = send(post(API + "/simulation"), """
                {"extraPurchase":{"name":"Casque","estimatedPrice":150,"targetDate":"2026-11-02","important":true,
                 "urgent":true}}""").andReturn().getResponse().getContentAsString();
        String extra = JsonPath.read(r, "$.extraGoalId");
        assertThat((List<String>) JsonPath.read(r, "$.simulated.goals[*].goalId")).containsExactly(extra, watch);
        assertThat((String) JsonPath.read(r, "$.simulated.goals[0].verdict")).isEqualTo("NOT_FEASIBLE");

        // Exclusion d'un objectif ; hypotheses invalides refusees.
        send(post(API + "/simulation"), """
                {"excludedGoalIds":["%s"]}""".formatted(watch)).andExpect(jsonPath("$.simulated.goals.length()").value(0));
        send(post(API + "/simulation"), """
                {"variableReduction":-10}""").andExpect(jsonPath("$.code").value("INVALID_SIMULATION"));

        // Rien n'a ete enregistre.
        mvc.perform(get(API + "/goals")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get(API + "/goals/" + watch)).andExpect(jsonPath("$.targetDate").value("2026-12-01"));
    }

    @Test
    void theCalendarListsTheMonthWithComputedOccurrencesButNotCancelledOperations() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        String sante = category("Sante", null);
        salary(courant);
        String cancelled = operation("""
                {"accountId":"%s","type":"EXPENSE","status":"PLANNED","date":"2026-11-05","amount":30,"label":"Annulee",
                 "categoryId":"%s"}""".formatted(courant, sante));
        mvc.perform(post(API + "/operations/" + cancelled + "/cancel")).andExpect(status().isOk());
        operation("""
                {"accountId":"%s","type":"EXPENSE","status":"PLANNED","date":"2026-11-12","amount":40,"label":"Dentiste",
                 "categoryId":"%s"}""".formatted(courant, sante));

        String nov = read(API + "/calendar?month=2026-11");
        assertThat((List<String>) JsonPath.read(nov, "$[*].label")).containsExactly("Dentiste", "Salaire");
        assertThat((List<Boolean>) JsonPath.read(nov, "$[*].virtual")).containsExactly(false, true);
        assertThat((String) JsonPath.read(nov, "$[1].date")).isEqualTo("2026-11-28");
    }
}
