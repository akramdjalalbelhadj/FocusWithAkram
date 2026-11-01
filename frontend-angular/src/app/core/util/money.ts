const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const EURO_SIGNED = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'exceptZero',
});

/** « 1 234,50 € » ; les montants viennent du serveur, déjà au centime. */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : EURO.format(value);
}

/** « +50,00 € » / « −12,30 € » : pour un écart ou un mouvement. */
export function formatSignedMoney(value: number): string {
  return EURO_SIGNED.format(value);
}

const AMOUNT = /^\s*(-)?\s*(\d{1,10})(?:[.,](\d{1,2}))?\s*$/;

/**
 * Lit un montant saisi en français (« 12,5 », « 1 200 », « 12.50 ») : au plus deux décimales, sans
 * arrondi silencieux. Renvoie null si la saisie n'est pas un montant valide.
 */
export function parseAmount(text: string | null | undefined, allowNegative = false): number | null {
  const m = AMOUNT.exec((text ?? '').replace(/[\s\u00a0\u202f€]/g, ''));
  if (!m || (m[1] && !allowNegative)) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  return ((m[1] ? -1 : 1) * cents) / 100;
}

/** Valeur d'un montant pour un champ de saisie : « 12,50 ». */
export function amountInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : value.toFixed(2).replace('.', ',');
}
