package com.focusflow.note;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;
import org.hibernate.annotations.BatchSize;

/** Categorie d'idees, geree par l'utilisateur. Nom unique sans tenir compte de la casse (index SQL). */
@Entity
@Table(name = "note_category")
@BatchSize(size = 50)
public class NoteCategory {

    public static final int NAME_MAX = 60;
    public static final String DEFAULT_COLOR = "#4f46e5";
    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color = DEFAULT_COLOR;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected NoteCategory() {
    }

    public NoteCategory(String name, String color, Instant now) {
        rename(name);
        if (color != null) {
            recolor(color);
        }
        this.createdAt = now;
    }

    /** Reconstruit une categorie depuis une sauvegarde ; une couleur invalide est remplacee par la couleur par defaut. */
    static NoteCategory imported(UUID id, String name, String color, Instant createdAt) {
        NoteCategory c = new NoteCategory(name, color != null && COLOR.matcher(color).matches() ? color : null, createdAt);
        if (id != null) {
            c.id = id;
        }
        return c;
    }

    public void rename(String raw) {
        this.name = cleanName(raw);
    }

    public void recolor(String value) {
        if (value == null || !COLOR.matcher(value).matches()) {
            throw new IllegalArgumentException("Couleur invalide (format #rrggbb attendu).");
        }
        this.color = value;
    }

    static String cleanName(String raw) {
        String n = raw == null ? "" : raw.strip();
        if (n.isEmpty() || n.length() > NAME_MAX) {
            throw new IllegalArgumentException("Le nom de la categorie est obligatoire (" + NAME_MAX + " caracteres maximum).");
        }
        return n;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getColor() { return color; }
    public Instant getCreatedAt() { return createdAt; }
    public long getVersion() { return version; }
}
