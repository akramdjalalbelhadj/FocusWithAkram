import { Editor } from '@tiptap/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { noteExtensions } from '../editor/note-extensions';
import { notePdfDefinition } from './note-pdf';

/**
 * Export PDF d'une idee. Ce module (et pdfmake, environ 1,7 Mo avec ses polices) n'est charge qu'au premier
 * export : `import()` depuis la page de l'idee.
 */

interface PdfMake {
  createPdf(definition: TDocumentDefinitions): { getBlob(): Promise<Blob> };
  addVirtualFileSystem(vfs: unknown): void;
  addFontContainer(container: unknown): void;
}

let pdfMake: Promise<PdfMake> | null = null;

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

export interface PdfExport {
  title: string;
  /** Markdown de l'idee (saisie en cours comprise). */
  content: string;
  /** Lignes d'information deja formatees (categorie, etiquettes, dates). */
  meta: string[];
}

/** Fichier PDF de l'idee : contenu analyse comme dans l'editeur visuel, puis mis en page. */
export async function noteToPdf(note: PdfExport): Promise<Blob> {
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
  return lib.createPdf(notePdfDefinition({ title: note.title, meta: note.meta, doc })).getBlob();
}
