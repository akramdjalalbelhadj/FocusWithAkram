package com.focusflow.finance.dto;

import java.util.UUID;

/** Categorie d'une operation, avec sa racine pour les regroupements. */
public record CategoryRef(UUID id, String name, UUID rootId, String rootName, String icon, String color) {
}
