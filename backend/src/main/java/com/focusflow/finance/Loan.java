package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Pret accorde ou emprunt. Le versement et les remboursements sont des operations liees ; le reste du et le statut
 * en sont calcules. La regularisation abandonne explicitement le reste (sans mouvement d'argent).
 */
@Entity
@Table(name = "fin_loan")
public class Loan {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String person;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanDirection direction;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal principal;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    private String notes;

    @Column(name = "written_off_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal writtenOffAmount = Money.ZERO;

    @Column(name = "written_off_date")
    private LocalDate writtenOffDate;

    @Column(name = "written_off_reason")
    private String writtenOffReason;

    @Column(nullable = false)
    private boolean cancelled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Loan() {
    }

    public Loan(String person, LoanDirection direction, BigDecimal principal, LocalDate startDate, LocalDate dueDate,
                String notes, Instant now) {
        if (direction == null || startDate == null) {
            throw ApiException.rule("INVALID_LOAN", "Le sens et la date du pret sont obligatoires.");
        }
        this.direction = direction;
        this.principal = Money.positive(principal, "Le montant du pret");
        this.startDate = startDate;
        this.createdAt = now;
        describe(person, dueDate, notes, now);
    }

    /** Reconstruction depuis une sauvegarde. */
    public static Loan restored(UUID id, String person, LoanDirection direction, BigDecimal principal, LocalDate startDate,
                                LocalDate dueDate, String notes, BigDecimal writtenOff, LocalDate writtenOffDate,
                                String reason, boolean cancelled, Instant createdAt, Instant updatedAt) {
        Loan l = new Loan(person, direction, principal, startDate, dueDate, notes, createdAt);
        if (id != null) {
            l.id = id;
        }
        if (writtenOff != null && writtenOff.signum() > 0) {
            l.writtenOffAmount = Money.positive(writtenOff, "Le montant regularise");
            l.writtenOffDate = writtenOffDate != null ? writtenOffDate : startDate;
            l.writtenOffReason = reason;
        }
        l.cancelled = cancelled;
        l.updatedAt = updatedAt != null ? updatedAt : createdAt;
        return l;
    }

    /** Personne, echeance et notes : le montant et la date, eux, decoulent du versement enregistre. */
    public void describe(String person, LocalDate dueDate, String notes, Instant now) {
        String p = person == null ? "" : person.strip();
        if (p.isEmpty() || p.length() > 120) {
            throw ApiException.rule("INVALID_LOAN", "La personne est obligatoire (120 caracteres maximum).");
        }
        if (dueDate != null && dueDate.isBefore(startDate)) {
            throw ApiException.rule("INVALID_LOAN", "L'echeance de remboursement precede la date du pret.");
        }
        this.person = p;
        this.dueDate = dueDate;
        this.notes = notes == null || notes.isBlank() ? null : notes.strip();
        this.updatedAt = now;
    }

    /** Abandonne explicitement le reste du (« creance abandonnee » ou dette remise) ; aucun mouvement d'argent. */
    public void writeOff(BigDecimal remaining, LocalDate day, String reason, Instant now) {
        requireActive();
        if (remaining.signum() <= 0) {
            throw ApiException.rule("LOAN_SETTLED", "Ce pret est deja entierement rembourse.");
        }
        writtenOffAmount = remaining;
        writtenOffDate = day;
        writtenOffReason = reason == null || reason.isBlank() ? null : reason.strip();
        updatedAt = now;
    }

    /** Annule un pret saisi par erreur ; ses operations sont annulees par le service. */
    public void cancel(Instant now) {
        if (cancelled) {
            throw ApiException.rule("LOAN_CANCELLED", "Ce pret est deja annule.");
        }
        cancelled = true;
        updatedAt = now;
    }

    public void requireActive() {
        if (cancelled) {
            throw ApiException.rule("LOAN_CANCELLED", "Ce pret est annule.");
        }
        if (writtenOffAmount.signum() > 0) {
            throw ApiException.rule("LOAN_WRITTEN_OFF", "Le reste de ce pret a ete regularise.");
        }
    }

    /** Type d'operation du versement initial. */
    public OperationType disbursementType() {
        return direction == LoanDirection.LENT ? OperationType.LOAN_GIVEN : OperationType.LOAN_TAKEN;
    }

    /** Type d'operation d'un remboursement. */
    public OperationType repaymentType() {
        return direction == LoanDirection.LENT ? OperationType.LOAN_COLLECTED : OperationType.LOAN_REPAID;
    }

    public UUID getId() { return id; }
    public String getPerson() { return person; }
    public LoanDirection getDirection() { return direction; }
    public BigDecimal getPrincipal() { return principal; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getDueDate() { return dueDate; }
    public String getNotes() { return notes; }
    public BigDecimal getWrittenOffAmount() { return writtenOffAmount; }
    public LocalDate getWrittenOffDate() { return writtenOffDate; }
    public String getWrittenOffReason() { return writtenOffReason; }
    public boolean isCancelled() { return cancelled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
