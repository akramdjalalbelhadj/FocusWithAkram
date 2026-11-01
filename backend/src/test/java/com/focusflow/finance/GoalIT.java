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

/** Objectifs d'achat et faisabilite, de bout en bout. Aujourd'hui = 30/10/2026 (Paris). */
class GoalIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    private ResultActions send(MockHttpServletRequestBuilder req, String json) throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String account(String opening) throws Exception {
        return JsonPath.read(send(post(API + "/accounts"), """
                {"name":"Courant","type":"CURRENT","openingBalance":%s}""".formatted(opening))
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String category(String name) throws Exception {
        send(post(API + "/categories"), "{\"name\":\"" + name + "\"}").andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ?", UUID.class, name).toString();
    }

    private void salary(String account) throws Exception {
        send(post(API + "/schedules"), """
                {"label":"Salaire","type":"INCOME","kind":"SALARY","accountId":"%s","incomeKind":"SALARY","amount":2200,
                 "frequency":"MONTHLY","startDate":"2026-11-28"}""".formatted(account)).andExpect(status().isCreated());
    }

    private String goal(String json) throws Exception {
        return JsonPath.read(send(post(API + "/goals"), json).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String getGoal(String id) throws Exception {
        return mvc.perform(get(API + "/goals/" + id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void anAmbitiousGoalIsSavedWithItsRealisticDateAndAlternatives() throws Exception {
        String courant = account("100");
        salary(courant);
        String watch = goal("""
                {"name":"Samsung Galaxy Watch","estimatedPrice":400,"maxPrice":450,"targetDate":"2026-11-05",
                 "important":true,"urgent":false}""");
        String body = getGoal(watch);
        // 100 disponibles le 05/11 ; le salaire du 28/11 rend l'achat possible.
        assertThat((String) JsonPath.read(body, "$.feasibility.verdict")).isEqualTo("NOT_FEASIBLE");
        assertThat((String) JsonPath.read(body, "$.feasibility.feasibleDate")).isEqualTo("2026-11-28");
        assertThat((String) JsonPath.read(body, "$.quadrant")).isEqualTo("Q2");
        assertThat(new BigDecimal(JsonPath.read(body, "$.feasibility.affordableAtDate").toString())).isEqualByComparingTo("100");
        // Effort d'epargne supplementaire : 300 manquants sur un mois.
        assertThat(new BigDecimal(JsonPath.read(body, "$.feasibility.monthlyEffort").toString())).isEqualByComparingTo("300");
        assertThat((List<String>) JsonPath.read(body, "$.feasibility.notes")).contains("NO_CAP");

        // Apercu d'un report au 01/12 : realisable, sans rien enregistrer.
        send(post(API + "/goals/preview").param("id", watch), """
                {"name":"Samsung Galaxy Watch","estimatedPrice":400,"targetDate":"2026-12-01","important":true}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verdict").value("FEASIBLE"));
        assertThat((String) JsonPath.read(getGoal(watch), "$.targetDate")).isEqualTo("2026-11-05");
        // Aucun achat planifie ne cree d'operation.
        mvc.perform(get(API + "/operations")).andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void thePurchaseIsARealExpenseOutsideTheVariableCap() throws Exception {
        String courant = account("1000");
        String high = category("High-tech");
        send(put(API + "/budget/2026-10"), """
                {"variableCap":100}""").andExpect(status().isOk());
        String watch = goal("""
                {"name":"Montre","categoryId":"%s","estimatedPrice":400,"targetDate":"2026-11-15"}""".formatted(high));
        send(put(API + "/goals/" + watch + "/reservation"), """
                {"amount":200}""").andExpect(jsonPath("$.reservedAmount").value(200));

        send(post(API + "/goals/" + watch + "/purchase"), """
                {"amount":380,"date":"2026-10-30","accountId":"%s"}""".formatted(courant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PURCHASED"))
                .andExpect(jsonPath("$.purchasedAmount").value(380))
                .andExpect(jsonPath("$.reservedAmount").value(0))
                .andExpect(jsonPath("$.feasibility").doesNotExist());
        String budget = mvc.perform(get(API + "/budget").param("month", "2026-10")).andReturn().getResponse().getContentAsString();
        assertThat(new BigDecimal(JsonPath.read(budget, "$.totals.expensesPaid").toString())).isEqualByComparingTo("380");
        assertThat(new BigDecimal(JsonPath.read(budget, "$.totals.goalPurchasesPaid").toString())).isEqualByComparingTo("380");
        assertThat(new BigDecimal(JsonPath.read(budget, "$.totals.variablePaid").toString())).isEqualByComparingTo("0");
        assertThat((String) JsonPath.read(budget, "$.state")).isEqualTo("OK");
        // Un objectif achete ne se rachete pas et ne se supprime pas.
        send(post(API + "/goals/" + watch + "/purchase"), """
                {"amount":380,"date":"2026-10-30","accountId":"%s"}""".formatted(courant))
                .andExpect(jsonPath("$.code").value("GOAL_CLOSED"));
        mvc.perform(delete(API + "/goals/" + watch)).andExpect(jsonPath("$.code").value("GOAL_PURCHASED"));
    }

    @Test
    void reservationsCannotExceedFreeFundsNorBeCountedTwice() throws Exception {
        account("1000");
        send(put(API + "/preferences"), """
                {"safetyReserve":200,"savingsFloor":0,"warningPercent":80}""").andExpect(status().isOk());
        String a = goal("""
                {"name":"Velo","estimatedPrice":900,"targetDate":"2027-03-01"}""");
        String b = goal("""
                {"name":"Casque","estimatedPrice":500,"targetDate":"2027-03-01"}""");
        // Libre : 1000 - 200 de reserve de securite = 800.
        send(put(API + "/goals/" + a + "/reservation"), """
                {"amount":850}""").andExpect(jsonPath("$.code").value("RESERVATION_EXCEEDS_FREE_FUNDS"));
        send(put(API + "/goals/" + a + "/reservation"), """
                {"amount":500}""").andExpect(status().isOk());
        // Plus que 300 de libre pour le second objectif.
        send(put(API + "/goals/" + b + "/reservation"), """
                {"amount":400}""").andExpect(jsonPath("$.code").value("RESERVATION_EXCEEDS_FREE_FUNDS"));
        send(put(API + "/goals/" + b + "/reservation"), """
                {"amount":1000}""").andExpect(jsonPath("$.code").value("INVALID_RESERVATION"));
        // Abandonner libere la reservation.
        mvc.perform(post(API + "/goals/" + a + "/abandon")).andExpect(jsonPath("$.reservedAmount").value(0));
        send(put(API + "/goals/" + b + "/reservation"), """
                {"amount":500}""").andExpect(status().isOk());
    }

    @Test
    void priorityDecidesWhoGetsTheMoneyAndTheMatrixChangesIt() throws Exception {
        account("1000");
        String phone = goal("""
                {"name":"Telephone","estimatedPrice":600,"targetDate":"2026-11-20","important":true,"urgent":true}""");
        String console = goal("""
                {"name":"Console","estimatedPrice":600,"targetDate":"2026-11-10"}""");
        // Q1 avant Q4, meme si la console est plus proche : le telephone est servi en premier.
        assertThat((String) JsonPath.read(getGoal(phone), "$.feasibility.verdict")).isEqualTo("FEASIBLE");
        assertThat((String) JsonPath.read(getGoal(console), "$.feasibility.verdict")).isEqualTo("NOT_FEASIBLE");

        send(put(API + "/goals/" + console + "/position"), """
                {"important":true,"urgent":true,"position":0}""")
                .andExpect(jsonPath("$.quadrant").value("Q1"));
        // Les deux en Q1 : la date cible la plus proche passe d'abord.
        assertThat((String) JsonPath.read(getGoal(console), "$.feasibility.verdict")).isEqualTo("FEASIBLE");
        assertThat((String) JsonPath.read(getGoal(phone), "$.feasibility.verdict")).isEqualTo("NOT_FEASIBLE");

        mvc.perform(get(API + "/forecast"))
                .andExpect(jsonPath("$.goals.length()").value(2))
                .andExpect(jsonPath("$.lowest.afterGoals").value(400))
                .andExpect(jsonPath("$.capDefined").value(false));
    }

    @Test
    void goalsFollowTheirLifecycle() throws Exception {
        account("100");
        String g = goal("""
                {"name":"Sac","estimatedPrice":80,"targetDate":"2026-12-01","status":"CONSIDERED"}""");
        mvc.perform(post(API + "/goals/" + g + "/postpone").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetDate\":\"2027-02-01\"}"))
                .andExpect(jsonPath("$.status").value("POSTPONED"))
                .andExpect(jsonPath("$.targetDate").value("2027-02-01"));
        mvc.perform(post(API + "/goals/" + g + "/abandon")).andExpect(jsonPath("$.status").value("ABANDONED"));
        mvc.perform(post(API + "/goals/" + g + "/reopen")).andExpect(jsonPath("$.status").value("CONSIDERED"));
        send(post(API + "/goals"), """
                {"name":"Incoherent","estimatedPrice":100,"maxPrice":50,"targetDate":"2026-12-01"}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_GOAL"));
        send(post(API + "/goals"), """
                {"name":"Deja achete","estimatedPrice":100,"targetDate":"2026-12-01","status":"PURCHASED"}""")
                .andExpect(jsonPath("$.code").value("INVALID_GOAL"));
        mvc.perform(delete(API + "/goals/" + g)).andExpect(status().isNoContent());
    }

    @Test
    void goalsAndTheirPurchaseSurviveABackupRoundTrip() throws Exception {
        String courant = account("1000");
        String cat = category("Maison");
        String bought = goal("""
                {"name":"Aspirateur","categoryId":"%s","estimatedPrice":200,"targetDate":"2026-11-01"}""".formatted(cat));
        send(post(API + "/goals/" + bought + "/purchase"), """
                {"amount":180,"date":"2026-10-29","accountId":"%s"}""".formatted(courant)).andExpect(status().isOk());
        String open = goal("""
                {"name":"Lampe","estimatedPrice":60,"targetDate":"2026-12-01","important":true}""");
        send(put(API + "/goals/" + open + "/reservation"), "{\"amount\":30}").andExpect(status().isOk());
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.finance.goalsCreated").value(2));
        String restored = getGoal(bought);
        assertThat((String) JsonPath.read(restored, "$.status")).isEqualTo("PURCHASED");
        assertThat(new BigDecimal(JsonPath.read(restored, "$.purchasedAmount").toString())).isEqualByComparingTo("180");
        assertThat(new BigDecimal(JsonPath.read(getGoal(open), "$.reservedAmount").toString())).isEqualByComparingTo("30");
        String budget = mvc.perform(get(API + "/budget").param("month", "2026-10")).andReturn().getResponse().getContentAsString();
        assertThat(new BigDecimal(JsonPath.read(budget, "$.totals.goalPurchasesPaid").toString())).isEqualByComparingTo("180");
    }
}
