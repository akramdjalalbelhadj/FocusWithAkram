package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.focusflow.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Le jeu de categories initial (migration V3) correspond au tableau du besoin. */
class DefaultCategoriesIT extends IntegrationTest {

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
}
