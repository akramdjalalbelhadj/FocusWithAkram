package com.focusflow.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** Compte (courant, epargne, especes). Son solde n'est pas stocke : il est la somme de ses operations realisees. */
@Entity
@Table(name = "fin_account")
public class Account {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;

    @Column(nullable = false)
    private boolean archived;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected Account() {
    }

    public Account(String name, AccountType type, Instant createdAt) {
        this.name = name;
        this.type = type;
        this.createdAt = createdAt;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant d'origine. */
    public static Account restored(UUID id, String name, AccountType type, boolean archived, int position, Instant createdAt) {
        Account a = new Account(name, type, createdAt);
        if (id != null) {
            a.id = id;
        }
        a.archived = archived;
        a.position = position;
        return a;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Instant getCreatedAt() { return createdAt; }
}
