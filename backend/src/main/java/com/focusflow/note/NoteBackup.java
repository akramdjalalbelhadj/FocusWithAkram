package com.focusflow.note;

import com.focusflow.note.dto.NotesBackupData;
import com.focusflow.note.dto.NotesImportSummary;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Section « notes » de la sauvegarde complete (format v4). L'import valide chaque element avant de l'ecrire :
 * un element invalide est signale sans empecher les autres. Les categories sont rapprochees par identifiant puis
 * par nom ; une idee deja presente (meme identifiant, ou meme titre et date de creation) est ignoree.
 */
@Component
public class NoteBackup {

    /** Resultat d'un import : compteurs du rapport et idees du fichier resolues vers une idee de la base. */
    public record Result(NotesImportSummary summary, Map<UUID, UUID> noteIdsByFileId) {
    }

    private final NoteCategoryRepository categories;
    private final NoteRepository notes;

    public NoteBackup(NoteCategoryRepository categories, NoteRepository notes) {
        this.categories = categories;
        this.notes = notes;
    }

    @Transactional(readOnly = true)
    public NotesBackupData export() {
        return new NotesBackupData(
                categories.findAllByOrderByNameAsc().stream()
                        .map(c -> new NotesBackupData.Category(c.getId(), c.getName(), c.getColor(), c.getCreatedAt()))
                        .toList(),
                notes.findAll(Sort.by("createdAt", "id")).stream()
                        .map(n -> new NotesBackupData.Note(n.getId(), n.getTitle(), n.getContent(),
                                n.getCategory() == null ? null : n.getCategory().getId(), NoteMapper.tags(n),
                                n.isFavorite(), n.getCreatedAt(), n.getUpdatedAt()))
                        .toList());
    }

    @Transactional
    public Result importData(NotesBackupData data, Consumer<String> errors) {
        int categoriesCreated = 0;
        int categoriesReused = 0;
        int notesCreated = 0;
        int notesSkipped = 0;
        Map<UUID, NoteCategory> categoryByFileId = new HashMap<>();
        for (NotesBackupData.Category cd : nullToEmpty(data.categories())) {
            try {
                NoteCategory existing = cd.id() == null ? null : categories.findById(cd.id()).orElse(null);
                if (existing == null) {
                    existing = categories.findByNameIgnoreCase(NoteCategory.cleanName(cd.name())).orElse(null);
                }
                if (existing != null) {
                    categoriesReused++;
                } else {
                    existing = categories.save(NoteCategory.imported(cd.id(), cd.name(), cd.color(),
                            cd.createdAt() != null ? cd.createdAt() : Instant.EPOCH));
                    categoriesCreated++;
                }
                if (cd.id() != null) {
                    categoryByFileId.put(cd.id(), existing);
                }
            } catch (RuntimeException e) {
                errors.accept("Categorie d'idees '" + cd.name() + "' : " + e.getMessage());
            }
        }
        Map<UUID, UUID> noteIds = new HashMap<>();
        Set<UUID> seen = new HashSet<>();
        for (NotesBackupData.Note nd : nullToEmpty(data.notes())) {
            try {
                if (nd.id() != null && !seen.add(nd.id())) {
                    throw new IllegalArgumentException("identifiant en double dans le fichier : " + nd.id());
                }
                if (nd.id() != null && notes.existsById(nd.id())) {
                    noteIds.put(nd.id(), nd.id());
                    notesSkipped++;
                    continue;
                }
                if (nd.title() != null && nd.createdAt() != null) {
                    List<UUID> same = notes.findIdsByTitleAndCreatedAt(nd.title().strip(), nd.createdAt());
                    if (!same.isEmpty()) {
                        if (nd.id() != null) {
                            noteIds.put(nd.id(), same.getFirst());
                        }
                        notesSkipped++;
                        continue;
                    }
                }
                Note n = Note.imported(nd.id(), nd.title(), nd.content(), Boolean.TRUE.equals(nd.favorite()), nd.tags(),
                        nd.createdAt(), nd.updatedAt());
                if (nd.categoryId() != null) {
                    n.setCategory(categoryByFileId.get(nd.categoryId()));
                }
                Note saved = notes.save(n);
                if (nd.id() != null) {
                    noteIds.put(nd.id(), saved.getId());
                }
                notesCreated++;
            } catch (RuntimeException e) {
                errors.accept("Idee '" + nd.title() + "' : " + e.getMessage());
            }
        }
        return new Result(new NotesImportSummary(categoriesCreated, categoriesReused, notesCreated, notesSkipped), noteIds);
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
