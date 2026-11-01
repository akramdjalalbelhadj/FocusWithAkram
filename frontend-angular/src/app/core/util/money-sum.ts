/**
 * Somme exacte de montants au centime (calcul en centimes entiers). Réservée aux totaux d'affichage de
 * valeurs déjà arrondies par le serveur ; les calculs financiers restent côté serveur.
 */
export function sumMoney(values: readonly number[]): number {
  return values.reduce((cents, v) => cents + Math.round(v * 100), 0) / 100;
}
