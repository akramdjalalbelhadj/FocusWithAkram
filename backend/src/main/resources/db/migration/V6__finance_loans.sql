-- Module « Mes achats » : prets accordes et emprunts. Le reste du, le statut (en cours, solde, regularise) et le retard
-- sont calcules a partir des operations liees ; seuls la regularisation et l'annulation sont enregistrees.

CREATE TABLE fin_loan (
    id                 UUID PRIMARY KEY,
    person             VARCHAR(120)  NOT NULL,
    direction          VARCHAR(10)   NOT NULL,
    principal          NUMERIC(12,2) NOT NULL,
    start_date         DATE          NOT NULL,
    due_date           DATE,
    notes              TEXT,
    written_off_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    written_off_date   DATE,
    written_off_reason VARCHAR(500),
    cancelled          BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ   NOT NULL,
    updated_at         TIMESTAMPTZ   NOT NULL,
    version            BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_loan_direction CHECK (direction IN ('LENT', 'BORROWED')),
    CONSTRAINT ck_fin_loan_principal CHECK (principal > 0),
    CONSTRAINT ck_fin_loan_due CHECK (due_date IS NULL OR due_date >= start_date),
    CONSTRAINT ck_fin_loan_write_off CHECK (written_off_amount >= 0
        AND (written_off_amount > 0) = (written_off_date IS NOT NULL))
);

-- Mouvements d'un pret : versement (LOAN_GIVEN / LOAN_TAKEN) et remboursements (LOAN_COLLECTED / LOAN_REPAID).
-- Ils modifient les soldes mais ne sont ni des revenus ni des depenses.
ALTER TABLE fin_operation ADD COLUMN loan_id UUID REFERENCES fin_loan (id) ON DELETE RESTRICT;
CREATE INDEX ix_fin_operation_loan ON fin_operation (loan_id) WHERE loan_id IS NOT NULL;

ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_type;
ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_type CHECK (type IN ('INCOME', 'EXPENSE', 'PURCHASE_REFUND',
    'TRANSFER', 'OPENING_BALANCE', 'ADJUSTMENT', 'LOAN_GIVEN', 'LOAN_COLLECTED', 'LOAN_TAKEN', 'LOAN_REPAID'));

ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_type_direction;
ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_type_direction CHECK (
    (type IN ('INCOME', 'PURCHASE_REFUND', 'LOAN_COLLECTED', 'LOAN_TAKEN') AND direction = 'CREDIT')
    OR (type IN ('EXPENSE', 'TRANSFER', 'LOAN_GIVEN', 'LOAN_REPAID') AND direction = 'DEBIT')
    OR type IN ('OPENING_BALANCE', 'ADJUSTMENT'));

ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_loan CHECK (
    (type IN ('LOAN_GIVEN', 'LOAN_COLLECTED', 'LOAN_TAKEN', 'LOAN_REPAID')) = (loan_id IS NOT NULL));
