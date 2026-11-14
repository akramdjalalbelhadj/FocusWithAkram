export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  /** Deuxieme choix facultatif (ex. « Archiver ») : la boite se ferme alors avec la valeur `'alt'`. */
  altLabel?: string;
}

/** Resultat d'une confirmation : `true` (bouton principal), `'alt'` (deuxieme choix) ou rien (annule). */
export type ConfirmResult = boolean | 'alt' | undefined;
