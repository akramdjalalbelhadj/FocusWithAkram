package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.CategoryRequest;
import com.focusflow.finance.dto.CategoryResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Categories de depenses sur deux niveaux. Une categorie utilisee par des operations s'archive au lieu d'etre
 * supprimee ; archiver une racine archive ses sous-categories.
 */
@Service
public class CategoryService {

    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final CategoryRepository categories;
    private final OperationRepository operations;
    private final EnvelopeRepository envelopes;
    private final Clock clock;

    public CategoryService(CategoryRepository categories, OperationRepository operations, EnvelopeRepository envelopes,
                           Clock clock) {
        this.categories = categories;
        this.operations = operations;
        this.envelopes = envelopes;
        this.clock = clock;
    }

    /** Arbre complet (archives comprises), racines puis sous-categories, dans l'ordre d'affichage. */
    @Transactional(readOnly = true)
    public List<CategoryResponse> tree() {
        Map<UUID, Long> usage = new HashMap<>();
        for (Object[] row : operations.countByCategory()) {
            usage.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        List<Category> all = categories.findAllOrdered();
        Map<UUID, List<CategoryResponse>> children = new LinkedHashMap<>();
        for (Category c : all) {
            if (c.getParent() != null) {
                children.computeIfAbsent(c.getParent().getId(), k -> new ArrayList<>())
                        .add(toResponse(c, usage, List.of()));
            }
        }
        return all.stream().filter(c -> c.getParent() == null)
                .map(c -> toResponse(c, usage, children.getOrDefault(c.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Category find(UUID id) {
        return categories.findById(id).orElseThrow(() -> ApiException.notFound("Categorie", id));
    }

    @Transactional
    public UUID create(CategoryRequest request) {
        Category parent = parentOf(request.parentId(), null);
        String name = cleanName(request.name());
        if (categories.existsActiveName(name, request.parentId(), null)) {
            throw ApiException.conflict("CATEGORY_NAME_TAKEN", "Une categorie active porte deja ce nom a ce niveau.");
        }
        Category c = new Category(parent, name, Instant.now(clock));
        apply(c, request);
        return categories.save(c).getId();
    }

    @Transactional
    public void update(UUID id, CategoryRequest request) {
        Category c = find(id);
        Category parent = parentOf(request.parentId(), c);
        if (parent != null && categories.existsByParentId(id)) {
            throw ApiException.rule("CATEGORY_DEPTH",
                    "Une categorie qui a des sous-categories ne peut pas devenir elle-meme une sous-categorie.");
        }
        String name = cleanName(request.name());
        boolean archived = Boolean.TRUE.equals(request.archived());
        if (!archived && categories.existsActiveName(name, request.parentId(), id)) {
            throw ApiException.conflict("CATEGORY_NAME_TAKEN", "Une categorie active porte deja ce nom a ce niveau.");
        }
        if (!archived && parent != null && parent.isArchived()) {
            throw ApiException.rule("CATEGORY_PARENT_ARCHIVED", "La categorie parente est archivee.");
        }
        c.setParent(parent);
        c.setName(name);
        apply(c, request);
        if (archived && parent == null) {
            categories.findByParentId(id).forEach(child -> child.setArchived(true));
        }
    }

    /** Suppression reservee a une categorie jamais utilisee et sans sous-categorie ; sinon, archiver. */
    @Transactional
    public void delete(UUID id) {
        Category c = find(id);
        if (categories.existsByParentId(id)) {
            throw ApiException.conflict("CATEGORY_HAS_CHILDREN",
                    "Cette categorie contient des sous-categories : supprimez-les ou archivez-la.");
        }
        if (operations.existsByCategoryIdIn(List.of(id))) {
            throw ApiException.conflict("CATEGORY_IN_USE",
                    "Des operations utilisent cette categorie : archivez-la pour la masquer sans perdre l'historique.");
        }
        if (envelopes.existsByCategoryId(id)) {
            throw ApiException.conflict("CATEGORY_IN_USE",
                    "Une depense variable plafonnee suit cette categorie : supprimez-la d'abord, ou archivez la categorie.");
        }
        categories.delete(c);
    }

    private Category parentOf(UUID parentId, Category self) {
        if (parentId == null) {
            return null;
        }
        if (self != null && parentId.equals(self.getId())) {
            throw ApiException.rule("CATEGORY_DEPTH", "Une categorie ne peut pas etre son propre parent.");
        }
        Category parent = find(parentId);
        if (parent.getParent() != null) {
            throw ApiException.rule("CATEGORY_DEPTH", "Les categories ont deux niveaux au plus.");
        }
        return parent;
    }

    private static void apply(Category c, CategoryRequest request) {
        if (request.color() != null && !request.color().isBlank() && !COLOR.matcher(request.color()).matches()) {
            throw new IllegalArgumentException("Couleur invalide (format #rrggbb attendu).");
        }
        c.setIcon(request.icon() == null || request.icon().isBlank() ? null : request.icon().strip());
        c.setColor(request.color() == null || request.color().isBlank() ? null : request.color());
        c.setPosition(request.position() == null ? 0 : request.position());
        c.setArchived(Boolean.TRUE.equals(request.archived()));
    }

    private static CategoryResponse toResponse(Category c, Map<UUID, Long> usage, List<CategoryResponse> children) {
        return new CategoryResponse(c.getId(), c.getParent() == null ? null : c.getParent().getId(), c.getName(),
                c.getIcon(), c.getColor(), c.getPosition(), c.isArchived(), usage.getOrDefault(c.getId(), 0L), children);
    }

    private static String cleanName(String raw) {
        String name = raw == null ? "" : raw.strip();
        if (name.isEmpty() || name.length() > 60) {
            throw new IllegalArgumentException("Le nom de la categorie est obligatoire (60 caracteres maximum).");
        }
        return name;
    }
}
