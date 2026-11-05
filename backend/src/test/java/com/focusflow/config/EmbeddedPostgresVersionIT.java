package com.focusflow.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.focusflow.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

/**
 * Les binaires PostgreSQL reellement embarques sont ceux du pom.xml : sans cela, le controle de version de la base
 * locale (et la commande de migration qu'il propose) serait faux.
 */
class EmbeddedPostgresVersionIT extends IntegrationTest {

    @Value("${focusflow.embedded-postgres.binaries-version}")
    String binariesVersion;

    @Test
    void theEmbeddedServerHasTheMajorVersionDeclaredInThePom() {
        Integer declared = EmbeddedPostgresConfig.majorVersion(binariesVersion);
        int running = jdbc.queryForObject("SHOW server_version_num", Integer.class) / 10_000;

        assertThat(declared).as("propriete filtree depuis le pom.xml : %s", binariesVersion).isNotNull();
        assertThat(running).isEqualTo(declared);
    }
}
