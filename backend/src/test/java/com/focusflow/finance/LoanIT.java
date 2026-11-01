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
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Prets accordes et emprunts. Aujourd'hui = 30/10/2026 (Paris). */
class LoanIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    private ResultActions send(MockHttpServletRequestBuilder req, String json) throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String account(String opening) throws Exception {
        return JsonPath.read(send(post(API + "/accounts"), """
                {"name":"Courant","type":"CURRENT","openingBalance":%s}""".formatted(opening))
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private String loan(String json) throws Exception {
        return JsonPath.read(send(post(API + "/loans"), json).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private BigDecimal balance(String accountId) throws Exception {
        String body = mvc.perform(get(API + "/accounts")).andReturn().getResponse().getContentAsString();
        List<Number> values = JsonPath.read(body, "$[?(@.id=='" + accountId + "')].balance");
        return new BigDecimal(values.getFirst().toString());
    }

    private String overview() throws Exception {
        return mvc.perform(get(API + "/overview").param("month", "2026-10")).andReturn().getResponse().getContentAsString();
    }

    private static BigDecimal amount(String json, String path) {
        return new BigDecimal(JsonPath.read(json, path).toString());
    }

    @Test
    void partialRepaymentsReduceWhatIsOwedWithoutBeingIncome() throws Exception {
        String courant = account("1000");
        String loan = loan("""
                {"person":"Sami","direction":"LENT","amount":300,"startDate":"2026-10-01","dueDate":"2026-12-31",
                 "accountId":"%s"}""".formatted(courant));
        assertThat(balance(courant)).isEqualByComparingTo("700");

        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":100,"date":"2026-10-15","accountId":"%s"}""".formatted(courant))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.remaining").value(200));
        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":150,"date":"2026-10-28","accountId":"%s"}""".formatted(courant))
                .andExpect(jsonPath("$.repaid").value(250))
                .andExpect(jsonPath("$.remaining").value(50))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.movements.length()").value(3));
        assertThat(balance(courant)).isEqualByComparingTo("950");

        String o = overview();
        // Ni depense (le pret) ni revenu (les remboursements).
        assertThat(amount(o, "$.totals.expensesPaid")).isEqualByComparingTo("0");
        assertThat(amount(o, "$.totals.incomeReceived")).isEqualByComparingTo("0");
        assertThat(amount(o, "$.receivables")).isEqualByComparingTo("50");

        // On ne rembourse pas plus que le reste du.
        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":60,"date":"2026-10-30","accountId":"%s"}""".formatted(courant))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("REPAYMENT_EXCEEDS_REMAINING"));
    }

    @Test
    void theRemainderCanBeExplicitlyWrittenOffWithoutMovingMoney() throws Exception {
        String courant = account("1000");
        String loan = loan("""
                {"person":"Lea","direction":"LENT","amount":300,"startDate":"2026-10-01","accountId":"%s"}""".formatted(courant));
        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":250,"date":"2026-10-20","accountId":"%s"}""".formatted(courant)).andExpect(status().isCreated());
        send(post(API + "/loans/" + loan + "/write-off"), """
                {"reason":"Geste amical"}""")
                .andExpect(jsonPath("$.status").value("WRITTEN_OFF"))
                .andExpect(jsonPath("$.writtenOffAmount").value(50))
                .andExpect(jsonPath("$.remaining").value(0));
        assertThat(balance(courant)).isEqualByComparingTo("950");
        assertThat(amount(overview(), "$.receivables")).isEqualByComparingTo("0");
        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":10,"date":"2026-10-30","accountId":"%s"}""".formatted(courant))
                .andExpect(jsonPath("$.code").value("LOAN_WRITTEN_OFF"));
    }

    @Test
    void aBorrowedAmountIsAvailableButItsRepaymentIsForecastAtItsDueDate() throws Exception {
        String courant = account("200");
        String loan = loan("""
                {"person":"Banque familiale","direction":"BORROWED","amount":500,"startDate":"2026-10-20",
                 "dueDate":"2026-11-20","accountId":"%s"}""".formatted(courant));
        assertThat(balance(courant)).isEqualByComparingTo("700");
        assertThat(amount(overview(), "$.debts")).isEqualByComparingTo("500");

        // Le remboursement du 20/11 fait retomber le disponible a 200 : un achat de 400 n'est pas realisable.
        String forecast = mvc.perform(get(API + "/forecast")).andReturn().getResponse().getContentAsString();
        assertThat(amount(forecast, "$.lowest.afterGoals")).isEqualByComparingTo("200");
        send(post(API + "/goals"), """
                {"name":"Tablette","estimatedPrice":400,"targetDate":"2026-11-05","important":true}""")
                .andExpect(jsonPath("$.feasibility.verdict").value("NOT_FEASIBLE"));

        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":500,"date":"2026-10-30","accountId":"%s"}""".formatted(courant))
                .andExpect(jsonPath("$.status").value("SETTLED"));
        assertThat(balance(courant)).isEqualByComparingTo("200");
    }

    @Test
    void expectedRepaymentsAreShownButNeverCountedAsAvailable() throws Exception {
        String courant = account("100");
        loan("""
                {"person":"Sami","direction":"LENT","amount":300,"startDate":"2026-09-01","dueDate":"2026-11-15",
                 "recordDisbursement":false}""");
        // Pret anterieur au suivi : aucun mouvement, le solde ne change pas.
        assertThat(balance(courant)).isEqualByComparingTo("100");
        String forecast = mvc.perform(get(API + "/forecast")).andReturn().getResponse().getContentAsString();
        assertThat(amount(forecast, "$.expectedRepayments")).isEqualByComparingTo("300");
        assertThat(amount(forecast, "$.lowest.afterGoals")).isEqualByComparingTo("100");
    }

    @Test
    void overdueLoansAreFlaggedAndCancellingRemovesTheirEffect() throws Exception {
        String courant = account("1000");
        String loan = loan("""
                {"person":"Karim","direction":"LENT","amount":200,"startDate":"2026-09-01","dueDate":"2026-10-01",
                 "accountId":"%s"}""".formatted(courant));
        mvc.perform(get(API + "/loans/" + loan)).andExpect(jsonPath("$.overdue").value(true));
        send(put(API + "/loans/" + loan), """
                {"person":"Karim B.","dueDate":"2026-12-01","notes":"Relance faite"}""")
                .andExpect(jsonPath("$.overdue").value(false))
                .andExpect(jsonPath("$.person").value("Karim B."));
        assertThat(balance(courant)).isEqualByComparingTo("800");
        mvc.perform(post(API + "/loans/" + loan + "/cancel")).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(balance(courant)).isEqualByComparingTo("1000");
    }

    @Test
    void loanMovementsCannotBeEnteredOrEditedAsOrdinaryOperations() throws Exception {
        String courant = account("100");
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"LOAN_GIVEN","status":"COMPLETED","date":"2026-10-30","amount":50,"label":"x"}"""
                .formatted(courant))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/loans"), """
                {"person":"Sans compte","direction":"LENT","amount":50,"startDate":"2026-10-30"}""")
                .andExpect(jsonPath("$.code").value("INVALID_LOAN"));
        send(post(API + "/loans"), """
                {"person":"Futur","direction":"LENT","amount":50,"startDate":"2026-11-30","accountId":"%s"}"""
                .formatted(courant))
                .andExpect(jsonPath("$.code").value("INVALID_LOAN"));
    }

    @Test
    void loansSurviveABackupRoundTrip() throws Exception {
        String courant = account("1000");
        String loan = loan("""
                {"person":"Sami","direction":"LENT","amount":300,"startDate":"2026-10-01","accountId":"%s"}""".formatted(courant));
        send(post(API + "/loans/" + loan + "/repayments"), """
                {"amount":100,"date":"2026-10-15","accountId":"%s"}""".formatted(courant)).andExpect(status().isCreated());
        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.finance.loansCreated").value(1));
        mvc.perform(get(API + "/loans/" + loan))
                .andExpect(jsonPath("$.remaining").value(200))
                .andExpect(jsonPath("$.movements.length()").value(2));
        assertThat(balance(courant)).isEqualByComparingTo("800");
        send(post("/api/v1/import"), backup).andExpect(jsonPath("$.finance.loansSkipped").value(1));
        assertThat(balance(courant)).isEqualByComparingTo("800");
    }
}
