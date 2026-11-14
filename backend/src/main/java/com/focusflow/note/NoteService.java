package com.focusflow.note;

import com.focusflow.common.PageResponse;
import com.focusflow.common.Patch;
import com.focusflow.common.exception.ApiException;
import com.focusflow.note.dto.CreateNoteRequest;
import com.focusflow.note.dto.CreateTaskFromNoteRequest;
import com.focusflow.note.dto.NoteResponse;
import com.focusflow.note.dto.NoteSummary;
import com.focusflow.task.OriginProgress;
import com.focusflow.task.TaskService;
import com.focusflow.task.dto.TaskResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cas d'usage des idees : saisie, enrichissement, recherche, suppression et transformation en taches.
 * Les taches sont creees par {@link TaskService}, avec les regles habituelles de la matrice : il n'existe pas
 * de second systeme de taches. Le domaine des taches ne connait l'idee que par son identifiant.
 */
@Service
public class NoteService {

    private static final Set<String> SORTABLE = Set.of("updatedAt", "createdAt", "title");

    private final NoteRepository notes;
    private final NoteCategoryService categories;
    private final TaskService tasks;
    private final Clock clock;

    public NoteService(NoteRepository notes, NoteCategoryService categories, TaskService tasks, Clock clock) {
        this.notes = notes;
        this.categories = categories;
        this.tasks = tasks;
        this.clock = clock;
    }

    // ---- Lecture ------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<NoteSummary> search(NoteFilter filter, int page, int size, String sortBy, boolean descending) {
        String field = SORTABLE.contains(sortBy) ? sortBy : "updatedAt";
        Sort.Order order = new Sort.Order(descending ? Sort.Direction.DESC : Sort.Direction.ASC, field);
        if (field.equals("title")) {
            order = order.ignoreCase();
        }
        Page<Note> result = notes.findAll(NoteSpecifications.matching(filter),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200), Sort.by(order).and(Sort.by("id"))));
        Map<UUID, OriginProgress> progress = tasks.progressByNote(result.getContent().stream().map(Note::getId).toList());
        return PageResponse.of(result, n -> NoteMapper.toSummary(n, progress.get(n.getId())));
    }

    @Transactional(readOnly = true)
    public NoteResponse get(UUID id) {
        return NoteMapper.toResponse(find(id), tasks.fromNote(id));
    }

    @Transactional(readOnly = true)
    public List<String> tags() {
        return notes.findAllTagNames().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
    }

    // ---- Ecriture -----------------------------------------------------------------------------

    @Transactional
    public NoteResponse create(CreateNoteRequest req) {
        Note n = new Note(req.title(), now());
        n.rewrite(req.content());
        n.retag(req.tags());
        n.setFavorite(Boolean.TRUE.equals(req.favorite()));
        if (req.categoryId() != null) {
            n.setCategory(categories.find(req.categoryId()));
        }
        return NoteMapper.toResponse(notes.save(n), List.of());
    }

    /**
     * Modification partielle (enregistrement automatique de l'editeur). La date de modification suit le titre,
     * le contenu, la categorie et les etiquettes ; mettre en favori ne compte pas comme une modification.
     */
    @Transactional
    public NoteResponse update(UUID id, Patch p) {
        Note n = find(id);
        boolean edited = false;
        if (p.has("title")) {
            n.retitle(p.string("title"));
            edited = true;
        }
        if (p.has("content")) {
            n.rewrite(p.string("content"));
            edited = true;
        }
        if (p.has("categoryId")) {
            UUID categoryId = p.uuid("categoryId");
            n.setCategory(categoryId == null ? null : categories.find(categoryId));
            edited = true;
        }
        if (p.has("tags")) {
            n.retag(p.strings("tags"));
            edited = true;
        }
        if (p.has("favorite")) {
            n.setFavorite(Boolean.TRUE.equals(p.bool("favorite")));
        }
        if (edited) {
            n.touch(now());
        }
        return NoteMapper.toResponse(n, tasks.fromNote(id));
    }

    /** Delai de reflexion avant l'effacement d'une idee supprimee dont des taches sont issues. */
    public static final Duration DELETE_GRACE = Duration.ofHours(72);

    /**
     * Suppression demandee depuis l'interface. {@code archive} : l'idee rejoint les archives. {@code delete} :
     * sans tache liee, l'idee est effacee tout de suite (renvoie null) ; sinon elle reste {@link #DELETE_GRACE}
     * dans les archives, restaurable, puis est effacee et ses taches perdent seulement le lien.
     */
    @Transactional
    public NoteResponse remove(UUID id, String mode) {
        Note n = find(id);
        Instant now = now();
        switch (mode.toLowerCase(Locale.ROOT)) {
            case "archive" -> n.archive(NoteArchiveReason.ARCHIVED, now, null);
            case "delete" -> {
                if (tasks.countFromNote(id) == 0) {
                    notes.delete(n);
                    return null;
                }
                n.archive(NoteArchiveReason.DELETED, now, now.plus(DELETE_GRACE));
            }
            default -> throw new IllegalArgumentException("Mode de suppression inconnu : " + mode + " (archive ou delete).");
        }
        return NoteMapper.toResponse(n, tasks.fromNote(id));
    }

    @Transactional
    public NoteResponse restore(UUID id) {
        Note n = find(id);
        n.restore();
        return NoteMapper.toResponse(n, tasks.fromNote(id));
    }

    /** Efface les idees supprimees dont le delai est ecoule ; leurs taches restent, sans lien. */
    @Transactional
    public int purgeExpired() {
        List<UUID> expired = notes.findAllByPurgeAtLessThanEqual(now()).stream().map(Note::getId).toList();
        for (UUID id : expired) {
            // Mise a jour groupee (vide le contexte de persistance) : suppression par identifiant ensuite.
            tasks.detachFromNote(id);
        }
        notes.deleteAllById(expired);
        return expired.size();
    }

    /**
     * Ancien contrat (sans mode). Supprime une idee. Refuse tant que des taches en sont issues, sauf suppression forcee : l'idee est alors
     * supprimee et ses taches, conservees dans la matrice, perdent seulement le lien.
     */
    @Transactional
    public void delete(UUID id, boolean force) {
        if (!notes.existsById(id)) {
            throw ApiException.notFound("Idee", id);
        }
        long linked = tasks.countFromNote(id);
        if (linked > 0 && !force) {
            throw ApiException.conflict("NOTE_HAS_TASKS", linked == 1
                    ? "Cette idee a donne naissance a une tache : la supprimer couperait le lien avec elle."
                    : "Cette idee a donne naissance a " + linked + " taches : la supprimer couperait le lien avec elles.");
        }
        if (linked > 0) {
            // Mise a jour groupee (vide le contexte de persistance) : l'idee est chargee seulement apres.
            tasks.detachFromNote(id);
        }
        notes.delete(find(id));
    }

    // ---- Transformation en tache --------------------------------------------------------------

    /**
     * Cree une tache issue de l'idee, avec les regles habituelles des taches (quadrant, dates...). L'idee est
     * verrouillee pendant la creation : deux envois simultanes ne produisent pas deux taches. Un titre deja
     * utilise par une tache de cette idee exige une confirmation explicite ({@code allowDuplicate}).
     * L'idee quitte ensuite la liste des idees : elle rejoint les archives comme « ancienne idee » (CONVERTED).
     */
    @Transactional
    public TaskResponse createTask(UUID noteId, CreateTaskFromNoteRequest req) {
        notes.findForUpdate(noteId).orElseThrow(() -> ApiException.notFound("Idee", noteId));
        if (!Boolean.TRUE.equals(req.allowDuplicate()) && tasks.existsFromNoteWithTitle(noteId, req.task().title())) {
            throw ApiException.conflict("NOTE_TASK_DUPLICATE",
                    "Une tache « " + req.task().title().strip() + " » issue de cette idee existe deja.");
        }
        TaskResponse created = tasks.create(req.task(), noteId);
        Note n = find(noteId);
        if (!n.isArchived()) {
            n.archive(NoteArchiveReason.CONVERTED, now(), null);
        }
        return created;
    }

    // ---- Utilitaires --------------------------------------------------------------------------

    private Note find(UUID id) {
        return notes.findById(id).orElseThrow(() -> ApiException.notFound("Idee", id));
    }

    private Instant now() {
        return Instant.now(clock);
    }
}
