import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AsciiStudioComponent, AsciiStudioData } from './ascii-studio';

describe('AsciiStudioComponent', () => {
  let fixture: ComponentFixture<AsciiStudioComponent>;
  let closed: (string | undefined)[];
  const el = () => fixture.nativeElement as HTMLElement;
  const area = (id: string) => el().querySelector<HTMLTextAreaElement>(`#${id}`)!;
  const names = () =>
    [...el().querySelectorAll<HTMLInputElement>('.ascii-name')].map((i) => i.value);
  const button = (label: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
    )!;

  async function open(data: AsciiStudioData): Promise<void> {
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close: (v?: string) => closed.push(v) } },
      ],
    });
    fixture = TestBed.createComponent(AsciiStudioComponent);
    await render();
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function type(target: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    target.value = text;
    target.dispatchEvent(new Event('input'));
    await render();
  }

  describe('arborescence', () => {
    beforeEach(() => open({ kind: 'tree', text: 'app/\n└── a.ts' }));

    it('synchronise texte, hiérarchie et commandes dans les deux sens', async () => {
      expect(names()).toEqual(['app', 'a.ts']);
      expect(area('ascii-commands').value).toBe('mkdir -p app\ntouch app/a.ts');

      await type(area('ascii-tree-text'), 'app/\n├── a.ts\n└── lib/');
      expect(names()).toEqual(['app', 'a.ts', 'lib']);
      expect(area('ascii-commands').value).toBe('mkdir -p app/lib\ntouch app/a.ts');

      button('Ajouter un fichier dans lib').click();
      await render();
      expect(area('ascii-tree-text').value).toBe('app/\n├── a.ts\n└── lib/\n    └── fichier.txt');
      const name = el().querySelector<HTMLInputElement>('[data-tree-path="0-1-0"]')!;
      await type(name, 'index.ts');
      expect(area('ascii-tree-text').value).toContain('└── index.ts');

      await type(area('ascii-commands'), 'mkdir -p web/css\ntouch web/index.html\nnpm i');
      expect(area('ascii-tree-text').value).toBe('web/\n├── css/\n└── index.html');
      expect(el().textContent).toContain('1 ligne(s) ignorée(s)');
    });

    it('Tab range l’élément dans le dossier au-dessus ; Mettre à jour rend le texte', async () => {
      await type(area('ascii-tree-text'), 'a/\nb.txt');
      const b = el().querySelector<HTMLInputElement>('[data-tree-path="1"]')!;
      b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      await render();
      expect(area('ascii-tree-text').value).toBe('a/\n└── b.txt');
      button('Mettre à jour').click();
      expect(closed).toEqual(['a/\n└── b.txt']);
    });
  });

  it('tableau : la grille et le texte se suivent', async () => {
    await open({ kind: 'table', text: '+---+---+\n| A | B |\n+===+===+\n| 1 | 2 |\n+---+---+' });
    const cells = () => [...el().querySelectorAll<HTMLInputElement>('.ascii-cell')];
    expect(cells().map((c) => c.value)).toEqual(['A', 'B', '1', '2']);
    await type(cells()[3], 'deux');
    expect(area('ascii-table-text').value).toBe(
      '+---+------+\n| A | B    |\n+===+======+\n| 1 | deux |\n+---+------+',
    );
    await type(area('ascii-table-text'), '| X | Y |\n|---|---|\n| 3 | 4 |');
    expect(cells().map((c) => c.value)).toEqual(['X', 'Y', '3', '4']);
    await type(area('ascii-table-text'), 'texte libre');
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Tableau non reconnu');
  });

  it('bannière : insère le texte encadré', async () => {
    await open({ kind: 'banner' });
    await type(area('ascii-banner-text'), 'Go');
    const box = [...el().querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
      (r) => r.value === 'box',
    )!;
    box.click();
    await render();
    expect(el().querySelector('.ascii-preview pre')?.textContent).toBe(
      '+------+\n|  Go  |\n+------+',
    );
    button('Insérer dans la note').click();
    expect(closed).toEqual(['+------+\n|  Go  |\n+------+']);
  });
});
