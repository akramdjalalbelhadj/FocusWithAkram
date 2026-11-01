package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.OccurrenceRequest;
import com.focusflow.finance.dto.ScheduleRequest;
import com.focusflow.finance.dto.ScheduleResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Echeanciers (salaire, abonnements, charges, paiements en plusieurs fois) et leurs echeances. Les echeances a venir
 * sont calculees ; une echeance n'est enregistree qu'une fois, lorsqu'elle est realisee, sautee ou ajustee.
 */
@Service
public class ScheduleService {

    /**
     * Les echeances passees non confirmees restent proposees (en retard) pendant cette periode ; au-dela, elles sont
     * considerees comme reglees hors de l'application et ne pesent plus sur les previsions.
     */
    public static final int OVERDUE_LOOKBACK_DAYS = 92;

    private final ScheduleRepository schedules;
    private final OperationRepository operations;
    private final AccountService accounts;
    private final CategoryService categories;
    private final FinanceDates dates;
    private final Clock clock;

    public ScheduleService(ScheduleRepository schedules, OperationRepository operations, AccountService accounts,
                           CategoryService categories, FinanceDates dates, Clock clock) {
        this.schedules = schedules;
        this.operations = operations;
        this.accounts = accounts;
        this.categories = categories;
        this.dates = dates;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> list() {
        LocalDate today = dates.today();
        return schedules.findAllOrdered().stream().map(s -> toResponse(s, today)).toList();
    }

    @Transactional(readOnly = true)
    public ScheduleResponse get(UUID id) {
        return toResponse(find(id), dates.today());
    }

    @Transactional(readOnly = true)
    public Schedule find(UUID id) {
        return schedules.findById(id).orElseThrow(() -> ApiException.notFound("Echeancier", id));
    }

    @Transactional
    public UUID create(ScheduleRequest request) {
        return schedules.save(Schedule.create(draft(request, null), Instant.now(clock))).getId();
    }

    @Transactional
    public void update(UUID id, ScheduleRequest request) {
        Schedule s = find(id);
        if (s.getType() != request.type() && operations.existsByScheduleId(id)) {
            throw ApiException.rule("SCHEDULE_TYPE_LOCKED",
                    "Des echeances sont deja enregistrees : le type (revenu ou depense) ne peut plus changer.");
        }
        s.apply(draft(request, s), Instant.now(clock));
    }

    /** Suppression reservee a un echeancier sans echeance enregistree ; sinon, le resilier. */
    @Transactional
    public void delete(UUID id) {
        Schedule s = find(id);
        if (operations.existsByScheduleId(id)) {
            throw ApiException.conflict("SCHEDULE_IN_USE",
                    "Des echeances sont enregistrees : resiliez l'echeancier pour conserver son historique.");
        }
        schedules.delete(s);
    }

    @Transactional
    public void pause(UUID id) {
        find(id).pause(Instant.now(clock));
    }

    @Transactional
    public void resume(UUID id) {
        find(id).resume(dates.today(), Instant.now(clock));
    }

    /** Resilie a partir d'aujourd'hui : les echeances deja passees restent proposees si elles ne sont pas reglees. */
    @Transactional
    public void end(UUID id) {
        find(id).end(dates.today(), Instant.now(clock));
    }

    /**
     * Echeances calculees non enregistrees dont la date tombe dans [from, to], sous forme d'operations prevues
     * virtuelles (jamais enregistrees).
     */
    @Transactional(readOnly = true)
    public List<Operation> virtualOccurrences(LocalDate from, LocalDate to) {
        Set<String> recorded = new HashSet<>();
        for (Operation o : operations.findOccurrencesBetween(from, to)) {
            recorded.add(o.getSchedule().getId() + "/" + o.getDueDate());
        }
        Instant now = Instant.now(clock);
        List<Operation> result = new ArrayList<>();
        for (Schedule s : schedules.findAllOrdered()) {
            for (LocalDate due : s.dueDatesBetween(from, to)) {
                if (!recorded.contains(s.getId() + "/" + due)) {
                    result.add(s.virtualOccurrence(due, now));
                }
            }
        }
        return result;
    }

    /** Debut de la fenetre des echeances en retard encore proposees. */
    public LocalDate overdueWindowStart() {
        return dates.today().minusDays(OVERDUE_LOOKBACK_DAYS);
    }

    /** Realise l'echeance (salaire recu, abonnement paye) avec le montant et la date reels ; le prevu est conserve. */
    @Transactional
    public UUID completeOccurrence(UUID scheduleId, LocalDate due, OccurrenceRequest request) {
        if (request.date().isAfter(dates.today())) {
            throw ApiException.rule("FUTURE_COMPLETED_OPERATION",
                    "Une operation realisee ne peut pas etre datee dans le futur.");
        }
        Schedule s = find(scheduleId);
        Instant now = Instant.now(clock);
        Operation o = occurrence(s, due, now);
        o.settleOccurrence(s.getAmount(), request.amount(), request.date(), now);
        return operations.save(o).getId();
    }

    /** Saute l'echeance (mois sans salaire, abonnement non renouvele ce mois-ci) : elle n'est plus attendue. */
    @Transactional
    public UUID skipOccurrence(UUID scheduleId, LocalDate due) {
        Schedule s = find(scheduleId);
        Instant now = Instant.now(clock);
        Operation o = occurrence(s, due, now);
        if (o.getStatus() == OperationStatus.COMPLETED) {
            throw ApiException.rule("OCCURRENCE_ALREADY_RECORDED",
                    "Cette echeance est deja realisee : annulez l'operation correspondante si elle n'a pas eu lieu.");
        }
        if (o.getStatus() == OperationStatus.PLANNED) {
            o.cancel(now);
        }
        return operations.save(o).getId();
    }

    /** Ajuste une echeance a venir (montant ou date differents pour cette fois) sans modifier l'echeancier. */
    @Transactional
    public UUID adjustOccurrence(UUID scheduleId, LocalDate due, OccurrenceRequest request) {
        Schedule s = find(scheduleId);
        Instant now = Instant.now(clock);
        Operation o = occurrence(s, due, now);
        o.adjustOccurrence(request.amount(), request.date(), now);
        return operations.save(o).getId();
    }

    /** Operation enregistree de l'echeance, ou nouvelle operation prevue liee si l'echeance n'est pas encore enregistree. */
    private Operation occurrence(Schedule s, LocalDate due, Instant now) {
        return operations.findByScheduleIdAndDueDate(s.getId(), due).orElseGet(() -> {
            if (!s.dueDatesBetween(due, due).contains(due)) {
                throw ApiException.rule("INVALID_OCCURRENCE", "Cette date n'est pas une echeance de « " + s.getLabel() + " ».");
            }
            Operation o = Operation.create(new Operation.Draft(s.getAccount(), null, s.getType(), OperationStatus.PLANNED,
                    null, due, s.getAmount(), s.getCategory(), s.getIncomeKind(), s.getLabel(), null, s.isEssential(),
                    false, null), now);
            o.linkOccurrence(s, due);
            return o;
        });
    }

    private Schedule.Draft draft(ScheduleRequest r, Schedule existing) {
        Account account = accounts.find(r.accountId());
        if (account.isArchived() && (existing == null || !existing.getAccount().getId().equals(account.getId()))) {
            throw ApiException.rule("ACCOUNT_ARCHIVED", "Le compte « " + account.getName() + " » est archive.");
        }
        Category category = null;
        if (r.categoryId() != null) {
            category = categories.find(r.categoryId());
            boolean unchanged = existing != null && existing.getCategory() != null
                    && existing.getCategory().getId().equals(category.getId());
            if (category.isArchived() && !unchanged) {
                throw ApiException.rule("CATEGORY_ARCHIVED", "La categorie « " + category.getName() + " » est archivee.");
            }
        }
        int interval = r.intervalCount() == null ? 1 : r.intervalCount();
        LocalDate end = r.endDate();
        if (r.occurrences() != null) {
            if (r.occurrences() < 1 || r.occurrences() > 600) {
                throw ApiException.rule("INVALID_SCHEDULE", "Le nombre d'echeances doit etre compris entre 1 et 600.");
            }
            end = lastOf(r.frequency(), interval, r.startDate(), r.occurrences());
        }
        return new Schedule.Draft(r.label(), r.type(), r.kind(), account, category, r.incomeKind(), r.amount(),
                Boolean.TRUE.equals(r.essential()), r.frequency(), interval, r.startDate(), end, r.notes());
    }

    /** Date de la n-ieme echeance (paiement en plusieurs fois). */
    private static LocalDate lastOf(Frequency frequency, int interval, LocalDate start, int count) {
        long step = (long) (count - 1) * interval;
        return switch (frequency) {
            case WEEKLY -> start.plusWeeks(step);
            case MONTHLY -> start.plusMonths(step);
            case YEARLY -> start.plusYears(step);
        };
    }

    private ScheduleResponse toResponse(Schedule s, LocalDate today) {
        return new ScheduleResponse(s.getId(), s.getLabel(), s.getType(), s.getKind(), FinanceMapper.ref(s.getAccount()),
                FinanceMapper.ref(s.getCategory()), s.getIncomeKind(), s.getAmount(), s.isEssential(), s.getFrequency(),
                s.getIntervalCount(), s.getStartDate(), s.getEndDate(), s.getStatus(), s.getNotes(), s.nextDueDate(today),
                s.monthlyEquivalent(), s.annualEquivalent(),
                operations.existsByScheduleId(s.getId()));
    }
}
