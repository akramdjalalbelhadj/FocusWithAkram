/** Textes des bulles d'aide de la feuille du mois et de ses dialogues. */
export const MONTH_HELP = {
  sheet:
    'Chaque mois a sa feuille : ce qui était prévu et ce qui s’est réellement passé. Changez de mois avec les flèches ; un mois passé reste modifiable.',
  incomes:
    'Votre salaire et vos autres revenus attendus. Saisissez-les une fois, pour un mois ou une période : ils apparaissent dans chaque mois concerné. Quand l’argent arrive, cliquez sur « Saisir » pour indiquer le montant réellement reçu.',
  fixed:
    'Loyer, téléphone, abonnement de transport… Saisies une seule fois, elles remplissent automatiquement la feuille de chaque mois. Il vous reste à confirmer le paiement.',
  variable:
    'Courses, restaurants, sorties… Fixez un plafond par mois (ex. 300 € de courses). Les dépenses de la catégorie sont comptées automatiquement ; vous pouvez aussi saisir directement le total du mois. Au-delà du plafond, expliquez le dépassement dans un commentaire.',
  others:
    'Tout ce qui n’est ni une dépense fixe ni une dépense variable plafonnée : imprévus, achats exceptionnels, achats prévus réalisés.',
  planned: 'Le montant attendu pour ce mois : celui de l’échéance, ou le montant modifié pour ce mois seulement.',
  actual: 'Le montant réellement reçu ou payé, saisi quand c’est fait. Le prévu est conservé à côté.',
  difference:
    'Réel moins prévu. Pour un revenu, un écart négatif signifie que vous avez reçu moins que prévu ; pour une dépense, un écart positif signifie que vous avez payé plus.',
  cap: 'Le plafond : ce que vous vous autorisez à dépenser dans cette catégorie ce mois-ci.',
  spent: 'Les dépenses payées de la catégorie ce mois-ci (et de ses sous-catégories), remboursements déduits.',
  remaining: 'Plafond moins dépensé. Un reste négatif est un dépassement, à expliquer dans le commentaire.',
  savings:
    'L’épargne n’est pas un compte : c’est ce qui reste du mois. Prévue = revenus prévus − dépenses prévues ; réelle = revenus reçus − dépenses payées. Comparez-la à votre objectif du mois.',
  balance:
    'L’argent dont vous disposez aujourd’hui sur votre compte (banque, épargne et espèces réunies). « Corriger » enregistre l’écart avec votre solde réel.',
  thisMonthOnly:
    '« Ce mois seulement » change le montant prévu de ce mois-ci uniquement (une facture exceptionnellement plus élevée, par exemple). Les autres mois ne bougent pas.',
  fromMonth:
    '« À partir de ce mois » : le nouveau montant s’applique à ce mois et à tous les suivants. Les mois précédents gardent leur montant (un loyer qui passe à 400 € en janvier laisse novembre à 350 €). Les mois déjà payés ne changent pas.',
} as const;
