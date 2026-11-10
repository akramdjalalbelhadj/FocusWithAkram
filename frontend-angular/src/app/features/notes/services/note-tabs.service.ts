import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Une idee ouverte dans un onglet : de quoi l'afficher sans la recharger. */
export interface NoteTab {
  id: string;
  title: string;
  /** Couleur de la categorie (pastille) ; null : sans categorie. */
  color: string | null;
}

/** Ce qu'il faut d'une idee pour rafraichir son onglet (resume de la liste ou idee complete). */
export interface NoteTabSource {
  id: string;
  title: string;
  category?: { color: string } | null;
}

export const NOTE_TABS_KEY = 'ff.notes.tabs';

/** Relit les onglets enregistres ; toute donnee illisible est ignoree. */
export function readNoteTabs(raw: string | null): NoteTab[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const tabs: NoteTab[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const { id, title, color } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seen.has(id) || typeof title !== 'string') continue;
    seen.add(id);
    tabs.push({ id, title, color: typeof color === 'string' && color ? color : null });
  }
  return tabs;
}

function load(): NoteTab[] {
  try {
    return readNoteTabs(localStorage.getItem(NOTE_TABS_KEY));
  } catch {
    return [];
  }
}

/**
 * Onglets du module Notes & idees. Ouvrir une idee lui ajoute un onglet (a la fin) ; revenir a la liste le laisse
 * ouvert ; seul « Fermer l'onglet » (ou la suppression de l'idee) le retire. Etat d'interface propre a l'appareil :
 * conserve dans le navigateur (survit au rechargement), partage entre ses fenetres, hors sauvegarde.
 */
@Injectable({ providedIn: 'root' })
export class NoteTabs {
  private readonly state = signal<NoteTab[]>(load());
  readonly tabs = this.state.asReadonly();

  constructor() {
    // Une autre fenetre de l'application a modifie les onglets : celle-ci s'aligne.
    const sync = (event: StorageEvent) => {
      if (event.key === NOTE_TABS_KEY || event.key === null) this.state.set(load());
    };
    try {
      window.addEventListener('storage', sync);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', sync));
    } catch {
      /* hors navigateur */
    }
  }

  has(id: string): boolean {
    return this.state().some((t) => t.id === id);
  }

  /** Ouvre l'idee dans un onglet (ajoute a la fin), ou met a jour l'onglet deja ouvert. */
  open(note: NoteTabSource): void {
    const tab = toTab(note);
    if (this.has(tab.id)) this.update(tab.id, tab);
    else this.save([...this.state(), tab]);
  }

  /** Met a jour le titre ou la couleur d'un onglet ouvert ; sans effet si l'onglet a ete ferme. */
  update(id: string, patch: Partial<Pick<NoteTab, 'title' | 'color'>>): void {
    const title = patch.title?.trim();
    let changed = false;
    const next = this.state().map((t) => {
      if (t.id !== id) return t;
      const updated = {
        ...t,
        ...(title ? { title } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      };
      changed = updated.title !== t.title || updated.color !== t.color;
      return updated;
    });
    if (changed) this.save(next);
  }

  /** Rafraichit les onglets des idees chargees ailleurs (liste) : titre ou categorie modifies entre-temps. */
  refresh(notes: readonly NoteTabSource[]): void {
    for (const note of notes) {
      if (this.has(note.id)) this.update(note.id, toTab(note));
    }
  }

  close(id: string): void {
    if (this.has(id)) this.save(this.state().filter((t) => t.id !== id));
  }

  closeOthers(id: string): void {
    this.save(this.state().filter((t) => t.id === id));
  }

  closeAll(): void {
    this.save([]);
  }

  /** Onglet a afficher apres la fermeture de `id` : celui de droite, sinon celui de gauche, sinon aucun. */
  neighbor(id: string): string | null {
    const tabs = this.state();
    const index = tabs.findIndex((t) => t.id === id);
    if (index < 0) return null;
    return (tabs[index + 1] ?? tabs[index - 1])?.id ?? null;
  }

  private save(tabs: NoteTab[]): void {
    this.state.set(tabs);
    try {
      if (tabs.length) localStorage.setItem(NOTE_TABS_KEY, JSON.stringify(tabs));
      else localStorage.removeItem(NOTE_TABS_KEY);
    } catch {
      /* stockage indisponible : les onglets durent le temps de la session */
    }
  }
}

function toTab(note: NoteTabSource): NoteTab {
  return {
    id: note.id,
    title: note.title.trim() || 'Sans titre',
    color: note.category?.color ?? null,
  };
}
