package com.focusflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class EmbeddedPostgresConfigTest {

    @Test
    void missingEmptyDirectoriesOfAnExistingDataDirectoryAreRecreatedWithoutTouchingFiles(@TempDir Path dir) throws Exception {
        Files.writeString(dir.resolve("PG_VERSION"), "14\n");
        Files.createDirectories(dir.resolve("base/1"));
        Files.writeString(dir.resolve("base/1/1259"), "donnees");

        assertThat(EmbeddedPostgresConfig.restoreMissingDirectories(dir)).contains("pg_notify", "pg_tblspc", "pg_logical/snapshots")
                .doesNotContain("base");
        assertThat(dir.resolve("pg_notify")).isDirectory();
        assertThat(Files.readString(dir.resolve("base/1/1259"))).isEqualTo("donnees");
        // Deuxieme passage : plus rien a recreer.
        assertThat(EmbeddedPostgresConfig.restoreMissingDirectories(dir)).isEmpty();
    }

    @Test
    void anUnavailablePortIsReplacedByAFollowingFreePort() throws Exception {
        try (ServerSocket taken = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            int port = taken.getLocalPort();
            int chosen = EmbeddedPostgresConfig.choosePort(port);
            assertThat(chosen).isNotEqualTo(port);
            assertThat(chosen == 0 || (chosen > port && chosen <= port + EmbeddedPostgresConfig.PORT_SCAN)).isTrue();
        }
        assertThat(EmbeddedPostgresConfig.choosePort(0)).isZero();
    }

    @Test
    void aDataDirectoryOfAnotherMajorVersionIsRefusedWithTheMigrationCommand(@TempDir Path dir) throws Exception {
        Files.writeString(dir.resolve("PG_VERSION"), "14\n");

        assertThatThrownBy(() -> EmbeddedPostgresConfig.checkDataVersion(dir, "18.6.0"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PostgreSQL 14").hasMessageContaining("PostgreSQL 18")
                .hasMessageContaining("migrate_postgres");
        assertThatThrownBy(() -> EmbeddedPostgresConfig.checkDataVersion(dir, "13.20.0"))
                .hasMessageContaining("plus recent");
        assertThatCode(() -> EmbeddedPostgresConfig.checkDataVersion(dir, "14.22.0")).doesNotThrowAnyException();
        // Sans filtrage Maven (lancement depuis un IDE) ou sans propriete : pas de controle.
        assertThatCode(() -> EmbeddedPostgresConfig.checkDataVersion(dir, "@embedded-postgres-binaries.version@"))
                .doesNotThrowAnyException();
        assertThatCode(() -> EmbeddedPostgresConfig.checkDataVersion(dir, "")).doesNotThrowAnyException();
    }

    @Test
    void onlyALivePostgresProcessIsReportedAsHoldingTheDataDirectory(@TempDir Path dir) throws Exception {
        assertThat(EmbeddedPostgresConfig.runningPostmaster(dir)).isEmpty();

        // Processus vivant mais qui n'est pas PostgreSQL (PID reutilise apres un arret brutal) : ignore.
        Files.writeString(dir.resolve("postmaster.pid"), ProcessHandle.current().pid() + "\n" + dir + "\n");
        assertThat(EmbeddedPostgresConfig.runningPostmaster(dir)).isEmpty();

        Files.writeString(dir.resolve("postmaster.pid"), "illisible\n");
        assertThat(EmbeddedPostgresConfig.runningPostmaster(dir)).isEmpty();
    }
}
