-- Module « Mes achats » : objectifs d'achat. La faisabilite et le financement en cours sont calcules ;
-- seuls le statut saisi, la reservation et le lien vers la depense reelle sont enregistres.

CREATE TABLE fin_goal (
    id                UUID PRIMARY KEY,
    name              VARCHAR(120)  NOT NULL,
    category_id       UUID REFERENCES fin_category (id) ON DELETE RESTRICT,
    description       TEXT,
    estimated_price   NUMERIC(12,2) NOT NULL,
    max_price         NUMERIC(12,2),
    target_date       DATE          NOT NULL,
    important         BOOLEAN       NOT NULL DEFAULT FALSE,
    urgent            BOOLEAN       NOT NULL DEFAULT FALSE,
    status            VARCHAR(20)   NOT NULL,
    reserved_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    funded_by_savings BOOLEAN       NOT NULL DEFAULT FALSE,
    position          INTEGER       NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    version           BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT ck_fin_goal_status CHECK (status IN ('CONSIDERED', 'PLANNED', 'POSTPONED', 'PURCHASED', 'ABANDONED')),
    CONSTRAINT ck_fin_goal_price CHECK (estimated_price > 0),
    CONSTRAINT ck_fin_goal_max_price CHECK (max_price IS NULL OR max_price >= estimated_price),
    CONSTRAINT ck_fin_goal_reserved CHECK (reserved_amount >= 0),
    -- Un objectif clos ne garde aucune reservation : l'argent redevient libre.
    CONSTRAINT ck_fin_goal_closed_reserved CHECK (status IN ('CONSIDERED', 'PLANNED', 'POSTPONED') OR reserved_amount = 0)
);
CREATE INDEX ix_fin_goal_status ON fin_goal (status);

-- La depense reelle d'un achat est liee a son objectif ; elle ne consomme pas le plafond variable (decision D4).
ALTER TABLE fin_operation ADD COLUMN goal_id UUID REFERENCES fin_goal (id) ON DELETE SET NULL;
CREATE INDEX ix_fin_operation_goal ON fin_operation (goal_id) WHERE goal_id IS NOT NULL;
