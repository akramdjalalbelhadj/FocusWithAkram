package com.focusflow.finance;

/**
 * Nature d'une operation. Seuls les revenus et les depenses (nettes des remboursements d'achats) entrent dans
 * les revenus et les depenses ; virements, soldes initiaux et corrections deplacent ou ajustent de l'argent.
 */
public enum OperationType {
    INCOME,
    EXPENSE,
    /** Retour d'un produit ou remboursement d'un achat : diminue les depenses de la categorie, n'est pas un revenu. */
    PURCHASE_REFUND,
    /** Du compte source vers le compte cible ; vers un compte d'epargne, c'est de l'epargne mise de cote. */
    TRANSFER,
    OPENING_BALANCE,
    /** Correction explicite et tracable de l'ecart entre le solde calcule et le solde reel. */
    ADJUSTMENT,
    /** Pret accorde : l'argent sort du compte, une creance nait (ni depense ni revenu). */
    LOAN_GIVEN,
    /** Remboursement recu d'un pret accorde. */
    LOAN_COLLECTED,
    /** Emprunt recu : l'argent entre sur le compte, une dette nait. */
    LOAN_TAKEN,
    /** Remboursement verse d'un emprunt. */
    LOAN_REPAID;

    public boolean isLoanMovement() {
        return this == LOAN_GIVEN || this == LOAN_COLLECTED || this == LOAN_TAKEN || this == LOAN_REPAID;
    }
}
