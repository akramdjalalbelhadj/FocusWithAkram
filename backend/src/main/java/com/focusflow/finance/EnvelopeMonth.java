package com.focusflow.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Objects;
import java.util.UUID;

/**
 * Suivi d'une enveloppe pour un mois : commentaire qui explique un depassement et operation de « total du mois »
 * (depense creee pour que le depense du mois egale le total saisi). N'existe que si l'un des deux est renseigne.
 */
@Entity
@Table(name = "fin_envelope_month")
@IdClass(EnvelopeMonth.Key.class)
public class EnvelopeMonth {

    public static final int MAX_COMMENT = 1000;

    @Id
    @Column(name = "envelope_id")
    private UUID envelopeId;

    /** Premier jour du mois. */
    @Id
    @Column(name = "month")
    private LocalDate month;

    private String comment;

    /** Operation de total du mois (effacee par la base si l'operation est supprimee). */
    @Column(name = "total_operation_id")
    private UUID totalOperationId;

    protected EnvelopeMonth() {
    }

    public EnvelopeMonth(UUID envelopeId, YearMonth month) {
        this.envelopeId = envelopeId;
        this.month = month.atDay(1);
    }

    /** Commentaire nettoye : vide = absent. */
    public void setComment(String raw) {
        String text = raw == null || raw.isBlank() ? null : raw.strip();
        if (text != null && text.length() > MAX_COMMENT) {
            throw new IllegalArgumentException("Le commentaire est limite a " + MAX_COMMENT + " caracteres.");
        }
        comment = text;
    }

    public void setTotalOperationId(UUID totalOperationId) {
        this.totalOperationId = totalOperationId;
    }

    /** Ni commentaire ni total : le suivi n'a plus lieu d'etre conserve. */
    public boolean isEmpty() {
        return comment == null && totalOperationId == null;
    }

    public UUID getEnvelopeId() { return envelopeId; }
    public YearMonth getMonth() { return YearMonth.from(month); }
    public String getComment() { return comment; }
    public UUID getTotalOperationId() { return totalOperationId; }

    /** Cle composee (enveloppe, mois). */
    public static class Key implements Serializable {
        private UUID envelopeId;
        private LocalDate month;

        protected Key() {
        }

        public Key(UUID envelopeId, YearMonth month) {
            this.envelopeId = envelopeId;
            this.month = month.atDay(1);
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k && Objects.equals(envelopeId, k.envelopeId) && Objects.equals(month, k.month);
        }

        @Override
        public int hashCode() {
            return Objects.hash(envelopeId, month);
        }
    }
}
