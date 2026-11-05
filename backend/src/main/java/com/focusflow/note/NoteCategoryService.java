package com.focusflow.note;

import com.focusflow.common.Patch;
import com.focusflow.common.exception.ApiException;
import com.focusflow.note.dto.CreateNoteCategoryRequest;
import com.focusflow.note.dto.NoteCategoryResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Categories d'idees : ecran dedie (creer, renommer, colorer, supprimer). */
@Service
public class NoteCategoryService {

    private final NoteCategoryRepository categories;
    private final NoteRepository notes;
    private final Clock clock;

    public NoteCategoryService(NoteCategoryRepository categories, NoteRepository notes, Clock clock) {
        this.categories = categories;
        this.notes = notes;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<NoteCategoryResponse> list() {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : notes.countByCategory()) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return categories.findAllByOrderByNameAsc().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(c -> NoteMapper.toResponse(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public NoteCategoryResponse create(CreateNoteCategoryRequest req) {
        String name = NoteCategory.cleanName(req.name());
        requireFreeName(name);
        NoteCategory c = categories.save(new NoteCategory(name, req.color(), Instant.now(clock)));
        return NoteMapper.toResponse(c, 0);
    }

    @Transactional
    public NoteCategoryResponse update(UUID id, Patch p) {
        NoteCategory c = find(id);
        if (p.has("name")) {
            String name = NoteCategory.cleanName(p.string("name"));
            if (!name.equalsIgnoreCase(c.getName())) {
                requireFreeName(name);
            }
            c.rename(name);
        }
        if (p.has("color")) {
            c.recolor(p.string("color"));
        }
        long count = notes.countByCategory().stream().filter(r -> r[0].equals(id))
                .mapToLong(r -> ((Number) r[1]).longValue()).sum();
        return NoteMapper.toResponse(c, count);
    }

    /** Supprime la categorie ; ses idees sont conservees, sans categorie (la base remet category_id a NULL). */
    @Transactional
    public void delete(UUID id) {
        categories.delete(find(id));
    }

    @Transactional(readOnly = true)
    public NoteCategory find(UUID id) {
        return categories.findById(id).orElseThrow(() -> ApiException.notFound("Categorie", id));
    }

    private void requireFreeName(String name) {
        if (categories.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("NOTE_CATEGORY_NAME_TAKEN", "Une categorie porte deja ce nom.");
        }
    }
}
