package com.focusflow.note;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.BatchSize;

/**
 * Idee du module Notes & idees. Une idee n'a pas de statut : seules les taches qui en sont issues en ont un
 * (elles portent l'identifiant de l'idee, voir {@code Task.sourceNoteId}). Le contenu est du Markdown, quel que
 * soit le mode d'editeur utilise pour l'ecrire.
 */
@Entity
@Table(name = "note")
public class Note {

    public static final int TITLE_MAX = 200;
    public static final int CONTENT_MAX = 100_000;
    public static final int TAGS_MAX = 10;
    public static final int TAG_MAX = 40;

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String content = "";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private NoteCategory category;

    @Column(nullable = false)
    private boolean favorite;

    @ElementCollection
    @CollectionTable(name = "note_tag", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "name", nullable = false)
    @BatchSize(size = 50)
    private Set<String> tags = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Note() {
    }

    public Note(String title, Instant now) {
        retitle(title);
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Reconstruit une idee depuis une sauvegarde en verifiant les memes regles qu'a la saisie. */
    static Note imported(UUID id, String title, String content, boolean favorite, List<String> tags, Instant createdAt,
                         Instant updatedAt) {
        if (createdAt == null) {
            throw new IllegalArgumentException("date de creation manquante.");
        }
        Note n = new Note(title, createdAt);
        if (id != null) {
            n.id = id;
        }
        n.rewrite(content);
        n.favorite = favorite;
        n.retag(tags);
        n.updatedAt = updatedAt != null && !updatedAt.isBefore(createdAt) ? updatedAt : createdAt;
        return n;
    }

    public void retitle(String raw) {
        String t = raw == null ? "" : raw.strip();
        if (t.isEmpty() || t.length() > TITLE_MAX) {
            throw new IllegalArgumentException("Le titre de l'idee est obligatoire (" + TITLE_MAX + " caracteres maximum).");
        }
        this.title = t;
    }

    /** Contenu Markdown ; null equivaut a un contenu vide. Les espaces de fin sont retires. */
    public void rewrite(String markdown) {
        String c = markdown == null ? "" : markdown.stripTrailing();
        if (c.length() > CONTENT_MAX) {
            throw new IllegalArgumentException("Le contenu de l'idee ne peut pas depasser " + CONTENT_MAX + " caracteres.");
        }
        this.content = c;
    }

    /** Remplace les etiquettes : espaces retires, vides ignores, doublons (casse ignoree) fusionnes. */
    public void retag(List<String> names) {
        Map<String, String> wanted = new LinkedHashMap<>();
        if (names != null) {
            for (String raw : names) {
                String n = raw == null ? "" : raw.strip();
                if (n.isEmpty()) {
                    continue;
                }
                if (n.length() > TAG_MAX) {
                    throw new IllegalArgumentException("Une etiquette ne peut pas depasser " + TAG_MAX + " caracteres.");
                }
                wanted.putIfAbsent(n.toLowerCase(Locale.ROOT), n);
            }
        }
        if (wanted.size() > TAGS_MAX) {
            throw new IllegalArgumentException("Une idee ne peut pas avoir plus de " + TAGS_MAX + " etiquettes.");
        }
        tags.clear();
        tags.addAll(wanted.values());
    }

    public void touch(Instant now) {
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public NoteCategory getCategory() { return category; }
    public void setCategory(NoteCategory category) { this.category = category; }
    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }
    public Set<String> getTags() { return tags; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
