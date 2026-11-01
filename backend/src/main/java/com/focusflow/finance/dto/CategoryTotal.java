package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Depenses payees nettes d'une categorie racine sur la periode. */
public record CategoryTotal(UUID categoryId, String name, String icon, String color, BigDecimal amount, long count) {
}
