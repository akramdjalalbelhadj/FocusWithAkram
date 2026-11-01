import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../../../core/api/misc.api';
import {
  ArchiveSection,
  ArchivedTask,
  DayCount,
  QUADRANTS,
  Quadrant,
} from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { saveBlob } from '../../../../core/util/download';
import { formatDuration, formatTime, longDate, monthName } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';

const SECTION_LABEL: Record<ArchiveSection, string> = {
  TODAY: "Aujourd'hui",
  YESTERDAY: 'Hier',
  THIS_WEEK: 'Cette semaine',
  THIS_MONTH: 'Ce mois-ci',
  PREVIOUS_MONTHS: 'Mois précédents',
  PREVIOUS_YEARS: 'Années précédentes',
};
const SECTION_ORDER: ArchiveSection[] = [
  'TODAY',
  'YESTERDAY',
  'THIS_WEEK',
  'THIS_MONTH',
  'PREVIOUS_MONTHS',
  'PREVIOUS_YEARS',
];

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
  templateUrl: './archives.page.html',
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
  private readonly page = signal(0);
  private readonly lastPage = signal(0);
  private readonly facets = signal<DayCount[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Numero de la derniere requete : une reponse plus ancienne arrivee en retard est ignoree. */
  private seq = 0;

  protected readonly hasMore = computed(() => this.page() + 1 < this.lastPage());

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

  protected readonly years = computed(() =>
    [...new Set(this.facets().map((f) => Number(f.date.slice(0, 4))))].sort((a, b) => b - a),
  );
  protected readonly selectedYear = computed(() =>
    this.from() ? Number(this.from().slice(0, 4)) : null,
  );
  protected readonly selectedMonth = computed(() =>
    this.from() && this.to() && this.from().slice(0, 7) === this.to().slice(0, 7)
      ? Number(this.from().slice(5, 7))
      : null,
  );

  constructor() {
    // Chargement initial, puis rechargement apres toute mutation (restauration, suppression...).
    effect(() => {
      this.refresh.tick();
      untracked(() => {
        void this.load(true);
        void this.loadFacets();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });
  }

  protected reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(true), 250);
  }

  protected loadMore(): void {
    this.page.update((p) => p + 1);
    void this.load(false);
  }

  protected async load(replace: boolean): Promise<void> {
    if (replace) this.page.set(0);
    const seq = ++this.seq;
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.archives({
          q: this.q(),
          projectId: this.projectId(),
          quadrant: this.quadrant(),
          from: this.from(),
          to: this.to(),
          page: this.page(),
          size: 40,
          order: this.newestFirst() ? 'desc' : 'asc',
        }),
      );
      if (seq !== this.seq) return;
      this.items.set(replace ? res.items : [...this.items(), ...res.items]);
      this.total.set(res.totalItems);
      this.lastPage.set(res.totalPages);
      this.error.set(false);
    } catch {
      if (seq === this.seq) this.error.set(true);
    } finally {
      if (seq === this.seq) this.loading.set(false);
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
      if (Number(f.date.slice(0, 4)) === year)
        counts.set(
          Number(f.date.slice(5, 7)),
          (counts.get(Number(f.date.slice(5, 7))) ?? 0) + f.count,
        );
    }
    return [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([month, count]) => ({ month, count }));
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
      saveBlob(
        await firstValueFrom(this.transfer.exportTasks(format, 'ARCHIVED')),
        `focusflow-archives.${format}`,
      );
    } catch {
      this.toast.error('L’export a échoué.');
    }
  }
}
