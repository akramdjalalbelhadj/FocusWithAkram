package com.focusflow.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
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

    /**
     * Repertoires que PostgreSQL 14 attend dans un dossier de donnees. Souvent vides, ils disparaissent quand le dossier
     * passe par Git (qui ne conserve pas les repertoires vides) ou par certaines copies ; PostgreSQL refuse alors de
     * demarrer (« n'a pas pu ouvrir le repertoire pg_notify »).
     */
    static final List<String> REQUIRED_DIRECTORIES = List.of("base", "global", "pg_commit_ts", "pg_dynshmem",
            "pg_logical", "pg_logical/mappings", "pg_logical/snapshots", "pg_multixact", "pg_multixact/members",
            "pg_multixact/offsets", "pg_notify", "pg_replslot", "pg_serial", "pg_snapshots", "pg_stat", "pg_stat_tmp",
            "pg_subtrans", "pg_tblspc", "pg_twophase", "pg_wal", "pg_wal/archive_status", "pg_xact");

    /** Recree, vides, les repertoires standard absents d'un dossier de donnees existant ; rend ceux qui ont ete crees. */
    static List<String> restoreMissingDirectories(Path dataDir) throws IOException {
        List<String> created = new ArrayList<>();
        for (String name : REQUIRED_DIRECTORIES) {
            Path d = dataDir.resolve(name);
            if (!Files.isDirectory(d)) {
                Files.createDirectories(d);
                created.add(name);
            }
        }
        return created;
    }

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
                List<String> restored = restoreMissingDirectories(dir);
                if (!restored.isEmpty()) {
                    log.warn("PostgreSQL embarque : repertoires vides absents recrees {} (dossier copie ou restaure "
                            + "depuis Git) ; aucune donnee n'est modifiee.", restored);
                }
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
