package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Le jeu de categories initial (migration V3, et « Prets » depuis V9) correspond au tableau du besoin. */
class DefaultCategoriesIT extends IntegrationTest {

    private static final String DB = "default_categories_it";

    @Test
    void defaultCategoryTreeMatchesTheRequirement() throws Exception {
        // Les tests vident les tables : on rejoue la migration de donnees sur une base vide.
        String script = new ClassPathResource("db/migration/V3__finance_default_categories.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        jdbc.execute(script);

        String tree = mvc.perform(get("/api/v1/finance/categories")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat((List<String>) JsonPath.read(tree, "$[*].name")).containsExactly("Logement", "Courses", "Abonnements",
                "Restaurants", "Santé", "Produits numériques", "Dons", "Vêtements", "Soins personnels",
                "Transports ponctuels", "Loisirs", "Autres");
        assertThat((List<String>) JsonPath.read(tree, "$[?(@.name=='Abonnements')].children[*].name"))
                .containsExactly("Téléphone / SIM", "ChatGPT", "Claude", "Transport", "Laverie", "Sport", "Électricité",
                        "Assurances", "Vélo / VTC");
        assertThat(jdbc.queryForObject("select count(*) from fin_category", Integer.class)).isEqualTo(53);
    }

    /** Base neuve, toutes migrations appliquees (base dediee du meme serveur) : « Prets » est proposee d'emblee. */
    @Test
    void freshDatabaseAlsoOffersTheLoansCategory() throws Exception {
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
            Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
            JdbcTemplate db = new JdbcTemplate(ds);
            assertThat(db.queryForList("SELECT name FROM fin_category WHERE parent_id IS NULL ORDER BY position",
                    String.class)).hasSize(13).endsWith("Prêts");
            Map<String, Object> loans = db.queryForMap(
                    "SELECT icon, color, position, archived FROM fin_category WHERE name = 'Prêts'");
            assertThat(loans).containsEntry("icon", "hand-coins").containsEntry("color", "#0d9488")
                    .containsEntry("position", 12).containsEntry("archived", false);
            assertThat(db.queryForObject("SELECT count(*) FROM fin_category", Integer.class)).isEqualTo(54);
        } finally {
            jdbc.execute("DROP DATABASE IF EXISTS " + DB + " WITH (FORCE)");
        }
    }
}
