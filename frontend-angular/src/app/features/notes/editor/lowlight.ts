import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

/** Langages proposes dans l'editeur (ordre d'affichage) ; seuls ceux-ci sont charges, pour limiter le poids. */
export const CODE_LANGUAGES: readonly { id: string; label: string }[] = [
  { id: 'java', label: 'Java' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
  { id: 'sql', label: 'SQL' },
  { id: 'html', label: 'HTML' },
  { id: 'xml', label: 'XML' },
  { id: 'css', label: 'CSS' },
  { id: 'bash', label: 'Bash' },
  { id: 'python', label: 'Python' },
  // Schema ASCII (arborescence, tableau, banniere) : texte brut, modifiable dans l'atelier ASCII.
  { id: 'ascii', label: 'Schéma ASCII' },
];

const lowlight = createLowlight({
  bash,
  css,
  java,
  javascript,
  json,
  python,
  sql,
  typescript,
  xml,
  yaml,
});
// Les alias usuels (```ts, ```sh, ```yml...) sont reconnus comme dans GitHub.
lowlight.registerAlias({
  bash: ['sh', 'shell', 'zsh'],
  javascript: ['js', 'jsx', 'mjs'],
  typescript: ['ts', 'tsx'],
  python: ['py'],
  yaml: ['yml'],
  xml: ['html', 'xhtml', 'svg'],
});

/** Libelle lisible d'un langage saisi apres ``` (alias compris), ou le texte saisi tel quel. */
export function languageLabel(language: string | null | undefined): string {
  if (!language) return 'Texte';
  const id = language.toLowerCase();
  const known = CODE_LANGUAGES.find((l) => l.id === id);
  if (known) return known.label;
  return lowlight.registered(id) ? id.toUpperCase() : language;
}

/**
 * Instance passee a l'extension de coloration. Un bloc sans langage (ou d'un langage non charge) reste en texte
 * brut : la detection automatique se tromperait souvent et couterait cher sur une longue note.
 */
export const noteLowlight = {
  ...lowlight,
  highlightAuto: (): ReturnType<typeof lowlight.highlightAuto> => ({
    type: 'root',
    children: [],
    data: { language: undefined, relevance: 0 },
  }),
};
