package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Regles monetaires : decimal exact, deux decimales au plus, jamais de flottant. */
public final class Money {

    /** Borne de NUMERIC(12,2). */
    public static final BigDecimal MAX = new BigDecimal("9999999999.99");
    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private Money() {
    }

    /** Montant strictement positif, au centime, ramene a deux decimales. */
    public static BigDecimal positive(BigDecimal value, String field) {
        BigDecimal v = cents(value, field);
        if (v.signum() <= 0) {
            throw ApiException.rule("INVALID_AMOUNT", field + " doit etre strictement positif.");
        }
        return v;
    }

    /** Montant signe (solde, correction), au centime, ramene a deux decimales. */
    public static BigDecimal cents(BigDecimal value, String field) {
        if (value == null) {
            throw ApiException.rule("INVALID_AMOUNT", field + " est obligatoire.");
        }
        if (value.stripTrailingZeros().scale() > 2) {
            throw ApiException.rule("INVALID_AMOUNT", field + " ne peut pas avoir plus de deux decimales.");
        }
        BigDecimal v = value.setScale(2, RoundingMode.UNNECESSARY);
        if (v.abs().compareTo(MAX) > 0) {
            throw ApiException.rule("INVALID_AMOUNT", field + " depasse le montant maximal autorise.");
        }
        return v;
    }

    public static BigDecimal orZero(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.UNNECESSARY);
    }
}
