package com.focusflow.finance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthlyBudgetRepository extends JpaRepository<MonthlyBudget, UUID> {

    Optional<MonthlyBudget> findByMonth(LocalDate month);

    List<MonthlyBudget> findAllByOrderByMonthAsc();
}
