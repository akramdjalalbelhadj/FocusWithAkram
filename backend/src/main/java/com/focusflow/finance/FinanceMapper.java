package com.focusflow.finance;

import com.focusflow.finance.dto.AccountRef;
import com.focusflow.finance.dto.CategoryRef;
import com.focusflow.finance.dto.OperationResponse;
import java.time.LocalDate;

/** Conversion explicite des entites financieres vers le contrat HTTP. */
public final class FinanceMapper {

    private FinanceMapper() {
    }

    public static AccountRef ref(Account a) {
        return a == null ? null : new AccountRef(a.getId(), a.getName(), a.getType());
    }

    public static CategoryRef ref(Category c) {
        if (c == null) {
            return null;
        }
        Category root = c.root();
        return new CategoryRef(c.getId(), c.getName(), root.getId(), root.getName(),
                c.getIcon() != null ? c.getIcon() : root.getIcon(), c.getColor() != null ? c.getColor() : root.getColor());
    }

    public static OperationResponse toResponse(Operation o, LocalDate today) {
        boolean overdue = o.getStatus() == OperationStatus.PLANNED && o.getDate().isBefore(today);
        return new OperationResponse(o.isVirtual() ? null : o.getId(), ref(o.getAccount()), ref(o.getTargetAccount()), o.getType(), o.getStatus(),
                o.getDirection(), o.getDate(), o.getAmount(), o.getPlannedAmount(), ref(o.getCategory()), o.getIncomeKind(),
                o.getLabel(), o.getDescription(), o.isEssential(), o.isExceptional(),
                o.getRefundOf() == null ? null : o.getRefundOf().getId(), overdue, o.getCreatedAt(), o.getUpdatedAt(),
                o.getSchedule() == null ? null : o.getSchedule().getId(), o.getDueDate(), o.isVirtual());
    }
}
