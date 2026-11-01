-- Module « Mes achats » : preferences, budgets mensuels et echeanciers (salaire, abonnements, charges).
-- Les occurrences d'un echeancier sont calculees ; seules les occurrences realisees, sautees ou ajustees
-- sont enregistrees, comme operations liees (schedule_id, due_date), une seule fois par echeance.

CREATE TABLE fin_preferences (
    id                     SMALLINT PRIMARY KEY CHECK (id = 1),
    safety_reserve         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (safety_reserve >= 0),
    savings_floor          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (savings_floor >= 0),
    default_variable_cap   NUMERIC(12,2) CHECK (default_variable_cap >= 0),
    default_savings_target NUMERIC(12,2) CHECK (default_savings_target >= 0),
    warning_percent        INTEGER       NOT NULL DEFAULT 80 CHECK (warning_percent BETWEEN 1 AND 100),
    version                BIGINT        NOT NULL DEFAULT 0
);
INSERT INTO fin_preferences (id) VALUES (1);

-- Budget d'un mois civil ; une valeur absente reprend la valeur par defaut des preferences.
CREATE TABLE fin_budget (
    id             UUID PRIMARY KEY,
    month          DATE          NOT NULL,
    variable_cap   NUMERIC(12,2) CHECK (variable_cap >= 0),
    savings_target NUMERIC(12,2) CHECK (savings_target >= 0),
    version        BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT ux_fin_budget_month UNIQUE (month),
    CONSTRAINT ck_fin_budget_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);

CREATE TABLE fin_schedule (
    id             UUID PRIMARY KEY,
    label          VARCHAR(120)  NOT NULL,
    type           VARCHAR(20)   NOT NULL,
    kind           VARCHAR(20)   NOT NULL,
    account_id     UUID          NOT NULL REFERENCES fin_account (id) ON DELETE RESTRICT,
    category_id    UUID REFERENCES fin_category (id) ON DELETE RESTRICT,
    income_kind    VARCHAR(20),
    amount         NUMERIC(12,2) NOT NULL,
    essential      BOOLEAN       NOT NULL DEFAULT FALSE,
    frequency      VARCHAR(20)   NOT NULL,
    interval_count INTEGER       NOT NULL DEFAULT 1,
    start_date     DATE          NOT NULL,
    end_date       DATE,
    status         VARCHAR(20)   NOT NULL,
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL,
    version        BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_schedule_type CHECK (type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT ck_fin_schedule_kind CHECK (kind IN ('SALARY', 'SUBSCRIPTION', 'BILL', 'INSTALLMENT', 'OTHER')),
    CONSTRAINT ck_fin_schedule_frequency CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
    CONSTRAINT ck_fin_schedule_interval CHECK (interval_count BETWEEN 1 AND 24),
    CONSTRAINT ck_fin_schedule_status CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
    CONSTRAINT ck_fin_schedule_amount CHECK (amount > 0),
    -- Une fin a la veille de la premiere echeance signifie : resilie avant toute echeance.
    CONSTRAINT ck_fin_schedule_dates CHECK (end_date IS NULL OR end_date >= start_date - 1),
    CONSTRAINT ck_fin_schedule_category CHECK ((type = 'EXPENSE') = (category_id IS NOT NULL)),
    CONSTRAINT ck_fin_schedule_income_kind CHECK ((type = 'INCOME') = (income_kind IS NOT NULL)),
    CONSTRAINT ck_fin_schedule_essential CHECK (type = 'EXPENSE' OR essential = FALSE)
);

ALTER TABLE fin_operation
    ADD COLUMN schedule_id UUID REFERENCES fin_schedule (id) ON DELETE RESTRICT,
    ADD COLUMN due_date    DATE,
    ADD CONSTRAINT ck_fin_operation_occurrence CHECK ((schedule_id IS NULL) = (due_date IS NULL));
-- Une echeance n'est enregistree qu'une fois : elle ne peut pas etre payee deux fois.
CREATE UNIQUE INDEX ux_fin_operation_occurrence ON fin_operation (schedule_id, due_date) WHERE schedule_id IS NOT NULL;
