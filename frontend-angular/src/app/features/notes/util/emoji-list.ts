/** Emojis proposes par la barre d'outils de l'editeur, par categorie, avec leur nom francais (recherche). */

export interface EmojiItem {
  char: string;
  /** Nom lu par les lecteurs d'ecran et affiche en infobulle. */
  name: string;
  /** Texte de recherche : nom et mots-cles, en minuscules et sans accents. */
  search: string;
}

export interface EmojiGroup {
  id: string;
  label: string;
  emojis: EmojiItem[];
}

/** Minuscules sans accents ni ligatures : « Fusée » et « fusee », « cœur » et « coeur » se retrouvent. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’']/g, ' ')
    .trim();
}

/** `[emoji, nom, mots-cles facultatifs]` */
type Raw = [string, string, string?];

const RAW: { id: string; label: string; items: Raw[] }[] = [
  {
    id: 'visages',
    label: 'Visages',
    items: [
      ['😀', 'visage souriant', 'content sourire joie'],
      ['😃', 'grand sourire', 'content joie'],
      ['😄', 'sourire aux yeux rieurs', 'rire joie'],
      ['😁', 'sourire éclatant', 'dents joie'],
      ['😆', 'mort de rire', 'rire'],
      ['😅', 'sourire gêné', 'sueur ouf soulagement'],
      ['😂', 'larmes de joie', 'rire mdr'],
      ['🙂', 'léger sourire', 'content'],
      ['😉', 'clin d’œil', 'complice'],
      ['😊', 'sourire timide', 'heureux'],
      ['😍', 'yeux en cœur', 'amour adore'],
      ['🥰', 'visage amoureux', 'amour cœurs'],
      ['😘', 'bisou', 'baiser amour'],
      ['😎', 'lunettes de soleil', 'cool classe'],
      ['🤩', 'étoiles dans les yeux', 'impressionné waouh'],
      ['🥳', 'fête', 'anniversaire célébration'],
      ['🤔', 'pensif', 'réflexion hmm question'],
      ['🧐', 'monocle', 'examiner analyser'],
      ['🤓', 'intello', 'lunettes étude'],
      ['😐', 'neutre', 'sans expression'],
      ['🙄', 'yeux au ciel', 'agacé'],
      ['😏', 'sourire en coin', 'malin'],
      ['😴', 'endormi', 'sommeil fatigue dodo'],
      ['🤯', 'tête qui explose', 'choc incroyable'],
      ['😮', 'bouche ouverte', 'surpris étonné'],
      ['😱', 'cri de peur', 'horreur choc'],
      ['😬', 'grimace', 'oups gêne'],
      ['😕', 'perplexe', 'confus'],
      ['😢', 'larme', 'triste pleurer'],
      ['😭', 'en pleurs', 'triste sanglots'],
      ['😤', 'déterminé', 'frustré vapeur'],
      ['😡', 'en colère', 'furieux rouge'],
      ['🤒', 'malade', 'fièvre thermomètre'],
      ['🥶', 'gelé', 'froid'],
      ['🥵', 'a chaud', 'chaleur'],
      ['🤗', 'câlin', 'merci accueil'],
      ['🤫', 'chut', 'secret silence'],
      ['😇', 'auréole', 'ange innocent'],
    ],
  },
  {
    id: 'gestes',
    label: 'Gestes et personnes',
    items: [
      ['👍', 'pouce levé', 'ok d’accord bien oui'],
      ['👎', 'pouce baissé', 'non mauvais'],
      ['👏', 'applaudissements', 'bravo félicitations'],
      ['🙌', 'mains levées', 'hourra bravo'],
      ['🙏', 'mains jointes', 'merci s’il te plaît prière'],
      ['🤝', 'poignée de main', 'accord partenariat'],
      ['👋', 'main qui salue', 'bonjour salut au revoir'],
      ['✋', 'main levée', 'stop'],
      ['👌', 'ok', 'parfait'],
      ['✌️', 'victoire', 'paix'],
      ['🤞', 'doigts croisés', 'chance espoir'],
      ['💪', 'biceps', 'force motivation courage'],
      ['👉', 'index vers la droite', 'voir ceci'],
      ['👈', 'index vers la gauche', 'voir cela'],
      ['👆', 'index vers le haut', 'ci-dessus'],
      ['👇', 'index vers le bas', 'ci-dessous'],
      ['✍️', 'main qui écrit', 'écrire note'],
      ['🧠', 'cerveau', 'idée intelligence réflexion'],
      ['👀', 'yeux', 'regarder voir'],
      ['🗣️', 'personne qui parle', 'parler annonce'],
      ['👤', 'silhouette', 'personne utilisateur'],
      ['👥', 'deux silhouettes', 'équipe groupe'],
      ['🧑‍💻', 'développeur', 'informatique ordinateur code'],
      ['🧑‍🎓', 'étudiant', 'diplôme école'],
      ['👨‍👩‍👧', 'famille', 'parents enfant'],
    ],
  },
  {
    id: 'symboles',
    label: 'Cœurs et symboles',
    items: [
      ['❤️', 'cœur rouge', 'amour'],
      ['🧡', 'cœur orange', 'amour'],
      ['💛', 'cœur jaune', 'amitié'],
      ['💚', 'cœur vert', 'nature'],
      ['💙', 'cœur bleu', 'confiance'],
      ['💜', 'cœur violet', 'amour'],
      ['🖤', 'cœur noir', 'deuil'],
      ['💔', 'cœur brisé', 'chagrin tristesse'],
      ['✅', 'coche verte', 'fait validé terminé oui'],
      ['☑️', 'case cochée', 'fait validé'],
      ['✔️', 'coche', 'validé'],
      ['❌', 'croix', 'non annulé erreur supprimé'],
      ['⚠️', 'attention', 'avertissement danger prudence'],
      ['❗', 'point d’exclamation', 'important urgent'],
      ['❓', 'point d’interrogation', 'question'],
      ['💯', 'cent points', 'parfait score'],
      ['⭐', 'étoile', 'favori important'],
      ['🌟', 'étoile brillante', 'excellent'],
      ['✨', 'étincelles', 'nouveau magie'],
      ['🔥', 'feu', 'urgent tendance chaud'],
      ['💡', 'ampoule', 'idée astuce'],
      ['🎯', 'cible', 'objectif but'],
      ['🚩', 'drapeau rouge', 'alerte jalon'],
      ['🔴', 'rond rouge', 'priorité haute statut'],
      ['🟠', 'rond orange', 'priorité moyenne statut'],
      ['🟡', 'rond jaune', 'en cours statut'],
      ['🟢', 'rond vert', 'ok terminé statut'],
      ['🔵', 'rond bleu', 'information statut'],
      ['⚪', 'rond blanc', 'vide statut'],
      ['➡️', 'flèche droite', 'suivant ensuite'],
      ['⬅️', 'flèche gauche', 'précédent retour'],
      ['⬆️', 'flèche haut', 'monter hausse'],
      ['⬇️', 'flèche bas', 'descendre baisse'],
      ['🔁', 'répéter', 'boucle récurrent'],
      ['➕', 'plus', 'ajouter'],
      ['➖', 'moins', 'retirer'],
      ['ℹ️', 'information', 'info'],
      ['🆕', 'nouveau', 'new'],
      ['🔔', 'cloche', 'notification rappel alerte'],
      ['💬', 'bulle de dialogue', 'commentaire message'],
    ],
  },
  {
    id: 'travail',
    label: 'Travail et objets',
    items: [
      ['📌', 'punaise', 'épinglé important'],
      ['📍', 'repère', 'lieu position'],
      ['📎', 'trombone', 'pièce jointe'],
      ['📝', 'mémo', 'note écrire'],
      ['✏️', 'crayon', 'écrire modifier'],
      ['🖊️', 'stylo', 'écrire signer'],
      ['📒', 'carnet', 'notes'],
      ['📚', 'livres', 'lecture étude'],
      ['📖', 'livre ouvert', 'lecture'],
      ['📅', 'calendrier', 'date agenda rendez-vous'],
      ['🗓️', 'calendrier à spirale', 'planning agenda'],
      ['⏰', 'réveil', 'heure rappel'],
      ['⏳', 'sablier', 'attente temps en cours'],
      ['⌛', 'sablier écoulé', 'délai fin'],
      ['⏱️', 'chronomètre', 'minuteur pomodoro'],
      ['💻', 'ordinateur portable', 'informatique travail'],
      ['🖥️', 'ordinateur de bureau', 'écran'],
      ['📱', 'téléphone portable', 'mobile smartphone'],
      ['☎️', 'téléphone', 'appel'],
      ['📧', 'e-mail', 'courriel mail message'],
      ['📨', 'enveloppe entrante', 'courrier reçu'],
      ['📦', 'colis', 'paquet livraison'],
      ['🗂️', 'intercalaires', 'classement dossier'],
      ['📁', 'dossier', 'fichier classement'],
      ['📊', 'histogramme', 'statistiques graphique'],
      ['📈', 'courbe en hausse', 'progression croissance'],
      ['📉', 'courbe en baisse', 'diminution'],
      ['📋', 'presse-papiers', 'liste tâches'],
      ['🔑', 'clé', 'accès mot de passe'],
      ['🔒', 'cadenas fermé', 'sécurité verrouillé privé'],
      ['🔓', 'cadenas ouvert', 'déverrouillé'],
      ['🔧', 'clé à molette', 'outil réparer réglage'],
      ['🛠️', 'outils', 'bricolage réparer'],
      ['⚙️', 'engrenage', 'paramètres réglages'],
      ['🔍', 'loupe', 'chercher recherche'],
      ['💰', 'sac d’argent', 'argent budget'],
      ['💶', 'billet en euros', 'argent euro'],
      ['💳', 'carte bancaire', 'paiement achat'],
      ['🧾', 'reçu', 'facture ticket'],
      ['🛒', 'chariot', 'courses achat'],
      ['🏷️', 'étiquette', 'prix tag'],
      ['🏆', 'trophée', 'victoire réussite'],
      ['🎓', 'toque de diplômé', 'diplôme études'],
      ['🚀', 'fusée', 'lancement démarrage rapide'],
    ],
  },
  {
    id: 'nature',
    label: 'Nature et météo',
    items: [
      ['☀️', 'soleil', 'beau temps été'],
      ['⛅', 'soleil et nuages', 'météo'],
      ['☁️', 'nuage', 'météo'],
      ['🌧️', 'pluie', 'météo'],
      ['⛈️', 'orage', 'météo'],
      ['❄️', 'flocon', 'neige hiver froid'],
      ['🌈', 'arc-en-ciel', 'couleurs'],
      ['🌙', 'lune', 'nuit'],
      ['🌍', 'globe', 'monde terre'],
      ['🌱', 'pousse', 'début croissance plante'],
      ['🌳', 'arbre', 'nature'],
      ['🌸', 'fleur de cerisier', 'printemps'],
      ['🍂', 'feuilles mortes', 'automne'],
      ['🐶', 'chien', 'animal'],
      ['🐱', 'chat', 'animal'],
      ['🐞', 'coccinelle', 'bogue bug'],
      ['🦋', 'papillon', 'transformation'],
    ],
  },
  {
    id: 'nourriture',
    label: 'Nourriture',
    items: [
      ['☕', 'café', 'pause boisson'],
      ['🍵', 'thé', 'boisson'],
      ['🥐', 'croissant', 'petit-déjeuner'],
      ['🍞', 'pain', 'boulangerie'],
      ['🍎', 'pomme', 'fruit'],
      ['🍌', 'banane', 'fruit'],
      ['🥗', 'salade', 'repas sain'],
      ['🍕', 'pizza', 'repas'],
      ['🍔', 'hamburger', 'repas'],
      ['🍝', 'pâtes', 'repas'],
      ['🍰', 'gâteau', 'dessert'],
      ['🎂', 'gâteau d’anniversaire', 'anniversaire fête'],
      ['🍫', 'chocolat', 'dessert'],
      ['🥤', 'boisson', 'soda'],
    ],
  },
  {
    id: 'activites',
    label: 'Activités et voyages',
    items: [
      ['🎉', 'cotillons', 'fête bravo félicitations'],
      ['🎊', 'confettis', 'fête'],
      ['🎁', 'cadeau', 'anniversaire surprise'],
      ['🎈', 'ballon', 'fête'],
      ['🎵', 'note de musique', 'musique'],
      ['🎮', 'manette', 'jeu vidéo'],
      ['⚽', 'ballon de football', 'sport foot'],
      ['🏃', 'coureur', 'sport course'],
      ['🧘', 'méditation', 'calme yoga'],
      ['🏋️', 'haltérophile', 'sport musculation'],
      ['🎨', 'palette', 'art dessin design'],
      ['📷', 'appareil photo', 'photo'],
      ['🎬', 'clap', 'film vidéo'],
      ['✈️', 'avion', 'voyage vol'],
      ['🚗', 'voiture', 'trajet'],
      ['🚆', 'train', 'voyage trajet'],
      ['🚲', 'vélo', 'trajet sport'],
      ['🏠', 'maison', 'domicile logement'],
      ['🏢', 'immeuble de bureaux', 'travail entreprise'],
      ['🏥', 'hôpital', 'santé'],
      ['🏫', 'école', 'études'],
      ['🏖️', 'plage', 'vacances'],
      ['🧳', 'valise', 'voyage bagage'],
      ['🗺️', 'carte du monde', 'voyage itinéraire'],
    ],
  },
  {
    id: 'drapeaux',
    label: 'Drapeaux',
    items: [
      ['🇫🇷', 'France', 'drapeau'],
      ['🇩🇿', 'Algérie', 'drapeau'],
      ['🇲🇦', 'Maroc', 'drapeau'],
      ['🇹🇳', 'Tunisie', 'drapeau'],
      ['🇪🇺', 'Union européenne', 'drapeau europe'],
      ['🇧🇪', 'Belgique', 'drapeau'],
      ['🇨🇭', 'Suisse', 'drapeau'],
      ['🇨🇦', 'Canada', 'drapeau'],
      ['🇬🇧', 'Royaume-Uni', 'drapeau angleterre'],
      ['🇺🇸', 'États-Unis', 'drapeau amérique'],
      ['🇪🇸', 'Espagne', 'drapeau'],
      ['🇩🇪', 'Allemagne', 'drapeau'],
      ['🇮🇹', 'Italie', 'drapeau'],
      ['🏁', 'drapeau à damier', 'arrivée fin course'],
      ['🏳️', 'drapeau blanc', 'drapeau'],
    ],
  },
];

export const EMOJI_GROUPS: readonly EmojiGroup[] = RAW.map((group) => ({
  id: group.id,
  label: group.label,
  emojis: group.items.map(([char, name, keywords]) => ({
    char,
    name,
    // Nom et mots-cles seulement : le nom de categorie rendrait « coeur rouge » trop large.
    search: normalizeSearch(`${name} ${keywords ?? ''}`),
  })),
}));

const ALL = EMOJI_GROUPS.flatMap((g) => g.emojis);
const BY_CHAR = new Map(ALL.map((e) => [e.char, e]));

/** Emojis dont le nom ou les mots-cles contiennent tous les mots cherches (accents et casse ignores). */
export function searchEmojis(query: string): EmojiItem[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return ALL.filter((e) => words.every((w) => e.search.includes(w)));
}

/** Emoji de la liste (pour retrouver le nom d'un emoji recent). */
export function findEmoji(char: string): EmojiItem | undefined {
  return BY_CHAR.get(char);
}

/** Emojis recents : propres au navigateur, du plus recent au plus ancien. */
export const RECENT_EMOJIS_KEY = 'ff.notes.emojis.recent';
export const RECENT_EMOJIS_MAX = 16;

export function readRecentEmojis(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_EMOJIS_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((c): c is string => typeof c === 'string' && BY_CHAR.has(c))
          .slice(0, RECENT_EMOJIS_MAX)
      : [];
  } catch {
    return [];
  }
}

/** Place l'emoji en tete des recents (sans doublon) et enregistre la liste. */
export function rememberEmoji(recent: readonly string[], char: string): string[] {
  const next = [char, ...recent.filter((c) => c !== char)].slice(0, RECENT_EMOJIS_MAX);
  try {
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible : les recents durent le temps de la page */
  }
  return next;
}
