/** Textes des bulles d'aide de la feuille du mois et de ses dialogues. */
export const MONTH_HELP = {
  dashboard:
    'L’essentiel du mois : votre solde, ce que vous avez reçu, ce que vous avez payé et ce qui reste. Changez de mois avec les flèches ; le détail ligne par ligne est dans « Détails du mois ».',
  sheet:
    'Chaque mois a sa feuille : les revenus attendus et reçus, les dépenses prévues et payées. Changez de mois avec les flèches ; un mois passé reste modifiable.',
  received:
    'Ce que vous avez réellement reçu ce mois-ci : 0 € tant que le salaire du mois n’est pas saisi. Le salaire prévu de la période (par exemple 2 290 € de novembre à janvier) ne sert qu’à calculer si vos achats prévus sont possibles.',
  incomes:
    'Votre salaire et vos autres revenus attendus, avec leur montant prévu pour chaque période (2 290 € de novembre à janvier, puis 2 400 € à partir de février, par exemple : les mois passés gardent leur montant). Le prévu sert au calcul des achats prévus. Quand l’argent arrive, cliquez sur « Saisir » pour indiquer le montant réellement reçu.',
  fixed:
    'Loyer, téléphone, abonnement de transport… Saisies une seule fois, elles remplissent automatiquement la feuille de chaque mois. Il vous reste à confirmer le paiement.',
  variable:
    'Courses, restaurants, sorties… Fixez un plafond par mois (ex. 300 € de courses). Les dépenses de la catégorie sont comptées automatiquement ; vous pouvez aussi saisir directement le total du mois. Au-delà du plafond, expliquez le dépassement dans un commentaire.',
  others:
    'Tout ce qui n’est ni une dépense fixe ni une dépense variable plafonnée : imprévus, achats exceptionnels, achats prévus réalisés.',
  planned: 'Le montant attendu pour ce mois : celui de l’échéance, ou le montant modifié pour ce mois seulement.',
  actual: 'Le montant réellement reçu ou payé, saisi quand c’est fait. Le prévu est conservé à côté.',
  difference:
    'Réel moins prévu : un écart positif signifie que vous avez payé plus que prévu. Les revenus n’ont pas d’écart : leur prévu ne sert qu’au calcul des achats prévus.',
  cap: 'Le plafond : ce que vous vous autorisez à dépenser dans cette catégorie ce mois-ci.',
  spent: 'Les dépenses payées de la catégorie ce mois-ci (et de ses sous-catégories), remboursements déduits.',
  remaining: 'Plafond moins dépensé. Un reste négatif est un dépassement, à expliquer dans le commentaire.',
  savings:
    'L’épargne n’est pas un compte : c’est ce qui reste réellement du mois, revenus reçus moins dépenses payées. Elle est gardée mois par mois pour vos statistiques.',
  balance:
    'L’argent dont vous disposez aujourd’hui sur votre compte (banque, épargne et espèces réunies). « Corriger » enregistre l’écart avec votre solde réel.',
  thisMonthOnly:
    '« Ce mois seulement » change le montant prévu de ce mois-ci uniquement (une facture exceptionnellement plus élevée, par exemple). Les autres mois ne bougent pas.',
  fromMonth:
    '« À partir de ce mois » : le nouveau montant s’applique à ce mois et à tous les suivants. Les mois précédents gardent leur montant (un loyer qui passe à 400 € en janvier laisse novembre à 350 €). Les mois déjà payés ne changent pas.',
} as const;
