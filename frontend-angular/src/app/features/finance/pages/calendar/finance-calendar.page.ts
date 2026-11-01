import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Operation } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { sumMoney } from '../../../../core/util/money-sum';
import { addDays, longDate, monthName, startOfWeek } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OperationRowComponent } from '../../components/operation-row/operation-row';

interface Day {
  date: string;
  inMonth: boolean;
  ops: Operation[];
  /** Entrees et sorties du jour (prevues et realisees), hors virements et prets. */
  income: number;
  expense: number;
}

/** Signe d'une operation pour le calendrier : revenus et remboursements en entree, depenses en sortie. */
function flow(o: Operation): 'in' | 'out' | null {
  if (o.type === 'INCOME' || o.type === 'PURCHASE_REFUND') return 'in';
  if (o.type === 'EXPENSE') return 'out';
  return null;
}

/** Calendrier financier du mois : revenus et depenses realises et prevus, echeances comprises, jour par jour. */
@Component({
  selector: 'ff-finance-calendar',
  imports: [IconComponent, ErrorComponent, SkeletonComponent, OperationRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-calendar.page.html',
})
export class FinanceCalendarPage {
  private readonly api = inject(FinanceApi);
  private readonly settings = inject(SettingsStore);
  protected readonly today = this.settings.today();
  protected readonly currentMonth = this.today.slice(0, 7);
  protected readonly month = signal(this.currentMonth);
  protected readonly selected = signal<string | null>(this.today);
  protected readonly loader = new Loader(() => this.api.calendar(this.month()));
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;

  protected readonly monthTitle = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return `${monthName(m)} ${y}`;
  });

  protected readonly weekdays = computed(() => {
    const first = startOfWeek(`${this.month()}-01`, this.settings.settings().weekStartsOn);
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(
        new Date(`${addDays(first, i)}T00:00:00Z`),
      ),
    );
  });

  protected readonly weeks = computed<Day[][]>(() => {
    const ops = this.loader.data() ?? [];
    const byDate = new Map<string, Operation[]>();
    for (const o of ops) byDate.set(o.date, [...(byDate.get(o.date) ?? []), o]);
    const month = this.month();
    let day = startOfWeek(`${month}-01`, this.settings.settings().weekStartsOn);
    const weeks: Day[][] = [];
    while (weeks.length === 0 || day.slice(0, 7) === month) {
      const week: Day[] = [];
      for (let i = 0; i < 7; i++) {
        const list = day.slice(0, 7) === month ? (byDate.get(day) ?? []) : [];
        week.push({
          date: day,
          inMonth: day.slice(0, 7) === month,
          ops: list,
          income: sumMoney(list.filter((o) => flow(o) === 'in').map((o) => o.amount)),
          expense: sumMoney(list.filter((o) => flow(o) === 'out').map((o) => o.amount)),
        });
        day = addDays(day, 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  protected readonly selectedOps = computed(() => {
    const d = this.selected();
    return d ? (this.loader.data() ?? []).filter((o) => o.date === d) : [];
  });

  protected readonly monthTotals = computed(() => {
    const ops = this.loader.data() ?? [];
    return {
      income: sumMoney(ops.filter((o) => flow(o) === 'in').map((o) => o.amount)),
      expense: sumMoney(ops.filter((o) => flow(o) === 'out').map((o) => o.amount)),
    };
  });

  protected shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month.set(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
    this.selected.set(this.month() === this.currentMonth ? this.today : null);
  }

  protected dayLabel(d: Day): string {
    const parts = [longDate(d.date)];
    if (d.income) parts.push(`entrées ${formatMoney(d.income)}`);
    if (d.expense) parts.push(`sorties ${formatMoney(d.expense)}`);
    if (!d.ops.length) parts.push('aucune opération');
    return parts.join(', ');
  }
}
