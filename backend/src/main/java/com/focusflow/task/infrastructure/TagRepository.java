package com.focusflow.task.infrastructure;

import java.util.Optional;
import java.util.UUID;

import com.focusflow.task.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findByNameIgnoreCase(String name);
}
