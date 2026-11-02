package com.focusflow.config;

import static org.assertj.core.api.Assertions.assertThat;

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
}
