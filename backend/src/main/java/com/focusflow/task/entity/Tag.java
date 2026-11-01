package com.focusflow.task.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tag")
public class Tag {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    protected Tag() {
    }

    public Tag(String name) {
        this.name = name;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
}
