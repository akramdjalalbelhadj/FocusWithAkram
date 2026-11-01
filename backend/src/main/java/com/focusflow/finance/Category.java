package com.focusflow.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Categorie de depense sur deux niveaux : une categorie racine, ou une sous-categorie dont le parent est racine.
 * Une categorie utilisee s'archive au lieu d'etre supprimee : les operations restent lisibles.
 */
@Entity
@Table(name = "fin_category")
public class Category {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @Column(nullable = false)
    private String name;

    private String icon;

    private String color;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean archived;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected Category() {
    }

    public Category(Category parent, String name, Instant createdAt) {
        this.parent = parent;
        this.name = name;
        this.createdAt = createdAt;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant d'origine. */
    public static Category restored(UUID id, Category parent, String name, String icon, String color, int position,
                                    boolean archived, Instant createdAt) {
        Category c = new Category(parent, name, createdAt);
        if (id != null) {
            c.id = id;
        }
        c.icon = icon;
        c.color = color;
        c.position = position;
        c.archived = archived;
        return c;
    }

    /** Categorie racine dont cette categorie fait partie (elle-meme si elle est racine). */
    public Category root() {
        return parent == null ? this : parent;
    }

    public UUID getId() { return id; }
    public Category getParent() { return parent; }
    public void setParent(Category parent) { this.parent = parent; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public Instant getCreatedAt() { return createdAt; }
}
