import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Check, Copy, Pencil } from 'lucide';
import { ASCII_LANGUAGE } from '../util/ascii';
import { iconElement } from './dom-icon';
import { CODE_LANGUAGES, languageLabel, noteLowlight } from './lowlight';

/** Evenement DOM emis par le bouton « Modifier » d'un bloc ```ascii (bouillonne jusqu'a l'editeur). */
export const ASCII_EDIT_EVENT = 'note-ascii-edit';

export interface AsciiEditRequest {
  /** Position du bloc dans le document. */
  pos: number;
  text: string;
}

/** Copie un texte dans le presse-papiers ; repli sur une zone de texte temporaire (contexte non securise). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand('copy');
    area.remove();
    return done;
  }
}

/**
 * Bloc de code colore (langages courants) avec un bandeau : langage (modifiable dans l'editeur visuel, affiche
 * dans l'apercu) et bouton « Copier ». Le Markdown reste un bloc ```langage classique.
 */
export const NoteCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current: PmNode = node;

      const dom = document.createElement('div');
      dom.className = 'note-code';

      const bar = document.createElement('div');
      bar.className = 'note-code-bar';
      bar.contentEditable = 'false';

      let language: HTMLSelectElement | HTMLSpanElement;
      if (editor.isEditable) {
        const select = document.createElement('select');
        select.className = 'note-code-lang';
        select.setAttribute('aria-label', 'Langage du bloc de code');
        select.addEventListener('change', () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined;
          if (typeof pos !== 'number') return;
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...current.attrs,
                language: select.value || null,
              });
              return true;
            })
            .run();
        });
        language = select;
      } else {
        language = document.createElement('span');
        language.className = 'note-code-lang';
      }

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'note-code-copy';
      const copyLabel = document.createElement('span');
      const setCopied = (copied: boolean) => {
        copy.replaceChildren(iconElement(copied ? Check : Copy), copyLabel);
        copyLabel.textContent = copied ? 'Copié' : 'Copier';
        copy.setAttribute('aria-label', copied ? 'Code copié' : 'Copier le code');
      };
      setCopied(false);
      let timer: ReturnType<typeof setTimeout> | undefined;
      copy.addEventListener('click', async () => {
        if (await copyText(current.textContent)) {
          setCopied(true);
          clearTimeout(timer);
          timer = setTimeout(() => setCopied(false), 1500);
        }
      });

      bar.append(language, copy);
      // Schema ASCII : « Modifier » ouvre l'atelier ASCII (evenement capte par l'editeur de la note).
      let edit: HTMLButtonElement | null = null;
      if (editor.isEditable) {
        edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'note-code-ascii';
        const editLabel = document.createElement('span');
        editLabel.textContent = 'Modifier';
        edit.replaceChildren(iconElement(Pencil), editLabel);
        edit.setAttribute('aria-label', 'Modifier le schéma ASCII');
        edit.addEventListener('click', () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined;
          if (typeof pos !== 'number') return;
          dom.dispatchEvent(
            new CustomEvent<AsciiEditRequest>(ASCII_EDIT_EVENT, {
              bubbles: true,
              detail: { pos, text: current.textContent },
            }),
          );
        });
        bar.insertBefore(edit, copy);
      }
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      pre.appendChild(code);
      dom.append(bar, pre);

      const render = () => {
        const lang = (current.attrs['language'] as string | null) ?? '';
        code.className = lang ? `language-${lang}` : '';
        dom.classList.toggle('note-code-ascii-block', lang === ASCII_LANGUAGE);
        if (edit) edit.hidden = lang !== ASCII_LANGUAGE;
        if (language instanceof HTMLSelectElement) {
          const options = [{ id: '', label: 'Texte' }, ...CODE_LANGUAGES];
          // Un langage saisi a la main (alias, langage non colore) reste propose pour ne pas etre perdu.
          if (lang && !options.some((o) => o.id === lang))
            options.push({ id: lang, label: languageLabel(lang) });
          if (language.options.length !== options.length || language.dataset['lang'] !== lang) {
            language.replaceChildren(
              ...options.map((o) => {
                const option = document.createElement('option');
                option.value = o.id;
                option.textContent = o.label;
                return option;
              }),
            );
            language.dataset['lang'] = lang;
          }
          language.value = lang;
        } else {
          language.textContent = languageLabel(lang);
        }
      };
      render();

      return {
        dom,
        contentDOM: code,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          render();
          return true;
        },
        // Les controles du bandeau gerent leurs propres evenements, hors du document.
        stopEvent: (event) => bar.contains(event.target as globalThis.Node),
        ignoreMutation: (mutation) => bar.contains(mutation.target),
        destroy: () => clearTimeout(timer),
      };
    };
  },
}).configure({ lowlight: noteLowlight, defaultLanguage: null, enableTabIndentation: true });
