import { Injector } from '@angular/core';

/**
 * Ouvre la saisie rapide d'une depense depuis n'importe quel ecran. Le module financier est charge a la
 * demande : il ne pese pas sur le chargement initial de l'application.
 */
export async function openQuickExpense(injector: Injector): Promise<void> {
  const { FinanceActions } = await import('./services/finance-actions.service');
  await injector.get(FinanceActions).quickExpense();
}
