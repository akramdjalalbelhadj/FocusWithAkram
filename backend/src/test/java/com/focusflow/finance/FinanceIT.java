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

/**
 * Regles du socle financier, de bout en bout (API, services, contraintes SQL). Aujourd'hui = 30/10/2026 (Paris).
 */
class FinanceIT extends IntegrationTest {

    private static final String API = "/api/v1/finance";

    // ---- Outils ---------------------------------------------------------------------------------

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, String json)
            throws Exception {
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String account(String name, String type, String opening) throws Exception {
        String body = send(post(API + "/accounts"), """
                {"name":"%s","type":"%s","openingBalance":%s}""".formatted(name, type, opening))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String category(String name, String parentId) throws Exception {
        send(post(API + "/categories"), """
                {"name":"%s","parentId":%s,"position":0,"archived":false}"""
                .formatted(name, parentId == null ? "null" : "\"" + parentId + "\""))
                .andExpect(status().isCreated());
        return jdbc.queryForObject("select id from fin_category where name = ? and archived = false "
                + "and parent_id is not distinct from ?", UUID.class, name, parentId == null ? null : UUID.fromString(parentId))
                .toString();
    }

    private String operation(String json) throws Exception {
        String body = send(post(API + "/operations"), json).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String expense(String accountId, String categoryId, String amount, String date, String status,
                           boolean essential, boolean exceptional, String label) throws Exception {
        return operation("""
                {"accountId":"%s","type":"EXPENSE","status":"%s","date":"%s","amount":%s,"label":"%s",
                 "categoryId":"%s","essential":%s,"exceptional":%s}"""
                .formatted(accountId, status, date, amount, label, categoryId, essential, exceptional));
    }

    private BigDecimal balance(String accountId) throws Exception {
        String body = mvc.perform(get(API + "/accounts")).andReturn().getResponse().getContentAsString();
        List<Number> values = JsonPath.read(body, "$[?(@.id=='" + accountId + "')].balance");
        return new BigDecimal(values.getFirst().toString());
    }

    private String overview() throws Exception {
        return mvc.perform(get(API + "/overview").param("month", "2026-10")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static BigDecimal amount(String json, String path) {
        Object v = JsonPath.read(json, path);
        return new BigDecimal(v.toString());
    }

    // ---- Solde reel -----------------------------------------------------------------------------

    @Test
    void onlyCompletedOperationsChangeTheRealBalance() throws Exception {
        String courant = account("Courant", "CURRENT", "1500");
        String courses = category("Courses", null);
        assertThat(balance(courant)).isEqualByComparingTo("1500");

        expense(courant, courses, "40", "2026-10-29", "COMPLETED", false, false, "Marche");
        String planned = expense(courant, courses, "100", "2026-11-05", "PLANNED", false, false, "Courses prevues");
        String cancelled = expense(courant, courses, "25", "2026-10-30", "COMPLETED", false, false, "Erreur");
        mvc.perform(post(API + "/operations/" + cancelled + "/cancel")).andExpect(jsonPath("$.status").value("CANCELLED"));
        operation("""
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-10-30","amount":20,
                 "label":"Cadeau","incomeKind":"GIFT"}""".formatted(courant));

        assertThat(balance(courant)).isEqualByComparingTo("1480");
        mvc.perform(get(API + "/operations/" + planned)).andExpect(jsonPath("$.overdue").value(false));
    }

    @Test
    void negativeOpeningBalanceIsAllowedAndZeroCreatesNoOperation() throws Exception {
        String decouvert = account("Decouvert", "CURRENT", "-20.50");
        String vide = account("Especes", "CASH", "0");
        assertThat(balance(decouvert)).isEqualByComparingTo("-20.50");
        assertThat(balance(vide)).isEqualByComparingTo("0");
        mvc.perform(get(API + "/operations").param("accountId", vide)).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void receivedSalaryKeepsPlannedAmountAndShowsTheGap() throws Exception {
        String courant = account("Courant", "CURRENT", "0");
        String salary = operation("""
                {"accountId":"%s","type":"INCOME","status":"PLANNED","date":"2026-10-28","amount":2200,
                 "label":"Salaire octobre","incomeKind":"SALARY"}""".formatted(courant));
        mvc.perform(get(API + "/operations/" + salary)).andExpect(jsonPath("$.overdue").value(true));
        assertThat(balance(courant)).isEqualByComparingTo("0");

        send(post(API + "/operations/" + salary + "/complete"), """
                {"amount":2150,"date":"2026-10-30"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(2150))
                .andExpect(jsonPath("$.plannedAmount").value(2200))
                .andExpect(jsonPath("$.overdue").value(false));
        assertThat(balance(courant)).isEqualByComparingTo("2150");

        String o = overview();
        assertThat(amount(o, "$.totals.incomeExpected")).isEqualByComparingTo("2200");
        assertThat(amount(o, "$.totals.incomeReceived")).isEqualByComparingTo("2150");

        // Une operation deja realisee ne se realise pas une seconde fois.
        send(post(API + "/operations/" + salary + "/complete"), """
                {"amount":2150,"date":"2026-10-30"}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OPERATION_NOT_PLANNED"));
    }

    @Test
    void transferMovesMoneyWithoutBeingIncomeOrExpense() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        String epargne = account("Livret", "SAVINGS", "0");
        operation("""
                {"accountId":"%s","type":"TRANSFER","status":"COMPLETED","date":"2026-10-30","amount":300,
                 "label":"Epargne du mois","targetAccountId":"%s"}""".formatted(courant, epargne));

        assertThat(balance(courant)).isEqualByComparingTo("700");
        assertThat(balance(epargne)).isEqualByComparingTo("300");
        String o = overview();
        assertThat(amount(o, "$.availableBalance")).isEqualByComparingTo("700");
        assertThat(amount(o, "$.savingsBalance")).isEqualByComparingTo("300");
        assertThat(amount(o, "$.totals.savedToSavings")).isEqualByComparingTo("300");
        assertThat(amount(o, "$.totals.expensesPaid")).isEqualByComparingTo("0");
        assertThat(amount(o, "$.totals.incomeReceived")).isEqualByComparingTo("0");
        // Le compte cible voit le virement dans son historique.
        mvc.perform(get(API + "/operations").param("accountId", epargne)).andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void reconciliationRecordsAVisibleCorrectionOfTheGap() throws Exception {
        String courant = account("Courant", "CURRENT", "1500");
        String body = send(post(API + "/accounts/" + courant + "/reconcile"), """
                {"actualBalance":1450.25,"note":"Frais bancaires non saisis"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ADJUSTMENT"))
                .andExpect(jsonPath("$.direction").value("DEBIT"))
                .andExpect(jsonPath("$.amount").value(49.75))
                .andReturn().getResponse().getContentAsString();
        assertThat(balance(courant)).isEqualByComparingTo("1450.25");

        send(post(API + "/accounts/" + courant + "/reconcile"), """
                {"actualBalance":1450.25}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("ALREADY_RECONCILED"));
        mvc.perform(post(API + "/operations/" + JsonPath.read(body, "$.id") + "/cancel"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("OPERATION_NOT_CANCELLABLE"));
        // La correction ne compte ni comme revenu ni comme depense.
        assertThat(amount(overview(), "$.totals.expensesPaid")).isEqualByComparingTo("0");
    }

    // ---- Validation -----------------------------------------------------------------------------

    @Test
    void inconsistentOperationsAreRejectedWithExplicitCodes() throws Exception {
        String courant = account("Courant", "CURRENT", "100");
        String cat = category("Loisirs", null);
        String base = "\"accountId\":\"" + courant + "\",\"date\":\"2026-10-30\",\"label\":\"x\"";

        send(post(API + "/operations"), "{" + base + ",\"type\":\"EXPENSE\",\"status\":\"COMPLETED\",\"amount\":10,"
                + "\"categoryId\":\"" + cat + "\",\"date\":\"2026-11-02\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("FUTURE_COMPLETED_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"EXPENSE\",\"status\":\"COMPLETED\",\"amount\":10.005,"
                + "\"categoryId\":\"" + cat + "\"}")
                .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"EXPENSE\",\"status\":\"COMPLETED\",\"amount\":10}")
                .andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"INCOME\",\"status\":\"COMPLETED\",\"amount\":10}")
                .andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"INCOME\",\"status\":\"COMPLETED\",\"amount\":10,"
                + "\"incomeKind\":\"BONUS\",\"essential\":true}")
                .andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"TRANSFER\",\"status\":\"COMPLETED\",\"amount\":10,"
                + "\"targetAccountId\":\"" + courant + "\"}")
                .andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"ADJUSTMENT\",\"status\":\"COMPLETED\",\"amount\":10}")
                .andExpect(jsonPath("$.code").value("INVALID_OPERATION"));
        send(post(API + "/operations"), "{" + base + ",\"type\":\"EXPENSE\",\"status\":\"COMPLETED\",\"amount\":0,"
                + "\"categoryId\":\"" + cat + "\"}")
                .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));

        // Une prevision peut etre future ; rien de ce qui precede n'a ete enregistre.
        expense(courant, cat, "10", "2026-12-01", "PLANNED", false, false, "Concert");
        mvc.perform(get(API + "/operations")).andExpect(jsonPath("$.totalItems").value(2));
        assertThat(balance(courant)).isEqualByComparingTo("100");
    }

    // ---- Bilan du mois --------------------------------------------------------------------------

    @Test
    void monthTotalsSeparateEssentialVariableExceptionalRefundsAndSavings() throws Exception {
        String courant = account("Courant", "CURRENT", "3000");
        String livret = account("Livret", "SAVINGS", "0");
        String logement = category("Logement", null);
        String loyer = category("Loyer", logement);
        String restos = category("Restaurants", null);
        String sante = category("Sante", null);

        operation("""
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-10-28","amount":2200,
                 "label":"Salaire","incomeKind":"SALARY"}""".formatted(courant));
        expense(courant, loyer, "500", "2026-10-01", "COMPLETED", true, false, "Loyer");
        String diner = expense(courant, restos, "80", "2026-10-10", "COMPLETED", false, false, "Diner");
        expense(courant, sante, "200", "2026-10-12", "COMPLETED", false, true, "Dentiste");
        expense(courant, restos, "15", "2026-10-31", "PLANNED", false, false, "Cafe prevu");
        operation("""
                {"accountId":"%s","type":"PURCHASE_REFUND","status":"COMPLETED","date":"2026-10-11","amount":30,
                 "label":"Remboursement diner","categoryId":"%s","refundOfId":"%s"}""".formatted(courant, restos, diner));
        operation("""
                {"accountId":"%s","type":"TRANSFER","status":"COMPLETED","date":"2026-10-29","amount":400,
                 "label":"Epargne","targetAccountId":"%s"}""".formatted(courant, livret));
        // Hors du mois : ignore.
        expense(courant, restos, "999", "2026-09-30", "COMPLETED", false, false, "Septembre");

        String o = overview();
        assertThat(amount(o, "$.totals.incomeReceived")).isEqualByComparingTo("2200");
        assertThat(amount(o, "$.totals.expensesPaid")).isEqualByComparingTo("750"); // 500 + 80 + 200 - 30
        assertThat(amount(o, "$.totals.essentialPaid")).isEqualByComparingTo("500");
        assertThat(amount(o, "$.totals.variablePaid")).isEqualByComparingTo("250"); // 80 + 200 - 30
        assertThat(amount(o, "$.totals.exceptionalPaid")).isEqualByComparingTo("200");
        assertThat(amount(o, "$.totals.refunds")).isEqualByComparingTo("30");
        assertThat(amount(o, "$.totals.expensesPlanned")).isEqualByComparingTo("15");
        assertThat(amount(o, "$.totals.savedToSavings")).isEqualByComparingTo("400");
        assertThat(amount(o, "$.totals.unspent")).isEqualByComparingTo("1050"); // 2200 - 750 - 400
        // Par categorie racine, nettes des remboursements, de la plus couteuse a la moins couteuse.
        assertThat((List<String>) JsonPath.read(o, "$.byCategory[*].name")).containsExactly("Logement", "Sante", "Restaurants");
        assertThat(amount(o, "$.byCategory[2].amount")).isEqualByComparingTo("50");
        // Soldes : 3000 - 999 + 2200 - 500 - 80 - 200 + 30 - 400 = 3051 disponibles, 400 epargnes.
        assertThat(amount(o, "$.availableBalance")).isEqualByComparingTo("3051");
        assertThat(amount(o, "$.savingsBalance")).isEqualByComparingTo("400");
        assertThat((Integer) JsonPath.read(o, "$.upcoming.length()")).isEqualTo(1);
    }

    // ---- Categories -----------------------------------------------------------------------------

    @Test
    void categoriesHaveTwoLevelsAndUsedOnesAreArchivedNotDeleted() throws Exception {
        String courant = account("Courant", "CURRENT", "100");
        String abonnements = category("Abonnements", null);
        String claude = category("Claude", abonnements);
        send(post(API + "/categories"), """
                {"name":"Pro","parentId":"%s","position":0,"archived":false}""".formatted(claude))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CATEGORY_DEPTH"));
        send(post(API + "/categories"), """
                {"name":"claude","parentId":"%s","position":0,"archived":false}""".formatted(abonnements))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_NAME_TAKEN"));
        category("Claude", null); // meme nom a un autre niveau : autorise

        String op = expense(courant, claude, "21.60", "2026-10-15", "COMPLETED", false, false, "Claude Pro");
        mvc.perform(delete(API + "/categories/" + claude))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CATEGORY_IN_USE"));

        // Archiver la racine archive ses sous-categories ; l'historique reste lisible.
        send(put(API + "/categories/" + abonnements), """
                {"name":"Abonnements","position":0,"archived":true}""").andExpect(status().isOk());
        mvc.perform(get(API + "/operations/" + op))
                .andExpect(jsonPath("$.category.name").value("Claude"))
                .andExpect(jsonPath("$.category.rootName").value("Abonnements"));
        assertThat(jdbc.queryForObject("select archived from fin_category where id = ?", Boolean.class, UUID.fromString(claude)))
                .isTrue();
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"EXPENSE","status":"COMPLETED","date":"2026-10-30","amount":5,"label":"x",
                 "categoryId":"%s"}""".formatted(courant, claude))
                .andExpect(jsonPath("$.code").value("CATEGORY_ARCHIVED"));

        // Une categorie inutilisee se supprime.
        String vide = category("Vide", null);
        mvc.perform(delete(API + "/categories/" + vide)).andExpect(status().isNoContent());
    }

    // ---- Historique -----------------------------------------------------------------------------

    @Test
    void historyFiltersByPeriodCategoryTreeEssentialTextAndPages() throws Exception {
        String courant = account("Courant", "CURRENT", "1000");
        String courses = category("Courses", null);
        String alim = category("Alimentation", courses);
        String loisirs = category("Loisirs", null);
        expense(courant, alim, "30", "2026-10-02", "COMPLETED", true, false, "Supermarche");
        expense(courant, courses, "12", "2026-10-20", "COMPLETED", false, false, "Lessive");
        expense(courant, loisirs, "45", "2026-10-21", "COMPLETED", false, false, "Cinema et diner");
        expense(courant, loisirs, "60", "2026-09-21", "COMPLETED", false, false, "Concert");

        mvc.perform(get(API + "/operations").param("categoryId", courses))
                .andExpect(jsonPath("$.totalItems").value(2));
        mvc.perform(get(API + "/operations").param("from", "2026-10-01").param("to", "2026-10-31")
                        .param("type", "EXPENSE"))
                .andExpect(jsonPath("$.totalItems").value(3));
        mvc.perform(get(API + "/operations").param("essential", "true"))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].label").value("Supermarche"));
        mvc.perform(get(API + "/operations").param("q", "DINER"))
                .andExpect(jsonPath("$.items[0].label").value("Cinema et diner"));
        mvc.perform(get(API + "/operations").param("minAmount", "40").param("maxAmount", "50"))
                .andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get(API + "/operations").param("type", "EXPENSE").param("size", "2").param("page", "0"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items[0].date").value("2026-10-21"));
    }

    @Test
    void probableDuplicatesAreFoundNearTheSameDateAndAmount() throws Exception {
        String courant = account("Courant", "CURRENT", "100");
        String cat = category("Restaurants", null);
        String existing = expense(courant, cat, "12.50", "2026-10-29", "COMPLETED", false, false, "Midi");
        mvc.perform(get(API + "/operations/duplicates").param("accountId", courant).param("type", "EXPENSE")
                        .param("amount", "12.5").param("date", "2026-10-30"))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get(API + "/operations/duplicates").param("accountId", courant).param("type", "EXPENSE")
                        .param("amount", "12.5").param("date", "2026-10-30").param("excludeId", existing))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get(API + "/operations/duplicates").param("accountId", courant).param("type", "EXPENSE")
                        .param("amount", "12.5").param("date", "2026-11-05"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ---- Comptes --------------------------------------------------------------------------------

    @Test
    void accountsWithMoneyOrHistoryAreProtected() throws Exception {
        String courant = account("Courant", "CURRENT", "50");
        send(post(API + "/accounts"), """
                {"name":"courant","type":"CASH"}""")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ACCOUNT_NAME_TAKEN"));
        send(put(API + "/accounts/" + courant), """
                {"name":"Courant","type":"CURRENT","archived":true,"position":0}""")
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("ACCOUNT_NOT_EMPTY"));
        mvc.perform(delete(API + "/accounts/" + courant))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ACCOUNT_IN_USE"));

        String vide = account("Nouveau", "CASH", "0");
        mvc.perform(delete(API + "/accounts/" + vide)).andExpect(status().isNoContent());

        // Un compte archive ne recoit plus de nouvelles operations.
        send(post(API + "/accounts/" + courant + "/reconcile"), """
                {"actualBalance":0}""").andExpect(status().isCreated());
        send(put(API + "/accounts/" + courant), """
                {"name":"Courant","type":"CURRENT","archived":true,"position":0}""").andExpect(status().isOk());
        send(post(API + "/operations"), """
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-10-30","amount":5,"label":"x",
                 "incomeKind":"OTHER"}""".formatted(courant))
                .andExpect(jsonPath("$.code").value("ACCOUNT_ARCHIVED"));
    }

    @Test
    void openingBalanceCannotBeDeletedButOtherEntryErrorsCan() throws Exception {
        String courant = account("Courant", "CURRENT", "100");
        String opening = jdbc.queryForObject("select id from fin_operation where type = 'OPENING_BALANCE'", UUID.class).toString();
        mvc.perform(delete(API + "/operations/" + opening))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("OPERATION_NOT_DELETABLE"));
        String gift = operation("""
                {"accountId":"%s","type":"INCOME","status":"COMPLETED","date":"2026-10-30","amount":5,"label":"Erreur",
                 "incomeKind":"OTHER"}""".formatted(courant));
        mvc.perform(delete(API + "/operations/" + gift)).andExpect(status().isNoContent());
        assertThat(balance(courant)).isEqualByComparingTo("100");
    }

    // ---- Sauvegarde -----------------------------------------------------------------------------

    @Test
    void backupV3RoundTripRestoresFinanceWithoutDuplicates() throws Exception {
        String courant = account("Courant", "CURRENT", "1500");
        String livret = account("Livret", "SAVINGS", "200");
        String restos = category("Restaurants", null);
        String cafes = category("Cafes", restos);
        String salary = operation("""
                {"accountId":"%s","type":"INCOME","status":"PLANNED","date":"2026-10-28","amount":2200,
                 "label":"Salaire","incomeKind":"SALARY"}""".formatted(courant));
        send(post(API + "/operations/" + salary + "/complete"), """
                {"amount":2150,"date":"2026-10-29"}""").andExpect(status().isOk());
        String diner = expense(courant, cafes, "40", "2026-10-10", "COMPLETED", false, true, "Diner");
        operation("""
                {"accountId":"%s","type":"PURCHASE_REFUND","status":"COMPLETED","date":"2026-10-11","amount":10,
                 "label":"Geste commercial","categoryId":"%s","refundOfId":"%s"}""".formatted(courant, cafes, diner));
        operation("""
                {"accountId":"%s","type":"TRANSFER","status":"COMPLETED","date":"2026-10-30","amount":300,
                 "label":"Epargne","targetAccountId":"%s"}""".formatted(courant, livret));
        send(post(API + "/accounts/" + courant + "/reconcile"), """
                {"actualBalance":3300}""").andExpect(status().isCreated());
        BigDecimal courantBefore = balance(courant);
        BigDecimal livretBefore = balance(livret);

        String backup = mvc.perform(get("/api/v1/export/backup")).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat((Integer) JsonPath.read(backup, "$.version")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(backup, "$.finance.operations.length()")).isEqualTo(7);

        resetState();
        send(post("/api/v1/import"), backup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.finance.accountsCreated").value(2))
                .andExpect(jsonPath("$.finance.categoriesCreated").value(2))
                .andExpect(jsonPath("$.finance.operationsCreated").value(7));
        assertThat(balance(courant)).isEqualByComparingTo(courantBefore);
        assertThat(balance(livret)).isEqualByComparingTo(livretBefore);
        mvc.perform(get(API + "/operations/" + salary))
                .andExpect(jsonPath("$.plannedAmount").value(2200))
                .andExpect(jsonPath("$.amount").value(2150));
        mvc.perform(get(API + "/operations").param("type", "PURCHASE_REFUND"))
                .andExpect(jsonPath("$.items[0].refundOfId").value(diner))
                .andExpect(jsonPath("$.items[0].category.rootName").value("Restaurants"));

        // Reimport : rien n'est duplique.
        send(post("/api/v1/import"), backup)
                .andExpect(jsonPath("$.finance.operationsCreated").value(0))
                .andExpect(jsonPath("$.finance.operationsSkipped").value(7))
                .andExpect(jsonPath("$.finance.accountsReused").value(2))
                .andExpect(jsonPath("$.finance.categoriesReused").value(2));
        assertThat(balance(courant)).isEqualByComparingTo(courantBefore);

        // Une sauvegarde v2 (sans finances) reste importable et ne touche pas aux finances.
        send(post("/api/v1/import"), """
                {"version":2,"tasks":[],"projects":[],"sessions":[]}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.finance").doesNotExist());
        assertThat(balance(courant)).isEqualByComparingTo(courantBefore);
    }

    @Test
    void invalidFinanceItemsAreReportedWithoutBlockingTheOthers() throws Exception {
        String file = """
                {"version":3,"finance":{
                  "accounts":[{"id":"00000000-0000-0000-0000-0000000000a1","name":"Courant","type":"CURRENT"}],
                  "categories":[{"id":"00000000-0000-0000-0000-0000000000c1","name":"Loisirs"}],
                  "operations":[
                   {"id":"00000000-0000-0000-0000-0000000000f1","accountId":"00000000-0000-0000-0000-0000000000a1",
                    "type":"EXPENSE","status":"COMPLETED","direction":"DEBIT","date":"2026-10-01","amount":12.345,
                    "label":"Trop de decimales","categoryId":"00000000-0000-0000-0000-0000000000c1"},
                   {"id":"00000000-0000-0000-0000-0000000000f2","accountId":"00000000-0000-0000-0000-0000000000a1",
                    "type":"EXPENSE","status":"COMPLETED","direction":"DEBIT","date":"2026-10-01","amount":12,
                    "label":"Sans categorie"},
                   {"id":"00000000-0000-0000-0000-0000000000f3","accountId":"00000000-0000-0000-0000-0000000000a1",
                    "type":"EXPENSE","status":"COMPLETED","direction":"DEBIT","date":"2026-12-01","amount":12,
                    "label":"Dans le futur","categoryId":"00000000-0000-0000-0000-0000000000c1"},
                   {"id":"00000000-0000-0000-0000-0000000000f4","accountId":"00000000-0000-0000-0000-0000000000a1",
                    "type":"EXPENSE","status":"COMPLETED","direction":"DEBIT","date":"2026-10-02","amount":20,
                    "label":"Valide","categoryId":"00000000-0000-0000-0000-0000000000c1"}]}}""";
        send(post("/api/v1/import"), file)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.finance.operationsCreated").value(1))
                .andExpect(jsonPath("$.errors.length()").value(3));
        assertThat(balance("00000000-0000-0000-0000-0000000000a1")).isEqualByComparingTo("-20");
    }
}
