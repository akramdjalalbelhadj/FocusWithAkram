package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;

import com.focusflow.support.IntegrationTest;
import java.math.BigDecimal;
import java.sql.Connection;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Migration V8 (un seul compte, plus de suivi des prets) appliquee a une base remplie au schema V7, dans une base
 * dediee du meme serveur PostgreSQL embarque.
 */
class SingleAccountMigrationIT extends IntegrationTest {

    private static final String DB = "migration_v8_it";

    @Test
    void accountsAreMergedTransfersDroppedAndLoansBecomeLoansCategoryOperations() throws Exception {
        String url;
        String user;
        try (Connection c = jdbc.getDataSource().getConnection()) {
            url = c.getMetaData().getURL();
            user = c.getMetaData().getUserName();
        }
        jdbc.execute("DROP DATABASE IF EXISTS " + DB);
        jdbc.execute("CREATE DATABASE " + DB);
        DriverManagerDataSource ds = new DriverManagerDataSource(url.substring(0, url.lastIndexOf('/') + 1) + DB, user, "");
        try {
            Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("7").load().migrate();
            JdbcTemplate db = new JdbcTemplate(ds);
            db.execute("""
                    INSERT INTO fin_account (id, name, type, position, created_at) VALUES
                      ('00000000-0000-0000-0000-0000000000a1', 'Courant', 'CURRENT', 0, now() - interval '2 days'),
                      ('00000000-0000-0000-0000-0000000000a2', 'Livret', 'SAVINGS', 1, now() - interval '1 day');
                    INSERT INTO fin_loan (id, person, direction, principal, start_date, created_at, updated_at) VALUES
                      ('00000000-0000-0000-0000-0000000000d1', 'Sami', 'LENT', 100, '2026-10-02', now(), now());
                    INSERT INTO fin_operation (id, account_id, target_account_id, type, status, direction, operation_date,
                                               amount, label, income_kind, loan_id, created_at, updated_at) VALUES
                      ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', NULL,
                       'OPENING_BALANCE', 'COMPLETED', 'CREDIT', '2026-10-01', 1000, 'Solde initial', NULL, NULL, now(), now()),
                      ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a2', NULL,
                       'OPENING_BALANCE', 'COMPLETED', 'CREDIT', '2026-10-01', 500, 'Solde initial', NULL, NULL, now(), now()),
                      ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a1',
                       '00000000-0000-0000-0000-0000000000a2', 'TRANSFER', 'COMPLETED', 'DEBIT', '2026-10-03', 200,
                       'Epargne', NULL, NULL, now(), now()),
                      ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a1', NULL,
                       'LOAN_GIVEN', 'COMPLETED', 'DEBIT', '2026-10-02', 100, 'Pret a Sami', NULL,
                       '00000000-0000-0000-0000-0000000000d1', now(), now()),
                      ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a2', NULL,
                       'LOAN_COLLECTED', 'COMPLETED', 'CREDIT', '2026-10-20', 40, 'Remboursement de Sami', NULL,
                       '00000000-0000-0000-0000-0000000000d1', now(), now()),
                      ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000a2', NULL,
                       'INCOME', 'COMPLETED', 'CREDIT', '2026-10-15', 3, 'Interets', 'OTHER', NULL, now(), now());
                    INSERT INTO fin_schedule (id, label, type, kind, account_id, income_kind, amount, frequency,
                                              start_date, status, created_at, updated_at) VALUES
                      ('00000000-0000-0000-0000-0000000000e1', 'Interets', 'INCOME', 'OTHER',
                       '00000000-0000-0000-0000-0000000000a2', 'OTHER', 3, 'MONTHLY', '2026-11-15', 'ACTIVE', now(), now());
                    INSERT INTO fin_goal (id, name, estimated_price, target_date, status, funded_by_savings, created_at,
                                          updated_at) VALUES
                      ('00000000-0000-0000-0000-0000000000b1', 'Velo', 300, '2027-01-01', 'PLANNED', TRUE, now(), now());
                    """);
            BigDecimal before = total(db);

            Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();

            assertThat(db.queryForList("SELECT id::text FROM fin_account", String.class))
                    .containsExactly("00000000-0000-0000-0000-0000000000a1");
            assertThat(db.queryForObject("SELECT type FROM fin_account", String.class)).isEqualTo("CURRENT");
            // Le virement interne disparait, le solde total est inchange : 1000 + 500 - 100 + 40 + 3.
            assertThat(before).isEqualByComparingTo("1443");
            assertThat(total(db)).isEqualByComparingTo(before);
            Map<String, Object> livretOpening = db.queryForMap(
                    "SELECT type, label FROM fin_operation WHERE id = '00000000-0000-0000-0000-0000000000f2'");
            assertThat(livretOpening).containsEntry("type", "ADJUSTMENT").containsEntry("label", "Solde de départ — Livret");
            assertThat(db.queryForObject("SELECT count(*) FROM fin_operation WHERE type = 'TRANSFER'", Integer.class))
                    .isZero();
            List<Map<String, Object>> loans = db.queryForList("""
                    SELECT o.type, o.income_kind, c.name FROM fin_operation o JOIN fin_category c ON c.id = o.category_id
                    WHERE o.id IN ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f5')
                    ORDER BY o.operation_date""");
            assertThat(loans).extracting(m -> m.get("type")).containsExactly("EXPENSE", "INCOME");
            assertThat(loans).extracting(m -> m.get("income_kind")).containsExactly(null, "OTHER");
            assertThat(loans).extracting(m -> m.get("name")).containsOnly("Prêts");
            // La migration V9 ne recree pas la categorie « Prets » deja creee par V8.
            assertThat(db.queryForObject("SELECT count(*) FROM fin_category WHERE name = 'Prêts'", Integer.class))
                    .isEqualTo(1);
            assertThat(db.queryForObject("SELECT account_id::text FROM fin_schedule", String.class))
                    .isEqualTo("00000000-0000-0000-0000-0000000000a1");
            assertThat(db.queryForObject("SELECT funded_by_savings FROM fin_goal", Boolean.class)).isFalse();
            assertThat(db.queryForObject("SELECT to_regclass('fin_loan') IS NULL", Boolean.class)).isTrue();
            assertThat(db.queryForObject("SELECT tutorial_done FROM fin_preferences", Boolean.class)).isFalse();
        } finally {
            jdbc.execute("DROP DATABASE IF EXISTS " + DB + " WITH (FORCE)");
        }
    }

    /** Solde total : somme des operations realisees (les virements sont neutres sur le total). */
    private static BigDecimal total(JdbcTemplate db) {
        return db.queryForObject("""
                SELECT COALESCE(sum(CASE WHEN type = 'TRANSFER' THEN 0 WHEN direction = 'CREDIT' THEN amount
                                         ELSE -amount END), 0)
                FROM fin_operation WHERE status = 'COMPLETED'""", BigDecimal.class);
    }
}
