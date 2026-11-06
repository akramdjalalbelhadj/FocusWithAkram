-- Module « Mes achats » : la feuille du mois (lot 13).
--  * montants dates des echeanciers : une version s'applique a partir de son mois (premier jour du mois), jusqu'a
--    la version suivante ; sans version, le montant de l'echeancier (fin_schedule.amount, valable des la premiere
--    echeance) s'applique. Les echeances deja enregistrees gardent leur montant ;
--  * depenses variables plafonnees (« enveloppes ») : une par categorie au plus, active de start_month a end_month
--    (sans fin si NULL), avec des plafonds dates et un suivi mensuel (commentaire de depassement, operation de total
--    du mois).

CREATE TABLE fin_schedule_amount (
    schedule_id UUID          NOT NULL REFERENCES fin_schedule (id) ON DELETE CASCADE,
    from_month  DATE          NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_fin_schedule_amount PRIMARY KEY (schedule_id, from_month),
    CONSTRAINT ck_fin_schedule_amount_first_day CHECK (EXTRACT(DAY FROM from_month) = 1),
    CONSTRAINT ck_fin_schedule_amount_positive CHECK (amount > 0)
);

CREATE TABLE fin_envelope (
    id          UUID PRIMARY KEY,
    category_id UUID         NOT NULL REFERENCES fin_category (id) ON DELETE RESTRICT,
    label       VARCHAR(120) NOT NULL,
    position    INTEGER      NOT NULL DEFAULT 0,
    start_month DATE         NOT NULL,
    end_month   DATE,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    version     BIGINT       NOT NULL DEFAULT 0,
    -- Une categorie n'a qu'une enveloppe : une depense n'est jamais comptee deux fois.
    CONSTRAINT ux_fin_envelope_category UNIQUE (category_id),
    CONSTRAINT ck_fin_envelope_label CHECK (length(btrim(label)) > 0),
    CONSTRAINT ck_fin_envelope_start_first_day CHECK (EXTRACT(DAY FROM start_month) = 1),
    CONSTRAINT ck_fin_envelope_end_first_day CHECK (end_month IS NULL OR EXTRACT(DAY FROM end_month) = 1),
    CONSTRAINT ck_fin_envelope_months CHECK (end_month IS NULL OR end_month >= start_month)
);

-- Plafond d'une enveloppe a partir d'un mois ; la premiere version commence au premier mois de l'enveloppe.
CREATE TABLE fin_envelope_amount (
    envelope_id UUID          NOT NULL REFERENCES fin_envelope (id) ON DELETE CASCADE,
    from_month  DATE          NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_fin_envelope_amount PRIMARY KEY (envelope_id, from_month),
    CONSTRAINT ck_fin_envelope_amount_first_day CHECK (EXTRACT(DAY FROM from_month) = 1),
    CONSTRAINT ck_fin_envelope_amount_not_negative CHECK (amount >= 0)
);

-- Suivi d'une enveloppe pour un mois : explication d'un depassement et operation de « total du mois ».
-- Supprimer l'operation de total ne supprime pas le suivi (la reference est simplement effacee).
CREATE TABLE fin_envelope_month (
    envelope_id        UUID NOT NULL REFERENCES fin_envelope (id) ON DELETE CASCADE,
    month              DATE NOT NULL,
    comment            VARCHAR(1000),
    total_operation_id UUID REFERENCES fin_operation (id) ON DELETE SET NULL,
    CONSTRAINT pk_fin_envelope_month PRIMARY KEY (envelope_id, month),
    CONSTRAINT ck_fin_envelope_month_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);
CREATE UNIQUE INDEX ux_fin_envelope_month_total ON fin_envelope_month (total_operation_id)
    WHERE total_operation_id IS NOT NULL;

-- Categorie racine « Prets » : un pret accorde est une depense de cette categorie, un remboursement recu un revenu.
-- La migration V8 ne la creait qu'en presence de prets : elle est desormais toujours proposee.
INSERT INTO fin_category (id, name, icon, color, position, created_at)
SELECT gen_random_uuid(), 'Prêts', 'hand-coins', '#0d9488',
       (SELECT COALESCE(max(position), -1) + 1 FROM fin_category WHERE parent_id IS NULL), now()
WHERE NOT EXISTS (SELECT 1 FROM fin_category
                  WHERE parent_id IS NULL AND archived = FALSE AND lower(name) IN ('prêts', 'prets'));
