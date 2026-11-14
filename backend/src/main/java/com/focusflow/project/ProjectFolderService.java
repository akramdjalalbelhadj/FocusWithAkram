package com.focusflow.project;

import com.focusflow.common.Patch;
import com.focusflow.common.exception.ApiException;
import com.focusflow.project.dto.ProjectFolderResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dossiers de projets : un seul niveau, noms uniques sans tenir compte de la casse. */
@Service
public class ProjectFolderService {

    public static final int MAX_NAME = 80;
    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final ProjectFolderRepository repository;
    private final Clock clock;

    public ProjectFolderService(ProjectFolderRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProjectFolderResponse> list() {
        Map<UUID, Long> counts = counts();
        return repository.findAllByOrderByNameAsc().stream()
                .map(f -> toResponse(f, counts.getOrDefault(f.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectFolderResponse response(ProjectFolder f) {
        return toResponse(f, counts().getOrDefault(f.getId(), 0L));
    }

    @Transactional(readOnly = true)
    public ProjectFolder find(UUID id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Dossier", id));
    }

    @Transactional
    public ProjectFolder create(Patch body) {
        String name = cleanName(body.string("name"));
        if (repository.existsByNameIgnoreCase(name)) {
            throw taken();
        }
        ProjectFolder f = new ProjectFolder(name, Instant.now(clock));
        applyColor(f, body);
        return repository.save(f);
    }

    @Transactional
    public ProjectFolder update(UUID id, Patch body) {
        ProjectFolder f = find(id);
        if (body.has("name")) {
            String name = cleanName(body.string("name"));
            if (!name.equalsIgnoreCase(f.getName()) && repository.existsByNameIgnoreCase(name)) {
                throw taken();
            }
            f.setName(name);
        }
        applyColor(f, body);
        return f;
    }

    /** Supprime le dossier ; la base remet a NULL le dossier de ses projets. */
    @Transactional
    public void delete(UUID id) {
        repository.delete(find(id));
    }

    public static boolean validColor(String color) {
        return color != null && COLOR.matcher(color).matches();
    }

    public static String cleanName(String raw) {
        String name = raw == null ? "" : raw.strip();
        if (name.isEmpty() || name.length() > MAX_NAME) {
            throw new IllegalArgumentException("Le nom du dossier est obligatoire (" + MAX_NAME + " caracteres maximum).");
        }
        return name;
    }

    private Map<UUID, Long> counts() {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : repository.projectCounts()) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static void applyColor(ProjectFolder f, Patch body) {
        if (body.has("color")) {
            String color = body.string("color");
            if (!validColor(color)) {
                throw new IllegalArgumentException("Couleur invalide (format #rrggbb attendu).");
            }
            f.setColor(color);
        }
    }

    private static ApiException taken() {
        return ApiException.conflict("FOLDER_NAME_TAKEN", "Un dossier porte deja ce nom.");
    }

    private static ProjectFolderResponse toResponse(ProjectFolder f, long projectCount) {
        return new ProjectFolderResponse(f.getId(), f.getName(), f.getColor(), f.getCreatedAt(), projectCount);
    }
}
