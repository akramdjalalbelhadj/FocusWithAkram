-- Module « Mes achats » simplifie (lot 13) :
--  * un seul compte, qui represente tout l'argent (courant, epargne, especes) : les autres comptes y sont fusionnes ;
--    les virements entre comptes, devenus internes, sont supprimes ; le solde initial d'un compte fusionne devient
--    une correction datee, pour que le solde total reste identique ;
--  * plus de suivi des prets : un pret accorde ou un remboursement verse devient une depense, un emprunt recu ou un
--    remboursement recu devient un revenu, tous dans la categorie « Prets » ;
--  * un revenu peut porter une categorie (facultative) ;
--  * l'epargne n'est plus un compte : c'est ce qui reste du mois (revenus - depenses), suivi chaque mois.

ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_type;
ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_type_direction;
ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_category;
ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_income_kind;
ALTER TABLE fin_operation DROP CONSTRAINT ck_fin_operation_loan;

DO $$
DECLARE
    main_id  UUID;
    loans_id UUID;
BEGIN
    -- 1. Compte unique : le compte courant actif le plus ancien (sinon le premier compte).
    SELECT id INTO main_id FROM fin_account
    ORDER BY archived, (type = 'CURRENT') DESC, position, created_at
    LIMIT 1;

    IF main_id IS NOT NULL THEN
        DELETE FROM fin_operation WHERE type = 'TRANSFER';

        UPDATE fin_operation o
        SET type = 'ADJUSTMENT', label = left('Solde de départ — ' || a.name, 120)
        FROM fin_account a
        WHERE o.account_id = a.id AND a.id <> main_id AND o.type = 'OPENING_BALANCE';

        -- Sans solde initial sur le compte retenu, la plus ancienne de ces corrections le devient.
        IF NOT EXISTS (SELECT 1 FROM fin_operation WHERE account_id = main_id AND type = 'OPENING_BALANCE') THEN
            UPDATE fin_operation SET type = 'OPENING_BALANCE'
            WHERE id = (SELECT o.id FROM fin_operation o
                        WHERE o.type = 'ADJUSTMENT' AND o.account_id <> main_id AND o.label LIKE 'Solde de départ — %'
                        ORDER BY o.operation_date, o.created_at LIMIT 1);
        END IF;

        UPDATE fin_operation SET account_id = main_id WHERE account_id <> main_id;
        UPDATE fin_schedule SET account_id = main_id WHERE account_id <> main_id;
        DELETE FROM fin_account WHERE id <> main_id;
        UPDATE fin_account SET type = 'CURRENT', archived = FALSE WHERE id = main_id;
    END IF;

    -- 2. Prets : simples depenses et revenus de la categorie « Prets ».
    IF EXISTS (SELECT 1 FROM fin_operation WHERE type LIKE 'LOAN\_%') THEN
        SELECT id INTO loans_id FROM fin_category
        WHERE parent_id IS NULL AND archived = FALSE AND lower(name) IN ('prêts', 'prets')
        LIMIT 1;
        IF loans_id IS NULL THEN
            loans_id := gen_random_uuid();
            INSERT INTO fin_category (id, name, icon, color, position, created_at)
            VALUES (loans_id, 'Prêts', 'hand-coins', '#0d9488',
                    (SELECT COALESCE(max(position), -1) + 1 FROM fin_category WHERE parent_id IS NULL), now());
        END IF;

        UPDATE fin_operation SET type = 'EXPENSE', category_id = loans_id, income_kind = NULL
        WHERE type IN ('LOAN_GIVEN', 'LOAN_REPAID');
        UPDATE fin_operation SET type = 'INCOME', category_id = loans_id, income_kind = 'OTHER'
        WHERE type IN ('LOAN_COLLECTED', 'LOAN_TAKEN');
    END IF;
END $$;

ALTER TABLE fin_operation DROP COLUMN loan_id;
DROP TABLE fin_loan;

-- L'argent mis de cote n'est plus sur un compte separe : aucun achat n'est finance « par l'epargne ».
UPDATE fin_goal SET funded_by_savings = FALSE WHERE funded_by_savings;

ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_type CHECK (type IN ('INCOME', 'EXPENSE', 'PURCHASE_REFUND',
    'TRANSFER', 'OPENING_BALANCE', 'ADJUSTMENT'));
ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_type_direction CHECK (
    (type IN ('INCOME', 'PURCHASE_REFUND') AND direction = 'CREDIT')
    OR (type IN ('EXPENSE', 'TRANSFER') AND direction = 'DEBIT')
    OR type IN ('OPENING_BALANCE', 'ADJUSTMENT'));
-- Categorie obligatoire pour une depense ou un remboursement d'achat, facultative pour un revenu, absente sinon.
ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_category CHECK (
    (type IN ('EXPENSE', 'PURCHASE_REFUND') AND category_id IS NOT NULL)
    OR type = 'INCOME'
    OR category_id IS NULL);
ALTER TABLE fin_operation ADD CONSTRAINT ck_fin_operation_income_kind CHECK ((type = 'INCOME') = (income_kind IS NOT NULL));

-- Revenu d'un echeancier : categorie facultative, comme pour une operation.
ALTER TABLE fin_schedule DROP CONSTRAINT ck_fin_schedule_category;
ALTER TABLE fin_schedule ADD CONSTRAINT ck_fin_schedule_category CHECK (type = 'INCOME' OR category_id IS NOT NULL);

-- Visite guidee du module : affichee tant qu'elle n'a pas ete terminee ou passee.
ALTER TABLE fin_preferences ADD COLUMN tutorial_done BOOLEAN NOT NULL DEFAULT FALSE;
