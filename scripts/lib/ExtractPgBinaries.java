import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.xz.XZCompressorInputStream;

/**
 * Extrait les binaires PostgreSQL d'un jar io.zonky.test.postgres:embedded-postgres-binaries-* (archive .txz
 * contenue dans le jar) vers un dossier.
 *
 * <p>Remplace tar.exe : celui de Windows 10 ne sait pas decompresser le xz. Utilise commons-compress et xz, deja
 * presents dans le classpath du backend (dependance embedded-postgres).
 *
 * <p>Usage : java --class-path ... ExtractPgBinaries.java &lt;jar&gt; &lt;dossier cible&gt;
 */
public class ExtractPgBinaries {

    public static void main(String[] args) throws IOException {
        if (args.length != 2) {
            System.err.println("Usage : ExtractPgBinaries <jar> <dossier cible>");
            System.exit(2);
        }
        Path jar = Path.of(args[0]);
        Path target = Path.of(args[1]).toAbsolutePath().normalize();
        Files.createDirectories(target);

        int files = 0;
        try (ZipFile zip = new ZipFile(jar.toFile())) {
            ZipEntry txz = zip.stream()
                    .filter(e -> !e.isDirectory() && e.getName().endsWith(".txz"))
                    .findFirst()
                    .orElseThrow(() -> new IOException("Aucune archive .txz dans " + jar));
            try (InputStream raw = new BufferedInputStream(zip.getInputStream(txz));
                 XZCompressorInputStream xz = new XZCompressorInputStream(raw);
                 TarArchiveInputStream tar = new TarArchiveInputStream(xz)) {
                TarArchiveEntry entry;
                while ((entry = tar.getNextEntry()) != null) {
                    Path out = target.resolve(entry.getName()).normalize();
                    if (!out.startsWith(target)) {
                        throw new IOException("Chemin hors du dossier cible dans l'archive : " + entry.getName());
                    }
                    if (entry.isDirectory()) {
                        Files.createDirectories(out);
                    } else if (entry.isFile()) {
                        Files.createDirectories(out.getParent());
                        Files.copy(tar, out, StandardCopyOption.REPLACE_EXISTING);
                        files++;
                    }
                    // Liens symboliques et autres entrees speciales : sans objet pour les binaires Windows.
                }
            }
        }
        System.out.println(files + " fichiers extraits dans " + target);
    }
}
