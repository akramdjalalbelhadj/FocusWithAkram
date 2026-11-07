import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { copyText } from '../../editor/code-block';
import { MARKDOWN_HELP } from '../../util/markdown-help';
import { MarkdownViewComponent } from '../markdown-view/markdown-view';

/**
 * Aide Markdown (panneau lateral) : chaque syntaxe disponible, son code et son rendu cote a cote. « Insérer »
 * referme le panneau et rend l'exemple a l'editeur, qui l'ajoute a la position du curseur.
 */
@Component({
  selector: 'ff-markdown-help-panel',
  imports: [IconComponent, MarkdownViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './markdown-help.panel.html',
  styleUrl: './markdown-help.panel.css',
})
export class MarkdownHelpPanelComponent {
  protected readonly ref = inject<DialogRef<string, MarkdownHelpPanelComponent>>(DialogRef);
  protected readonly sections = MARKDOWN_HELP;
  /** Exemple dont le code vient d'etre copie (retour visuel). */
  protected readonly copied = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected async copy(markdown: string): Promise<void> {
    if (await copyText(markdown)) {
      this.copied.set(markdown);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(null), 1500);
    }
  }

  protected insert(markdown: string): void {
    this.ref.close(markdown);
  }

  protected scrollTo(id: string, event: Event): void {
    event.preventDefault();
    document
      .getElementById(`md-help-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
