package com.focusflow.finance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnvelopeMonthRepository extends JpaRepository<EnvelopeMonth, EnvelopeMonth.Key> {

    List<EnvelopeMonth> findByMonth(LocalDate month);

    List<EnvelopeMonth> findAllByOrderByMonthAsc();

    boolean existsByTotalOperationId(UUID totalOperationId);
}
