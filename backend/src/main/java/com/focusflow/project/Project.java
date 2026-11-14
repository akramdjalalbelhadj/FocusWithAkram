package com.focusflow.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "project")
public class Project {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String color = "#6366f1";

    private String icon;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(nullable = false)
    private boolean archived;

    /** Dossiers de rangement (aucun, un ou plusieurs) ; sans effet sur les taches. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "project_folder_link", joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "folder_id"))
    private Set<ProjectFolder> folders = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected Project() {
    }

    public Project(String name, Instant createdAt) {
        this.name = name;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public Instant getDueAt() { return dueAt; }
    public void setDueAt(Instant dueAt) { this.dueAt = dueAt; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    /** Dossiers du projet, par nom. */
    public List<ProjectFolder> getFolders() {
        return folders.stream()
                .sorted(Comparator.comparing(ProjectFolder::getName, String.CASE_INSENSITIVE_ORDER)).toList();
    }

    public boolean isIn(ProjectFolder folder) {
        return folders.stream().anyMatch(f -> f.getId().equals(folder.getId()));
    }

    /** Remplace les dossiers du projet. */
    public void setFolders(java.util.Collection<ProjectFolder> folders) {
        this.folders.clear();
        this.folders.addAll(folders);
    }

    public void addFolder(ProjectFolder folder) {
        if (!isIn(folder)) folders.add(folder);
    }

    public void removeFolder(ProjectFolder folder) {
        folders.removeIf(f -> f.getId().equals(folder.getId()));
    }
    public Instant getCreatedAt() { return createdAt; }
}
