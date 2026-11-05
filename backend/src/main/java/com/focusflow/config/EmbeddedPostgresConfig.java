package com.focusflow.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
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
     * Repertoires que PostgreSQL attend dans un dossier de donnees (14 a 18). Souvent vides, ils disparaissent quand le
     * dossier passe par Git (qui ne conserve pas les repertoires vides) ou par certaines copies ; PostgreSQL refuse alors
     * de demarrer (« n'a pas pu ouvrir le repertoire pg_notify »).
     */
    static final List<String> REQUIRED_DIRECTORIES = List.of("base", "global", "pg_commit_ts", "pg_dynshmem",
            "pg_logical", "pg_logical/mappings", "pg_logical/snapshots", "pg_multixact", "pg_multixact/members",
            "pg_multixact/offsets", "pg_notify", "pg_replslot", "pg_serial", "pg_snapshots", "pg_stat", "pg_stat_tmp",
            "pg_subtrans", "pg_tblspc", "pg_twophase", "pg_wal", "pg_wal/archive_status", "pg_wal/summaries", "pg_xact");

    /** Nombre de ports essayes apres le port demande avant de laisser le systeme en attribuer un. */
    static final int PORT_SCAN = 100;

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
                                             @Value("${focusflow.embedded-postgres.data-dir:}") String dataDir,
                                             @Value("${focusflow.embedded-postgres.binaries-version:}") String binariesVersion)
            throws IOException {
        int effectivePort = choosePort(port);
        if (effectivePort != port) {
            // Windows reserve des plages de ports (Hyper-V, WSL, Docker) : "Permission denied" meme si rien n'ecoute.
            log.warn("PostgreSQL embarque : le port {} est indisponible (occupe ou reserve par le systeme) ; "
                    + "{} est utilise pour ce lancement.", port, effectivePort == 0 ? "un port attribue par le systeme"
                    : "le port " + effectivePort);
        }
        EmbeddedPostgres.Builder builder = EmbeddedPostgres.builder().setPort(effectivePort);
        if (!dataDir.isBlank()) {
            // Donnees persistantes entre deux lancements ; sans repertoire, base jetable (tests).
            // Chemin relatif au repertoire de lancement : on l'affiche pour qu'un lancement depuis un autre dossier,
            // qui creerait une seconde base vide, soit immediatement visible.
            Path dir = Path.of(dataDir).toAbsolutePath().normalize();
            if (Files.exists(dir.resolve("PG_VERSION"))) {
                log.info("PostgreSQL embarque : donnees existantes dans {}", dir);
                checkDataVersion(dir, binariesVersion);
                OptionalLong running = runningPostmaster(dir);
                if (running.isPresent()) {
                    // Sinon : 10 secondes d'attente puis "Gave up waiting for server to start", sans la cause.
                    throw new IllegalStateException("PostgreSQL embarque deja demarre sur " + dir + " (PID "
                            + running.getAsLong() + "), sans doute par un lancement precedent. Arretez-le (les "
                            + "lanceurs scripts/start_*.ps1 et start_*.sh le font automatiquement), puis relancez.");
                }
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

    /** Port demande s'il est libre, sinon l'un des suivants, sinon 0 (port attribue par le systeme). */
    static int choosePort(int preferred) {
        if (preferred <= 0 || isPortBindable(preferred)) {
            return preferred;
        }
        for (int candidate = preferred + 1; candidate <= Math.min(65535, preferred + PORT_SCAN); candidate++) {
            if (isPortBindable(candidate)) {
                return candidate;
            }
        }
        return 0;
    }

    /**
     * Refuse un dossier de donnees cree par une autre version majeure de PostgreSQL que celle des binaires embarques
     * (version vide ou illisible, par exemple sans filtrage Maven des ressources : pas de controle).
     */
    static void checkDataVersion(Path dataDir, String binariesVersion) throws IOException {
        Integer expected = majorVersion(binariesVersion);
        Path versionFile = dataDir.resolve("PG_VERSION");
        if (expected == null || !Files.isRegularFile(versionFile)) {
            return;
        }
        Integer actual = majorVersion(Files.readString(versionFile));
        if (actual == null || actual.equals(expected)) {
            return;
        }
        if (actual < expected) {
            throw new IllegalStateException("La base locale " + dataDir + " est au format PostgreSQL " + actual
                    + " ; l'application embarque PostgreSQL " + expected + ". Migrez-la une fois avec "
                    + "scripts/migrate_postgres.ps1 (l'ancienne base est conservee), voir docs/technique/exploitation.md.");
        }
        throw new IllegalStateException("La base locale " + dataDir + " est au format PostgreSQL " + actual
                + ", plus recent que celui de l'application (PostgreSQL " + expected + ").");
    }

    static Integer majorVersion(String version) {
        if (version == null) {
            return null;
        }
        Matcher m = Pattern.compile("^\\s*(\\d+)").matcher(version);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }

    /** PID d'un serveur PostgreSQL encore actif sur ce dossier (fichier postmaster.pid d'un processus vivant). */
    static OptionalLong runningPostmaster(Path dataDir) {
        Path pidFile = dataDir.resolve("postmaster.pid");
        if (!Files.isRegularFile(pidFile)) {
            return OptionalLong.empty();
        }
        try (Stream<String> lines = Files.lines(pidFile)) {
            long pid = Long.parseLong(lines.findFirst().orElse("").trim());
            boolean postgres = ProcessHandle.of(pid).filter(ProcessHandle::isAlive)
                    .flatMap(h -> h.info().command())
                    .map(c -> c.toLowerCase(Locale.ROOT).contains("postgres"))
                    .orElse(false);
            return postgres ? OptionalLong.of(pid) : OptionalLong.empty();
        } catch (IOException | NumberFormatException | UncheckedIOException e) {
            // Fichier en cours d'ecriture ou illisible : PostgreSQL tranchera lui-meme.
            return OptionalLong.empty();
        }
    }

    static boolean isPortBindable(int port) {
        try (ServerSocket socket = new ServerSocket(port, 1, InetAddress.getLoopbackAddress())) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }
    @Bean
    @Primary
    public DataSource dataSource(EmbeddedPostgres postgres) {
        return postgres.getPostgresDatabase();
    }
}
