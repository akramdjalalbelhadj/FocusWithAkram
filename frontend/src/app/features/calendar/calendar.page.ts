import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { Task } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsStore } from '../../core/services/settings.store';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { addDays, dayLabel, formatDay, formatTime, localToInstant, monthName, startOfDayInstant, startOfWeek, weekdayName } from '../../core/util/time';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent } from '../../shared/ui/states';
import { TaskActions } from '../tasks/task-actions.service';

type View = 'month' | 'week' | 'day';

@Component({
  selector: 'ff-calendar-page',
  imports: [NgTemplateOutlet, CdkDropListGroup, CdkDropList, CdkDrag, IconComponent, EmptyComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title">Calendrier</h1>
        <p class="page-sub">Les tâches selon leur échéance. Glissez une tâche vers un autre jour pour la replanifier.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="actions.create({})"><ff-icon name="plus" />Nouvelle tâche</button>
    </header>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="flex items-center gap-1">
        <button type="button" class="btn btn-secondary btn-icon btn-sm" aria-label="Période précédente" (click)="shift(-1)"><ff-icon name="chevron-left" /></button>
        <button type="button" class="btn btn-secondary btn-sm" (click)="anchor.set(today())">Aujourd’hui</button>
        <button type="button" class="btn btn-secondary btn-icon btn-sm" aria-label="Période suivante" (click)="shift(1)"><ff-icon name="chevron-right" /></button>
      </div>
      <h2 class="font-bold text-lg capitalize flex-1 min-w-40" aria-live="polite">{{ title() }}</h2>
      <select class="input !w-auto" aria-label="Filtrer par projet" [value]="projectId()" (change)="projectId.set($any($event.target).value)">
        <option value="">Tous les projets</option>
        @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
      </select>
      <div class="flex gap-1 p-1 rounded-xl bg-surface-2" role="group" aria-label="Vue">
        @for (v of views; track v.id) {
          <button type="button" class="px-3 py-1.5 rounded-lg text-sm font-semibold" [class]="view() === v.id ? 'bg-surface shadow-card text-brand' : 'text-muted'" [attr.aria-pressed]="view() === v.id" (click)="view.set(v.id)">{{ v.label }}</button>
        }
      </div>
    </div>

    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }

    <div class="grid xl:grid-cols-[minmax(0,1fr)_18rem] gap-6">
      <div class="min-w-0">
        @if (view() === 'month') {
          <div class="card overflow-hidden" cdkDropListGroup>
            <div class="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-bold text-muted uppercase" aria-hidden="true">
              @for (d of weekHeader(); track $index) { <div class="py-2">{{ d }}</div> }
            </div>
            <div class="grid grid-cols-7" role="grid" aria-label="Mois">
              @for (cell of days(); track cell) {
                <div cdkDropList [cdkDropListData]="cell" (cdkDropListDropped)="drop($event)" role="gridcell"
                  class="min-h-24 sm:min-h-28 border-b border-r border-line p-1 flex flex-col gap-1 cursor-pointer hover:bg-surface-2/60"
                  [class.bg-surface-2]="!inMonth(cell)" [class.ring-2]="cell === selected()" [class.ring-inset]="true" [class.ring-brand]="cell === selected()"
                  (click)="selected.set(cell)" [attr.aria-label]="dayLabel(cell) + ', ' + (byDay().get(cell)?.length ?? 0) + ' tâches'">
                  <span class="text-xs font-semibold self-end px-1.5 rounded-full tabular-nums" [class]="cell === today() ? 'bg-brand text-brand-fg' : inMonth(cell) ? 'text-fg' : 'text-subtle'">{{ dayNum(cell) }}</span>
                  @for (t of (byDay().get(cell) ?? []).slice(0, 3); track t.id) {
                    <button type="button" cdkDrag [cdkDragData]="t" class="chip !px-1.5 !py-0.5 w-full justify-start truncate hidden sm:flex" (click)="$event.stopPropagation(); actions.openDetail(t.id)"
                      [style.border-color]="t.overdue ? 'var(--danger)' : 'var(--' + t.quadrant.toLowerCase() + '-line)'" [style.background]="'var(--' + t.quadrant.toLowerCase() + '-soft)'" [style.color]="t.overdue ? 'var(--danger)' : 'var(--' + t.quadrant.toLowerCase() + ')'">
                      <span class="truncate">{{ t.title }}</span>
                    </button>
                  }
                  @if ((byDay().get(cell)?.length ?? 0) > 0) {
                    <span class="sm:hidden self-center size-2 rounded-full bg-brand"></span>
                    @if ((byDay().get(cell)?.length ?? 0) > 3) { <span class="hidden sm:block text-xs text-muted pl-1">+{{ byDay().get(cell)!.length - 3 }} autres</span> }
                  }
                </div>
              }
            </div>
          </div>
        } @else if (view() === 'week') {
          <div class="grid md:grid-cols-7 gap-2">
            @for (cell of days(); track cell) {
              <section class="card p-2 min-h-40" [class.ring-2]="cell === today()" [class.ring-brand]="cell === today()" [attr.aria-label]="dayLabel(cell)">
                <h3 class="text-xs font-bold uppercase text-muted mb-2 capitalize">{{ dayLabel(cell) }}</h3>
                <div class="space-y-1.5">
                  @for (t of byDay().get(cell) ?? []; track t.id) { <ng-container *ngTemplateOutlet="row; context: { t }" /> }
                </div>
              </section>
            }
          </div>
        } @else {
          <section class="card p-4" [attr.aria-label]="dayLabel(anchor())">
            @if (!(byDay().get(anchor())?.length)) { <ff-empty icon="calendar" title="Rien d’échu ce jour-là" hint="Planifiez une tâche ou glissez-en une depuis un autre jour." /> }
            <div class="space-y-2">@for (t of byDay().get(anchor()) ?? []; track t.id) { <ng-container *ngTemplateOutlet="row; context: { t }" /> }</div>
          </section>
        }

        @if (view() === 'month') {
          <section class="card p-4 mt-4" aria-live="polite" [attr.aria-label]="'Tâches du ' + dayLabel(selected())">
            <h3 class="font-bold capitalize mb-3">{{ dayLabel(selected()) }}</h3>
            @if (!(byDay().get(selected())?.length)) { <p class="text-muted text-sm">Aucune tâche prévue ce jour-là.</p> }
            <div class="space-y-2">@for (t of byDay().get(selected()) ?? []; track t.id) { <ng-container *ngTemplateOutlet="row; context: { t }" /> }</div>
          </section>
        }
      </div>

      <aside class="card p-4 h-fit" aria-labelledby="unp-h">
        <h2 id="unp-h" class="font-bold mb-1">Non planifiées</h2>
        <p class="text-xs text-muted mb-3">Tâches sans échéance. Ouvrez-en une pour lui donner une date.</p>
        @if (!(unplanned.data()?.items?.length)) { <p class="text-sm text-muted">Toutes vos tâches ont une échéance. 👌</p> }
        <ul class="space-y-1.5">
          @for (t of unplanned.data()?.items ?? []; track t.id) {
            <li><button type="button" class="chip w-full justify-start !py-1.5 hover:bg-surface-3" (click)="actions.openDetail(t.id)"><span class="size-2 rounded-sm flex-none" [style.background]="'var(--' + t.quadrant.toLowerCase() + ')'"></span><span class="truncate">{{ t.title }}</span></button></li>
          }
        </ul>
      </aside>
    </div>

    <ng-template #row let-t="t">
      <button type="button" class="w-full text-left rounded-lg border p-2 text-sm hover:shadow-pop bg-surface" (click)="actions.openDetail(t.id)"
        [class]="t.overdue ? 'border-danger' : t.status === 'IN_PROGRESS' ? 'border-info' : 'border-line'">
        <span class="flex items-center gap-2">
          <span class="size-2 rounded-sm flex-none" [style.background]="'var(--' + t.quadrant.toLowerCase() + ')'"></span>
          <span class="font-semibold truncate flex-1">{{ t.title }}</span>
          <span class="text-xs tabular-nums text-muted">{{ time(t.plannedEndAt) }}</span>
        </span>
        <span class="flex gap-1.5 mt-1">
          @if (t.status === 'IN_PROGRESS') { <span class="badge badge-progress !text-[0.65rem]">En cours</span> }
          @if (t.overdue) { <span class="badge badge-danger !text-[0.65rem]">En retard</span> }
          @if (t.project) { <span class="chip !text-[0.65rem]">{{ t.project.name }}</span> }
        </span>
      </button>
    </ng-template>
  `,
})
export class CalendarPage {
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(TasksApi);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly views: { id: View; label: string }[] = [{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }, { id: 'day', label: 'Jour' }];
  protected readonly view = signal<View>('month');
  protected readonly anchor = signal(this.settings.today());
  protected readonly selected = signal(this.settings.today());
  protected readonly projectId = signal('');
  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });
  protected readonly today = computed(() => this.settings.today());
  protected readonly dayLabel = dayLabel;

  /** Jours affichés selon la vue (42 cases en mois, 7 en semaine, 1 en jour). */
  protected readonly days = computed<string[]>(() => {
    const a = this.anchor();
    const ws = this.settings.settings().weekStartsOn;
    if (this.view() === 'day') return [a];
    if (this.view() === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(a, ws), i));
    const start = startOfWeek(`${a.slice(0, 7)}-01`, ws);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  });

  protected readonly weekHeader = computed(() => this.days().slice(0, 7).map((d) => weekdayName(d).slice(0, 3)));

  protected readonly title = computed(() => {
    const a = this.anchor();
    if (this.view() === 'month') return `${monthName(Number(a.slice(5, 7)))} ${a.slice(0, 4)}`;
    if (this.view() === 'day') return dayLabel(a);
    const d = this.days();
    return `${dayLabel(d[0])} – ${dayLabel(d[6])}`;
  });

  protected readonly loader = new Loader(() => {
    const d = this.days();
    const tz = this.settings.timeZone();
    return this.api.list({
      dueFrom: startOfDayInstant(d[0], tz),
      dueTo: startOfDayInstant(addDays(d[d.length - 1], 1), tz),
      projectId: this.projectId(),
      size: 200,
      sort: 'plannedEndAt',
      dir: 'asc',
    });
  });

  protected readonly unplanned = new Loader(() => this.api.list({ unplanned: true, size: 30, projectId: this.projectId(), sort: 'createdAt', dir: 'desc' }));

  protected readonly byDay = computed(() => {
    const map = new Map<string, Task[]>();
    for (const t of this.loader.data()?.items ?? []) {
      if (!t.plannedEndAt) continue;
      const day = formatDay(t.plannedEndAt, this.settings.timeZone());
      map.set(day, [...(map.get(day) ?? []), t]);
    }
    return map;
  });

  protected dayNum(day: string): number {
    return Number(day.slice(8));
  }

  protected inMonth(day: string): boolean {
    return day.slice(0, 7) === this.anchor().slice(0, 7);
  }

  protected time(iso: string | null): string {
    return formatTime(iso, this.settings.timeZone());
  }

  protected shift(dir: 1 | -1): void {
    const a = this.anchor();
    if (this.view() === 'month') {
      const d = new Date(Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1 + dir, 1));
      const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      this.anchor.set(next);
      this.selected.set(next);
    } else {
      const next = addDays(a, dir * (this.view() === 'week' ? 7 : 1));
      this.anchor.set(next);
      this.selected.set(next);
    }
  }

  /** Replanifie par glisser-deposer : conserve l'heure locale et decale le debut prevu du meme nombre de jours. */
  protected async drop(e: CdkDragDrop<string, string, Task>): Promise<void> {
    const task = e.item.data;
    const target = e.container.data;
    if (!task.plannedEndAt || e.previousContainer.data === target) return;
    const tz = this.settings.timeZone();
    const move = (iso: string | null): string | null => {
      if (!iso) return null;
      const local = this.settings.fmt(iso).slice(11);
      return localToInstant(`${target} ${local}`, tz);
    };
    const newEnd = move(task.plannedEndAt);
    const deltaDays = Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${e.previousContainer.data}T00:00:00Z`)) / 86_400_000);
    const newStart = task.plannedStartAt
      ? localToInstant(`${addDays(formatDay(task.plannedStartAt, tz), deltaDays)} ${this.settings.fmt(task.plannedStartAt).slice(11)}`, tz)
      : null;
    try {
      await firstValueFrom(this.api.update(task.id, { plannedEndAt: newEnd, plannedStartAt: newStart }));
      this.toast.success(`Échéance déplacée au ${dayLabel(target)}.`);
      this.refresh.bump();
    } catch {
      this.toast.error('Impossible de modifier l’échéance.');
    }
  }
}
