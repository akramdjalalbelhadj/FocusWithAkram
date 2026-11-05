import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.flywaydb.core.Flyway;
import org.postgresql.PGConnection;
import org.postgresql.copy.CopyManager;

/**
 * Copie la base de FocusWithAkram d'un serveur PostgreSQL vers un serveur neuf d'une autre version majeure, sans
 * pg_dump (absent des binaires embarques) : utilise par scripts/migrate_postgres.ps1.
 *
 * <ol>
 *   <li>Schema : les migrations Flyway de l'application, jusqu'a la version de la base source (comme une installation
 *       neuve) ;</li>
 *   <li>donnees : toutes les tables du schema public par COPY (format texte, portable entre versions), contraintes de
 *       cle etrangere suspendues pendant le chargement, historique Flyway compris ;</li>
 *   <li>verification : pour chaque table, nombre de lignes et empreinte du contenu (independante de la collation et du
 *       fuseau), et valeur de chaque sequence, identiques des deux cotes ; sinon code de sortie 1.</li>
 * </ol>
 *
 * Usage : java --class-path (classpath du backend) PgCopy.java URL_SOURCE URL_CIBLE DOSSIER_MIGRATIONS DOSSIER_TRAVAIL
 */
public class PgCopy {

    public static void main(String[] args) throws Exception {
        if (args.length != 4) {
            System.err.println("Usage : PgCopy URL_SOURCE URL_CIBLE DOSSIER_MIGRATIONS DOSSIER_TRAVAIL");
            System.exit(2);
        }
        Path migrations = Path.of(args[2]).toAbsolutePath();
        Path work = Path.of(args[3]);
        try (Connection source = DriverManager.getConnection(args[0], "postgres", "");
             Connection target = DriverManager.getConnection(args[1], "postgres", "")) {
            System.out.println("Source : " + version(source) + " ; cible : " + version(target));
            warnAboutOtherContent(source);

            String schemaVersion = scalar(source, "SELECT version FROM public.flyway_schema_history "
                    + "WHERE success AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1");
            System.out.println("Schema de la source : migration " + schemaVersion);
            Flyway.configure().dataSource(args[1], "postgres", "")
                    .locations("filesystem:" + migrations)
                    .target(schemaVersion)
                    .load()
                    .migrate();

            List<String> tables = tables(source);
            if (!Set.copyOf(tables).equals(Set.copyOf(tables(target)))) {
                throw new IllegalStateException("Tables differentes apres les migrations : source " + tables
                        + ", cible " + tables(target));
            }
            copyData(source, target, tables);
            try (Statement st = target.createStatement()) {
                st.execute("ANALYZE");
            }

            List<String> before = inventory(source);
            List<String> after = inventory(target);
            Files.write(work.resolve("releve-ancienne.txt"), before);
            Files.write(work.resolve("releve-nouvelle.txt"), after);
            if (!before.equals(after)) {
                for (String line : before) {
                    if (!after.contains(line)) {
                        System.out.println("  avant : " + line);
                    }
                }
                for (String line : after) {
                    if (!before.contains(line)) {
                        System.out.println("  apres : " + line);
                    }
                }
                System.out.println("ECART : la base copiee differe de l'originale.");
                System.exit(1);
            }
            long rows = before.stream().filter(l -> l.startsWith("table "))
                    .mapToLong(l -> Long.parseLong(l.replaceAll(".* : (\\d+) lignes.*", "$1"))).sum();
            System.out.println("IDENTIQUES : " + tables.size() + " tables, " + rows + " lignes.");
        }
    }

    private static void copyData(Connection source, Connection target, List<String> tables) throws Exception {
        CopyManager out = source.unwrap(PGConnection.class).getCopyAPI();
        CopyManager in = target.unwrap(PGConnection.class).getCopyAPI();
        target.setAutoCommit(false);
        try (Statement st = target.createStatement()) {
            // Chargement table par table : les cles etrangeres sont verifiees par des declencheurs, suspendus ici ;
            // les donnees viennent d'une base coherente.
            st.execute("SET session_replication_role = replica");
            // Les migrations inserent des donnees par defaut (categories, reglages) : remplacees par celles de la source.
            st.execute("TRUNCATE " + tables.stream().map(t -> "public." + quote(t)).collect(Collectors.joining(", ")));
        }
        Path buffer = Files.createTempFile("pgcopy", ".txt");
        try {
            for (String table : tables) {
                List<String> columns = columns(source, table);
                if (!columns.equals(columns(target, table))) {
                    throw new IllegalStateException("Colonnes differentes pour " + table + " : " + columns + " / "
                            + columns(target, table));
                }
                String list = columns.stream().map(PgCopy::quote).collect(Collectors.joining(", "));
                try (OutputStream os = Files.newOutputStream(buffer)) {
                    out.copyOut("COPY public." + quote(table) + " (" + list + ") TO STDOUT", os);
                }
                long copied;
                try (InputStream is = Files.newInputStream(buffer)) {
                    copied = in.copyIn("COPY public." + quote(table) + " (" + list + ") FROM STDIN", is);
                }
                System.out.println("  " + table + " : " + copied + " lignes");
            }
            for (String sequence : sequences(source)) {
                try (Statement st = source.createStatement();
                     ResultSet rs = st.executeQuery("SELECT last_value, is_called FROM public." + quote(sequence))) {
                    rs.next();
                    try (Statement up = target.createStatement()) {
                        up.execute("SELECT setval('public." + quote(sequence).replace("'", "''") + "', "
                                + rs.getLong(1) + ", " + rs.getBoolean(2) + ")");
                    }
                }
            }
            try (Statement st = target.createStatement()) {
                st.execute("SET session_replication_role = origin");
            }
            target.commit();
        } catch (Exception e) {
            target.rollback();
            throw e;
        } finally {
            target.setAutoCommit(true);
            Files.deleteIfExists(buffer);
        }
    }

    /** Releve comparable entre versions : lignes et empreinte de chaque table, valeur de chaque sequence. */
    private static List<String> inventory(Connection c) throws SQLException {
        try (Statement st = c.createStatement()) {
            st.execute("SET TimeZone = 'UTC'");
            st.execute("SET DateStyle = 'ISO, YMD'");
            st.execute("SET IntervalStyle = 'postgres'");
            st.execute("SET extra_float_digits = 1");
        }
        List<String> lines = new ArrayList<>();
        for (String table : tables(c)) {
            String sql = "SELECT count(*), md5(coalesce(string_agg(t::text, E'\\n' ORDER BY t::text COLLATE \"C\"), ''))"
                    + " FROM public." + quote(table) + " t";
            try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
                rs.next();
                lines.add("table " + table + " : " + rs.getLong(1) + " lignes, empreinte " + rs.getString(2));
            }
        }
        for (String sequence : sequences(c)) {
            lines.add("sequence " + sequence + " : " + scalar(c,
                    "SELECT coalesce(last_value::text, 'jamais utilisee') FROM pg_sequences "
                            + "WHERE schemaname = 'public' AND sequencename = '" + sequence.replace("'", "''") + "'"));
        }
        return lines;
    }

    private static void warnAboutOtherContent(Connection c) throws SQLException {
        List<String> databases = list(c, "SELECT datname FROM pg_database WHERE NOT datistemplate "
                + "AND datname <> 'postgres' ORDER BY 1");
        if (!databases.isEmpty()) {
            System.out.println("ATTENTION : autres bases non migrees (elles restent dans la sauvegarde) : " + databases);
        }
        List<String> schemas = list(c, "SELECT DISTINCT n.nspname FROM pg_class r JOIN pg_namespace n "
                + "ON n.oid = r.relnamespace WHERE r.relkind IN ('r', 'p') AND n.nspname NOT IN "
                + "('public', 'pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg\\_%' ORDER BY 1");
        if (!schemas.isEmpty()) {
            System.out.println("ATTENTION : schemas hors public non migres : " + schemas);
        }
    }

    private static List<String> tables(Connection c) throws SQLException {
        return list(c, "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                + "WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition "
                + "ORDER BY c.relname COLLATE \"C\"");
    }

    /** Colonnes alimentables (ni supprimees ni generees), dans l'ordre de la table. */
    private static List<String> columns(Connection c, String table) throws SQLException {
        return list(c, "SELECT a.attname FROM pg_attribute a WHERE a.attrelid = 'public." + quote(table).replace("'", "''")
                + "'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '' ORDER BY a.attnum");
    }

    private static List<String> sequences(Connection c) throws SQLException {
        return list(c, "SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' "
                + "ORDER BY sequencename COLLATE \"C\"");
    }

    private static String version(Connection c) throws SQLException {
        return "PostgreSQL " + scalar(c, "SHOW server_version");
    }

    private static String scalar(Connection c, String sql) throws SQLException {
        List<String> values = list(c, sql);
        if (values.isEmpty()) {
            throw new IllegalStateException("Aucun resultat : " + sql);
        }
        return values.getFirst();
    }

    private static List<String> list(Connection c, String sql) throws SQLException {
        List<String> values = new ArrayList<>();
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                values.add(rs.getString(1));
            }
        }
        return values;
    }

    private static String quote(String identifier) {
        return '"' + identifier.replace("\"", "\"\"") + '"';
    }
}
