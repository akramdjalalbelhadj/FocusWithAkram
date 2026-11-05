package com.focusflow.note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteCategoryRepository extends JpaRepository<NoteCategory, UUID> {

    List<NoteCategory> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    Optional<NoteCategory> findByNameIgnoreCase(String name);
}
