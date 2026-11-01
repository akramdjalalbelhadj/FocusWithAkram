package com.focusflow.project;

import com.focusflow.common.exception.ApiException;
import com.focusflow.common.Patch;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final ProjectRepository repository;
    private final Clock clock;

    public ProjectService(ProjectRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProjectView> list() {
        Map<UUID, long[]> progress = new HashMap<>();
        for (Object[] row : repository.progressByProject()) {
            progress.put((UUID) row[0], new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        return repository.findAllByOrderByNameAsc().stream()
                .map(p -> {
                    long[] pr = progress.getOrDefault(p.getId(), new long[]{0, 0});
                    return new ProjectView(p, pr[0], pr[1]);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectView get(UUID id) {
        Project p = find(id);
        long[] pr = repository.progressByProject().stream()
                .filter(r -> r[0].equals(id)).findFirst()
                .map(r -> new long[]{((Number) r[1]).longValue(), ((Number) r[2]).longValue()})
                .orElse(new long[]{0, 0});
        return new ProjectView(p, pr[0], pr[1]);
    }

    @Transactional(readOnly = true)
    public Project find(UUID id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Projet", id));
    }

    @Transactional
    public Project create(Patch body) {
        String name = cleanName(body.string("name"));
        if (repository.existsByNameIgnoreCaseAndArchivedFalse(name)) {
            throw ApiException.conflict("PROJECT_NAME_TAKEN", "Un projet actif porte deja ce nom.");
        }
        Project p = new Project(name, Instant.now(clock));
        apply(p, body);
        return repository.save(p);
    }

    @Transactional
    public Project update(UUID id, Patch body) {
        Project p = find(id);
        if (body.has("name")) {
            String name = cleanName(body.string("name"));
            if (!name.equalsIgnoreCase(p.getName()) && repository.existsByNameIgnoreCaseAndArchivedFalse(name)) {
                throw ApiException.conflict("PROJECT_NAME_TAKEN", "Un projet actif porte deja ce nom.");
            }
            p.setName(name);
        }
        apply(p, body);
        if (body.has("archived")) {
            boolean archived = Boolean.TRUE.equals(body.bool("archived"));
            // La restauration ne doit pas creer de doublon de nom actif.
            if (!archived && p.isArchived() && repository.existsByNameIgnoreCaseAndArchivedFalse(p.getName())) {
                throw ApiException.conflict("PROJECT_NAME_TAKEN", "Un projet actif porte deja ce nom.");
            }
            p.setArchived(archived);
        }
        return p;
    }

    /** Supprime le projet ; les taches sont conservees (project_id passe a NULL par la base). */
    @Transactional
    public void delete(UUID id) {
        repository.delete(find(id));
    }

    private void apply(Project p, Patch body) {
        if (body.has("description")) {
            p.setDescription(body.string("description"));
        }
        if (body.has("color")) {
            String color = body.string("color");
            if (color == null || !COLOR.matcher(color).matches()) {
                throw new IllegalArgumentException("Couleur invalide (format #rrggbb attendu).");
            }
            p.setColor(color);
        }
        if (body.has("icon")) {
            p.setIcon(body.string("icon"));
        }
        if (body.has("dueAt")) {
            p.setDueAt(body.instant("dueAt"));
        }
    }

    private static String cleanName(String raw) {
        String name = raw == null ? "" : raw.strip();
        if (name.isEmpty() || name.length() > 120) {
            throw new IllegalArgumentException("Le nom du projet est obligatoire (120 caracteres maximum).");
        }
        return name;
    }
}
