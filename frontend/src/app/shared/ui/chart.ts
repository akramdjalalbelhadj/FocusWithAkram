import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import type { EChartsCoreOption, ECharts } from 'echarts/core';

/** Lit une variable CSS du design system pour que les graphiques suivent le theme clair / sombre. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartTheme() {
  return {
    fg: cssVar('--fg'),
    muted: cssVar('--muted'),
    line: cssVar('--line'),
    surface: cssVar('--surface'),
    brand: cssVar('--brand'),
    success: cssVar('--success'),
    warning: cssVar('--warning'),
    danger: cssVar('--danger'),
    info: cssVar('--info'),
    q: [cssVar('--q1'), cssVar('--q2'), cssVar('--q3'), cssVar('--q4')],
  };
}

/** Enveloppe ECharts : chargement differe, redimensionnement, mise a jour a chaque changement de theme. */
@Component({
  selector: 'ff-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block;width:100%', role: 'img', '[attr.aria-label]': 'label()' },
  template: `<div #host [style.height.px]="height()"></div>`,
})
export class ChartComponent implements OnDestroy {
  /** Fonction (et non objet) : reevaluee au changement de theme pour relire les couleurs. */
  readonly option = input.required<() => EChartsCoreOption>();
  readonly height = input(260);
  readonly label = input('Graphique');
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  private chart: ECharts | null = null;
  private resize: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private media: MediaQueryList | null = null;
  private readonly onMedia = () => this.render();

  constructor() {
    effect(() => {
      this.option();
      void this.render();
    });
  }

  private async render(): Promise<void> {
    const el = this.host().nativeElement;
    const echarts = await import('./echarts-setup').then((m) => m.echarts);
    this.chart ??= echarts.init(el, undefined, { renderer: 'canvas' });
    if (!this.resize) {
      this.resize = new ResizeObserver(() => this.chart?.resize());
      this.resize.observe(el);
      this.themeObserver = new MutationObserver(() => void this.render());
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this.media = matchMedia('(prefers-color-scheme: dark)');
      this.media.addEventListener('change', this.onMedia);
    }
    this.chart.setOption(this.option()(), true);
  }

  ngOnDestroy(): void {
    this.resize?.disconnect();
    this.themeObserver?.disconnect();
    this.media?.removeEventListener('change', this.onMedia);
    this.chart?.dispose();
  }
}
