/** Contenu de l'aide Markdown : chaque exemple est affiche en source et rendu par le meme moteur que l'editeur. */

export interface HelpExample {
  title: string;
  /** Precision affichee sous le titre. */
  hint?: string;
  markdown: string;
}

export interface HelpSection {
  id: string;
  title: string;
  examples: HelpExample[];
}

export const MARKDOWN_HELP: readonly HelpSection[] = [
  {
    id: 'texte',
    title: 'Texte',
    examples: [
      {
        title: 'Titres',
        hint: 'De # (niveau 1) à ###### (niveau 6).',
        markdown: '# Titre principal\n## Section\n### Sous-section',
      },
      {
        title: 'Mise en valeur',
        hint: 'Raccourcis : Ctrl+B (gras) et Ctrl+I (italique).',
        markdown: '**gras**, *italique*, ***les deux***\net ~~texte barré~~',
      },
      {
        title: 'Surligner',
        hint: 'Bouton Surligner ou Ctrl+Maj+H. Le jaune s’écrit ==…== ; les autres couleurs, avec la balise <mark>.',
        markdown:
          '==jaune==, <mark data-color="red">rouge</mark>,\n<mark data-color="sky">bleu ciel</mark> et <mark data-color="violet">violet</mark>',
      },
      {
        title: 'Code dans une phrase',
        markdown: 'Lancez `npm start` puis ouvrez le navigateur.',
      },
      {
        title: 'Paragraphes et retours à la ligne',
        hint: 'Une ligne vide sépare deux paragraphes ; deux espaces en fin de ligne forcent un retour.',
        markdown: 'Premier paragraphe.\n\nSecond paragraphe,  \nsur deux lignes.',
      },
      {
        title: 'Caractères spéciaux',
        hint: 'Une barre oblique inverse affiche le caractère tel quel.',
        markdown: '\\*pas en italique\\* et 3 \\* 4 = 12',
      },
    ],
  },
  {
    id: 'listes',
    title: 'Listes',
    examples: [
      {
        title: 'Liste à puces',
        hint: 'Indentez de deux espaces pour imbriquer.',
        markdown: '- Courses\n  - Pain\n  - Fruits\n- Ménage',
      },
      { title: 'Liste numérotée', markdown: '1. Préparer\n2. Rédiger\n3. Relire' },
      {
        title: 'Cases à cocher',
        hint: 'Cochables directement dans l’aperçu.',
        markdown: '- [x] Copie du passeport\n- [ ] Justificatif de domicile',
      },
    ],
  },
  {
    id: 'alertes',
    title: 'Alertes',
    examples: [
      {
        title: 'Note',
        hint: 'Une information complémentaire.',
        markdown: '> [!NOTE]\n> Prépare les copies des pages contenant ton identité.',
      },
      {
        title: 'Conseil',
        markdown: '> [!TIP]\n> Pense à sauvegarder régulièrement ton travail.',
      },
      {
        title: 'Important',
        markdown: '> [!IMPORTANT]\n> Cette étape est **obligatoire**.',
      },
      {
        title: 'Attention',
        markdown: '> [!WARNING]\n> Vérifie les informations avant de continuer.',
      },
      {
        title: 'Danger',
        hint: 'Une alerte peut contenir des listes, des liens ou du code.',
        markdown:
          '> [!CAUTION]\n> Cette opération peut entraîner :\n> - une perte de données ;\n> - un `rollback` manuel.',
      },
      {
        title: 'Citation',
        hint: 'Sans [!TYPE], une citation reste une citation.',
        markdown: '> Le plus simple est souvent le mieux.\n>\n> > Citation imbriquée.',
      },
    ],
  },
  {
    id: 'liens',
    title: 'Liens et séparateurs',
    examples: [
      {
        title: 'Lien',
        hint: 'Les adresses saisies seules deviennent aussi des liens.',
        markdown: '[Documentation Angular](https://angular.dev) ou https://tiptap.dev',
      },
      { title: 'Séparateur', markdown: 'Avant\n\n---\n\nAprès' },
    ],
  },
  {
    id: 'tableaux',
    title: 'Tableaux',
    examples: [
      {
        title: 'Tableau aligné',
        hint: ':-- à gauche, :-: au centre, --: à droite.',
        markdown:
          '| Tâche | Statut | Durée |\n| :-- | :-: | --: |\n| **API** | ✅ | 3 h |\n| `Front` | 🚧 | 5 h |',
      },
    ],
  },
  {
    id: 'code',
    title: 'Blocs de code',
    examples: [
      {
        title: 'Bloc avec coloration',
        hint: 'Langages : java, typescript, javascript, json, yaml, sql, html, xml, css, bash, python.',
        markdown:
          '```java\n@GetMapping("/notes/{id}")\npublic NoteResponse get(@PathVariable UUID id) {\n    return service.get(id);\n}\n```',
      },
      {
        title: 'Configuration',
        markdown:
          '```yaml\nspring:\n  datasource:\n    url: jdbc:postgresql://localhost/focus\n```',
      },
    ],
  },
  {
    id: 'ascii',
    title: 'Schémas ASCII',
    examples: [
      {
        title: 'Arborescence de dossiers',
        hint: 'Menu Insérer › Arborescence : modifiez le texte ou la hiérarchie, et obtenez les commandes mkdir/touch.',
        markdown:
          '```ascii\nprojet/\n├── src/\n│   ├── app/\n│   └── main.ts      # point d’entrée\n└── README.md\n```',
      },
      {
        title: 'Tableau ASCII',
        hint: 'Menu Insérer › Tableau ASCII : grille et texte synchronisés, quatre styles de cadre.',
        markdown:
          '```ascii\n┌───────┬────────┐\n│ Tâche │ Statut │\n╞═══════╪════════╡\n│ API   │ fini   │\n│ Front │ ouvert │\n└───────┴────────┘\n```',
      },
      {
        title: 'Bannière',
        hint: 'Menu Insérer › Bannière : gros caractères ou texte encadré.',
        markdown: '```ascii\n╭─────────────╮\n│  Sprint 12  │\n╰─────────────╯\n```',
      },
    ],
  },
];
