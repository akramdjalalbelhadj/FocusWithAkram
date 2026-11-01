package com.focusflow.finance.dto;

import java.util.List;
import java.util.UUID;

/** Categorie et, pour une racine, ses sous-categories. `operationCount` indique si elle peut etre supprimee. */
public record CategoryResponse(UUID id, UUID parentId, String name, String icon, String color, int position,
                               boolean archived, long operationCount, List<CategoryResponse> children) {
}
