import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../core/api/misc.api';
import { ArchiveSection, ArchivedTask, DayCount, QUADRANTS, Quadrant } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsStore } from '../../core/services/settings.store';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../core/util/download';
import { formatDuration, formatTime, longDate, monthName } from '../../core/util/time';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../shared/ui/states';
import { TaskActions } from '../tasks/task-actions.service';

const SECTION_LABEL: Record<ArchiveSection, string> = {
  TODAY: "Aujourd'hui",
  YESTERDAY: 'Hier',
  THIS_WEEK: 'Cette semaine',
  THIS_MONTH: 'Ce mois-ci',
  PREVIOUS_MONTHS: 'Mois précédents',
  PREVIOUS_YEARS: 'Années précédentes',
};
const SECTION_ORDER: ArchiveSection[] = ['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'PREVIOUS_MONTHS', 'PREVIOUS_YEARS'];

interface DayGroup {
  day: string;
  items: ArchivedTask[];
}
interface SectionGroup {
  section: ArchiveSection;
  label: string;
  days: DayGroup[];
}

@Component({
  selector: 'ff-archives-page',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title"><span class="page-icon"><ff-icon name="archive" [size]="24" /></span>Archives</h1>
        <p class="page-sub">Tâches terminées, classées par date réelle de fin.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-secondary" (click)="export('csv')"><ff-icon name="download" />CSV</button>
        <button type="button" class="btn btn-secondary" (click)="export('json')"><ff-icon name="download" />JSON</button>
      </div>
    </header>

    <div class="flex flex-wrap gap-2 mb-3" role="search">
      <div class="relative flex-1 min-w-48 max-w-sm">
        <ff-icon name="search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input class="input pl-9" type="search" placeholder="Rechercher par nom" aria-label="Rechercher par nom" [value]="q()" (input)="q.set($any($event.target).value); reset()" />
      </div>
      <select class="input !w-auto" aria-label="Projet" [value]="projectId()" (change)="projectId.set($any($event.target).value); reset()">
        <option value="">Tous les projets</option>
        @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
      </select>
      <select class="input !w-auto" aria-label="Quadrant" [value]="quadrant()" (change)="quadrant.set($any($event.target).value); reset()">
        <option value="">Tous les quadrants</option>
        @for (q of quadrants; track q) { <option [value]="q">{{ q }}</option> }
      </select>
      <label class="flex items-center gap-2 text-sm text-muted">Du
        <input class="input !w-auto" type="date" [value]="from()" (change)="from.set($any($event.target).value); reset()" aria-label="Du" /></label>
      <label class="flex items-center gap-2 text-sm text-muted">au
        <input class="input !w-auto" type="date" [value]="to()" (change)="to.set($any($event.target).value); reset()" aria-label="Au" /></label>
      <button type="button" class="btn btn-secondary" (click)="newestFirst.set(!newestFirst()); reset()" [attr.aria-label]="'Tri par date de fin : ' + (newestFirst() ? 'récentes d’abord' : 'anciennes d’abord')">
        <ff-icon name="clock" [size]="15" />{{ newestFirst() ? 'Récentes d’abord' : 'Anciennes d’abord' }}
      </button>
    </div>

    <!-- Navigation annee / mois -->
    @if (years().length) {
      <nav class="flex flex-wrap items-center gap-1.5 mb-5" aria-label="Navigation par période">
        <button type="button" class="chip !py-1" [class.!bg-brand-soft]="!from() && !to()" (click)="clearPeriod()">Tout</button>
        @for (y of years(); track y) {
          <button type="button" class="chip !py-1" [class.!bg-brand-soft]="selectedYear() === y" (click)="pickYear(y)">{{ y }}</button>
        }
        @if (selectedYear()) {
          <span class="mx-1 text-subtle">›</span>
          @for (m of monthsOf(selectedYear()!); track m.month) {
            <button type="button" class="chip !py-1 capitalize" [class.!bg-brand-soft]="selectedMonth() === m.month" (click)="pickMonth(selectedYear()!, m.month)">{{ monthShort(m.month) }} ({{ m.count }})</button>
          }
        }
      </nav>
    }

    @if (error()) { <ff-error (retry)="load(true)" /> }
    @else if (loading() && !items().length) { <ff-skeleton [count]="5" /> }
    @else if (!sections().length) {
      <div class="card"><ff-empty icon="archive" title="Aucune tâche archivée" hint="Les tâches terminées arrivent ici automatiquement, avec tout leur historique." /></div>
    } @else {
      <p class="text-sm text-muted mb-3" aria-live="polite">{{ total() }} tâche{{ total() > 1 ? 's' : '' }} archivée{{ total() > 1 ? 's' : '' }}</p>
      <div class="space-y-8">
        @for (s of sections(); track s.section) {
          <section [attr.aria-label]="s.label">
            <h2 class="section-title mb-3">{{ s.label }}</h2>
            <div class="space-y-5">
              @for (d of s.days; track d.day) {
                <div>
                  <h3 class="font-semibold text-sm mb-2 capitalize">{{ dayTitle(d.day) }}</h3>
                  <ul class="space-y-2">
                    @for (a of d.items; track a.task.id) {
                      <li class="card p-3 sm:p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span class="tabular-nums font-bold text-muted w-12">{{ time(a.task.actualEndAt) }}</span>
                        <div class="flex-1 min-w-48">
                          <button type="button" class="font-semibold text-left hover:text-brand" (click)="actions.openDetail(a.task.id)">{{ a.task.title }}</button>
                          <div class="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                            @if (a.task.project; as p) { <span class="chip"><span class="size-2 rounded-full" [style.background]="p.color"></span>{{ p.name }}</span> }
                            <span class="chip" [style.color]="'var(--' + a.task.quadrant.toLowerCase() + ')'">{{ a.task.quadrant }}</span>
                          </div>
                        </div>
                        <dl class="flex gap-4 text-xs text-muted">
                          <div><dt>Prévu</dt><dd class="font-semibold text-fg tabular-nums">{{ dur(a.task.timing.plannedDurationSeconds) }}</dd></div>
                          <div><dt>Réel</dt><dd class="font-semibold text-fg tabular-nums">{{ dur(a.task.timing.actualElapsedSeconds) }}</dd></div>
                          <div><dt>Actif</dt><dd class="font-semibold text-fg tabular-nums">{{ dur(a.task.timing.activeSeconds) }}</dd></div>
                        </dl>
                        @switch (a.task.timing.punctuality) {
                          @case ('EARLY') { <span class="badge badge-done">En avance</span> }
                          @case ('ON_TIME') { <span class="badge badge-progress">À l'heure</span> }
                          @case ('LATE') { <span class="badge badge-danger">En retard</span> }
                        }
                        <div class="flex gap-1 ml-auto">
                          <button type="button" class="btn btn-ghost btn-sm" (click)="actions.openDetail(a.task.id)"><ff-icon name="info" [size]="14" />Détail</button>
                          <button type="button" class="btn btn-secondary btn-sm" (click)="actions.restore(a.task)"><ff-icon name="restore" [size]="14" />Restaurer</button>
                        </div>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          </section>
        }
      </div>
      @if (hasMore()) {
        <div class="text-center mt-8"><button type="button" class="btn btn-secondary" [disabled]="loading()" (click)="loadMore()">Charger la suite</button></div>
      }
    }
  `,
})
export class ArchivesPage {
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(TasksApi);
  private readonly transfer = inject(TransferApi);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly quadrants = QUADRANTS;
  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });

  protected readonly q = signal('');
  protected readonly projectId = signal('');
  protected readonly quadrant = signal<Quadrant | ''>('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly newestFirst = signal(true);

  protected readonly items = signal<ArchivedTask[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private page = 0;
  private lastPage = 0;
  private readonly facets = signal<DayCount[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly hasMore = computed(() => this.page + 1 < this.lastPage);

  protected readonly sections = computed<SectionGroup[]>(() => {
    const bySection = new Map<ArchiveSection, Map<string, ArchivedTask[]>>();
    for (const a of this.items()) {
      const days = bySection.get(a.section) ?? new Map<string, ArchivedTask[]>();
      days.set(a.day, [...(days.get(a.day) ?? []), a]);
      bySection.set(a.section, days);
    }
    return SECTION_ORDER.filter((s) => bySection.has(s)).map((s) => ({
      section: s,
      label: SECTION_LABEL[s],
      days: [...bySection.get(s)!.entries()].map(([day, items]) => ({ day, items })),
    }));
  });

  protected readonly years = computed(() => [...new Set(this.facets().map((f) => Number(f.date.slice(0, 4))))].sort((a, b) => b - a));
  protected readonly selectedYear = computed(() => (this.from() ? Number(this.from().slice(0, 4)) : null));
  protected readonly selectedMonth = computed(() => (this.from() && this.to() && this.from().slice(0, 7) === this.to().slice(0, 7) ? Number(this.from().slice(5, 7)) : null));

  constructor() {
    // Chargement initial, puis rechargement apres toute mutation (restauration, suppression...).
    effect(() => {
      this.refresh.tick();
      untracked(() => {
        void this.load(true);
        void this.loadFacets();
      });
    });
  }

  protected reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(true), 250);
  }

  protected loadMore(): void {
    this.page++;
    this.load(false);
  }

  protected async load(replace: boolean): Promise<void> {    if (replace) this.page = 0;
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.archives({
          q: this.q(), projectId: this.projectId(), quadrant: this.quadrant(), from: this.from(), to: this.to(),
          page: this.page, size: 40, order: this.newestFirst() ? 'desc' : 'asc',
        }),
      );
      this.items.set(replace ? res.items : [...this.items(), ...res.items]);
      this.total.set(res.totalItems);
      this.lastPage = res.totalPages;
      this.error.set(false);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFacets(): Promise<void> {
    try {
      this.facets.set(await firstValueFrom(this.api.archiveFacets()));
    } catch {
      /* navigation par periode facultative */
    }
  }

  protected monthsOf(year: number): { month: number; count: number }[] {
    const counts = new Map<number, number>();
    for (const f of this.facets()) {
      if (Number(f.date.slice(0, 4)) === year) counts.set(Number(f.date.slice(5, 7)), (counts.get(Number(f.date.slice(5, 7))) ?? 0) + f.count);
    }
    return [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([month, count]) => ({ month, count }));
  }

  protected monthShort(m: number): string {
    return monthName(m).slice(0, 4);
  }

  protected pickYear(y: number): void {
    this.from.set(`${y}-01-01`);
    this.to.set(`${y}-12-31`);
    this.load(true);
  }

  protected pickMonth(y: number, m: number): void {
    const mm = String(m).padStart(2, '0');
    this.from.set(`${y}-${mm}-01`);
    this.to.set(`${y}-${mm}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`);
    this.load(true);
  }

  protected clearPeriod(): void {
    this.from.set('');
    this.to.set('');
    this.load(true);
  }

  protected dayTitle(day: string): string {
    return longDate(day);
  }

  protected time(iso: string | null): string {
    return formatTime(iso, this.settings.timeZone());
  }

  protected dur(s: number | null): string {
    return formatDuration(s);
  }

  protected async export(format: 'csv' | 'json'): Promise<void> {
    try {
      saveBlob(await firstValueFrom(this.transfer.exportTasks(format, 'ARCHIVED')), `focusflow-archives.${format}`);
    } catch {
      this.toast.error('L’export a échoué.');
    }
  }
}
