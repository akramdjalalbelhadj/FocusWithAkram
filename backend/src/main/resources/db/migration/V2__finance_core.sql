-- Module « Mes achats » : socle financier (comptes, categories, operations).
-- Montants : NUMERIC(12,2), toujours positifs ; le sens est porte par `direction` (CREDIT / DEBIT)
-- et contraint par le type d'operation. Dates d'operation : jour local, sans heure.

CREATE TABLE fin_account (
    id         UUID PRIMARY KEY,
    name       VARCHAR(80) NOT NULL,
    type       VARCHAR(20) NOT NULL,
    archived   BOOLEAN     NOT NULL DEFAULT FALSE,
    position   INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    version    BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_account_type CHECK (type IN ('CURRENT', 'SAVINGS', 'CASH'))
);
CREATE UNIQUE INDEX ux_fin_account_name_active ON fin_account (lower(name)) WHERE archived = FALSE;

-- Deux niveaux au plus : une sous-categorie a un parent qui n'en a pas (verifie par le service).
CREATE TABLE fin_category (
    id         UUID PRIMARY KEY,
    parent_id  UUID REFERENCES fin_category (id) ON DELETE RESTRICT,
    name       VARCHAR(60) NOT NULL,
    icon       VARCHAR(40),
    color      VARCHAR(9),
    position   INTEGER     NOT NULL DEFAULT 0,
    archived   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    version    BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_category_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX ux_fin_category_name_active
    ON fin_category (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
    WHERE archived = FALSE;
CREATE INDEX ix_fin_category_parent ON fin_category (parent_id);

CREATE TABLE fin_operation (
    id                UUID PRIMARY KEY,
    account_id        UUID          NOT NULL REFERENCES fin_account (id) ON DELETE RESTRICT,
    target_account_id UUID REFERENCES fin_account (id) ON DELETE RESTRICT,
    type              VARCHAR(20)   NOT NULL,
    status            VARCHAR(20)   NOT NULL,
    direction         VARCHAR(6)    NOT NULL,
    operation_date    DATE          NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    planned_amount    NUMERIC(12,2),
    category_id       UUID REFERENCES fin_category (id) ON DELETE RESTRICT,
    income_kind       VARCHAR(20),
    label             VARCHAR(120)  NOT NULL,
    description       TEXT,
    essential         BOOLEAN       NOT NULL DEFAULT FALSE,
    exceptional       BOOLEAN       NOT NULL DEFAULT FALSE,
    refund_of_id      UUID REFERENCES fin_operation (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    version           BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_operation_type CHECK (type IN ('INCOME', 'EXPENSE', 'PURCHASE_REFUND', 'TRANSFER',
                                                     'OPENING_BALANCE', 'ADJUSTMENT')),
    CONSTRAINT ck_fin_operation_status CHECK (status IN ('PLANNED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_fin_operation_direction CHECK (direction IN ('CREDIT', 'DEBIT')),
    CONSTRAINT ck_fin_operation_amount CHECK (amount > 0),
    CONSTRAINT ck_fin_operation_planned_amount CHECK (planned_amount IS NULL OR planned_amount > 0),
    -- Sens impose par le type (le solde initial et la correction peuvent etre dans les deux sens).
    CONSTRAINT ck_fin_operation_type_direction CHECK (
        (type IN ('INCOME', 'PURCHASE_REFUND') AND direction = 'CREDIT')
        OR (type IN ('EXPENSE', 'TRANSFER') AND direction = 'DEBIT')
        OR type IN ('OPENING_BALANCE', 'ADJUSTMENT')),
    CONSTRAINT ck_fin_operation_category CHECK ((type IN ('EXPENSE', 'PURCHASE_REFUND')) = (category_id IS NOT NULL)),
    CONSTRAINT ck_fin_operation_income_kind CHECK ((type = 'INCOME') = (income_kind IS NOT NULL)),
    CONSTRAINT ck_fin_operation_transfer CHECK (
        (type = 'TRANSFER') = (target_account_id IS NOT NULL)
        AND (target_account_id IS NULL OR target_account_id <> account_id)),
    CONSTRAINT ck_fin_operation_flags CHECK (type = 'EXPENSE' OR (essential = FALSE AND exceptional = FALSE)),
    CONSTRAINT ck_fin_operation_always_completed CHECK (type NOT IN ('OPENING_BALANCE', 'ADJUSTMENT') OR status = 'COMPLETED')
);
CREATE INDEX ix_fin_operation_account_date ON fin_operation (account_id, operation_date);
CREATE INDEX ix_fin_operation_target ON fin_operation (target_account_id) WHERE target_account_id IS NOT NULL;
CREATE INDEX ix_fin_operation_date ON fin_operation (operation_date DESC, created_at DESC);
CREATE INDEX ix_fin_operation_category ON fin_operation (category_id);
-- Un seul solde initial par compte.
CREATE UNIQUE INDEX ux_fin_operation_opening ON fin_operation (account_id) WHERE type = 'OPENING_BALANCE';
