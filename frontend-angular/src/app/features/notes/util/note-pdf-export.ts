import { Editor } from '@tiptap/core';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { noteExtensions } from '../editor/note-extensions';
import { EMOJI_FONT, hasEmoji, notePdfDefinition } from './note-pdf';

/**
 * Export PDF d'une idee. Ce module (et pdfmake, environ 1,7 Mo avec ses polices) n'est charge qu'au premier
 * export : `import()` depuis la page de l'idee. La police d'emojis (Noto Emoji, environ 870 Ko, copiee dans
 * `fonts/` au build) n'est telechargee que pour une idee qui contient des emojis.
 */

interface PdfMake {
  createPdf(definition: TDocumentDefinitions): { getBlob(): Promise<Blob> };
  addVirtualFileSystem(vfs: unknown): void;
  addFontContainer(container: unknown): void;
  addFonts(fonts: TFontDictionary): void;
}

/** Fichier de la police d'emojis, servi a cote de l'application (voir `angular.json`). */
const EMOJI_FONT_URL = 'fonts/NotoEmoji_400Regular.ttf';

let pdfMake: Promise<PdfMake> | null = null;
let emojiFont: Promise<boolean> | null = null;

/** pdfmake, sa police Roboto (texte, accents) et Courier (code), charges une seule fois. */
function loadPdfMake(): Promise<PdfMake> {
  pdfMake ??= (async () => {
    const [lib, vfs, courier] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
      import('pdfmake/build/standard-fonts/Courier'),
    ]);
    // Modules CommonJS : l'objet exporte est `default` une fois regroupe par le bundler.
    const unwrap = <T>(m: unknown): T => ((m as { default?: T }).default ?? m) as T;
    const instance = unwrap<PdfMake>(lib);
    instance.addVirtualFileSystem(unwrap(vfs));
    instance.addFontContainer(unwrap(courier));
    return instance;
  })().catch((e: unknown) => {
    pdfMake = null;
    throw e;
  });
  return pdfMake;
}

/**
 * Police d'emojis, telechargee une seule fois puis enregistree aupres de pdfmake (memes glyphes en gras et en
 * italique). false : police indisponible (hors ligne...) ; un prochain export reessaiera.
 */
function loadEmojiFont(lib: PdfMake): Promise<boolean> {
  emojiFont ??= (async () => {
    const response = await fetch(new URL(EMOJI_FONT_URL, document.baseURI));
    if (!response.ok) throw new Error(`Police d'emojis : HTTP ${response.status}`);
    const file = 'NotoEmoji-Regular.ttf';
    lib.addVirtualFileSystem({ [file]: toBase64(new Uint8Array(await response.arrayBuffer())) });
    lib.addFonts({ [EMOJI_FONT]: { normal: file, bold: file, italics: file, bolditalics: file } });
    return true;
  })().catch(() => {
    emojiFont = null;
    return false;
  });
  return emojiFont;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export interface PdfExport {
  title: string;
  /** Markdown de l'idee (saisie en cours comprise). */
  content: string;
  /** Lignes d'information deja formatees (categorie, etiquettes, dates). */
  meta: string[];
}

export interface PdfResult {
  pdf: Blob;
  /** L'idee contient des emojis mais leur police n'a pas pu etre chargee : ils manquent dans le PDF. */
  emojiMissing: boolean;
}

/** Fichier PDF de l'idee : contenu analyse comme dans l'editeur visuel, puis mis en page. */
export async function noteToPdf(note: PdfExport): Promise<PdfResult> {
  const editor = new Editor({
    extensions: noteExtensions(),
    content: note.content,
    contentType: 'markdown',
    editable: false,
  });
  let doc;
  try {
    doc = editor.getJSON();
  } finally {
    editor.destroy();
  }
  const lib = await loadPdfMake();
  const needsEmoji = hasEmoji([note.title, note.content, ...note.meta].join('\n'));
  const emoji = needsEmoji && (await loadEmojiFont(lib));
  const definition = notePdfDefinition({
    title: note.title,
    meta: note.meta,
    doc,
    emojiFont: emoji,
  });
  return { pdf: await lib.createPdf(definition).getBlob(), emojiMissing: needsEmoji && !emoji };
}
