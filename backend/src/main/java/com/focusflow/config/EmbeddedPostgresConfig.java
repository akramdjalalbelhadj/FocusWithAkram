package com.focusflow.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Profil "local" uniquement : demarre un vrai PostgreSQL embarque, persistant sur disque.
 * Cette classe est inactive en production (dependance exclue du repackage).
 */
@Configuration
@Profile("local")
@ConditionalOnClass(name = "io.zonky.test.db.postgres.embedded.EmbeddedPostgres")
public class EmbeddedPostgresConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedPostgresConfig.class);

    @Bean(destroyMethod = "close")
    public EmbeddedPostgres embeddedPostgres(@Value("${focusflow.embedded-postgres.port:0}") int port,
                                             @Value("${focusflow.embedded-postgres.data-dir:}") String dataDir) throws IOException {
        EmbeddedPostgres.Builder builder = EmbeddedPostgres.builder().setPort(port);
        if (!dataDir.isBlank()) {
            // Donnees persistantes entre deux lancements ; sans repertoire, base jetable (tests).
            // Chemin relatif au repertoire de lancement : on l'affiche pour qu'un lancement depuis un autre dossier,
            // qui creerait une seconde base vide, soit immediatement visible.
            Path dir = Path.of(dataDir).toAbsolutePath().normalize();
            if (Files.exists(dir.resolve("PG_VERSION"))) {
                log.info("PostgreSQL embarque : donnees existantes dans {}", dir);
            } else {
                log.warn("PostgreSQL embarque : aucune base dans {} ; une base vide va etre creee. "
                        + "Lancez le backend depuis le dossier backend/ pour retrouver vos donnees.", dir);
            }
            builder.setDataDirectory(dir).setCleanDataDirectory(false);
        }
        return builder.start();
    }

    @Bean
    @Primary
    public DataSource dataSource(EmbeddedPostgres postgres) {
        return postgres.getPostgresDatabase();
    }
}
