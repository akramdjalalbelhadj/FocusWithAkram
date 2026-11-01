package com.focusflow.finance;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LoanRepository extends JpaRepository<Loan, UUID> {

    @Query("select l from Loan l order by l.cancelled asc, l.startDate desc, l.createdAt desc")
    List<Loan> findAllOrdered();
}
