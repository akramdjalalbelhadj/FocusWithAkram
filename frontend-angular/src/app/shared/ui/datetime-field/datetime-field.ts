import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SettingsStore } from '../../../core/services/settings.store';
import {
  addDays,
  formatDateTime,
  isValidLocalDateTime,
  localToInstant,
  monthName,
  startOfWeek,
  zonedParts,
} from '../../../core/util/time';
import { IconComponent } from '../icon/icon';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Selecteur date + heure. La valeur du formulaire est un instant ISO UTC (ou null). L'affichage et la saisie
 * manuelle utilisent `yyyy-MM-dd HH:mm` dans le fuseau horaire configure.
 */
@Component({
  selector: 'ff-datetime',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeFieldComponent),
      multi: true,
    },
  ],
  templateUrl: './datetime-field.html',
})
export class DateTimeFieldComponent implements ControlValueAccessor {
  private readonly settings = inject(SettingsStore);

  readonly inputId = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  protected readonly value = signal<string | null>(null);
  protected readonly text = signal('');
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);

  protected readonly viewMonth = signal({ year: 2026, month: 1 });
  protected readonly draftDay = signal('');
  protected readonly draftHour = signal(9);
  protected readonly draftMinute = signal(0);

  protected readonly today = computed(() => this.settings.today());
  protected readonly monthLabel = computed(
    () => `${monthName(this.viewMonth().month)} ${this.viewMonth().year}`,
  );
  protected readonly weekdays = computed(() => {
    const names = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const first = { MONDAY: 0, SATURDAY: 5, SUNDAY: 6 }[this.settings.settings().weekStartsOn];
    return [...names.slice(first), ...names.slice(0, first)];
  });
  protected readonly cells = computed(() => {
    const { year, month } = this.viewMonth();
    const first = `${year}-${pad(month)}-01`;
    const start = startOfWeek(first, this.settings.settings().weekStartsOn);
    return Array.from({ length: 42 }, (_, i) => {
      const day = addDays(start, i);
      return { day, n: Number(day.slice(8)), inMonth: Number(day.slice(5, 7)) === month };
    });
  });

  private onChange: (v: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected pad = pad;

  writeValue(v: string | null): void {
    this.value.set(v ?? null);
    this.text.set(v ? formatDateTime(v, this.settings.timeZone()) : '');
    this.invalid.set(false);
  }

  registerOnChange(fn: (v: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onType(v: string): void {
    this.text.set(v);
    this.invalid.set(false);
  }

  /** Valide la saisie manuelle : vide = effacer, valide = emettre l'instant UTC, sinon message d'erreur. */
  protected commitText(): void {
    const t = this.text().trim();
    this.onTouched();
    if (!t) return this.emit(null);
    if (!isValidLocalDateTime(t)) {
      this.invalid.set(true);
      return;
    }
    const instant = localToInstant(t, this.settings.timeZone());
    this.emit(instant);
    this.text.set(formatDateTime(instant, this.settings.timeZone()));
  }

  protected clear(): void {
    this.emit(null);
    this.text.set('');
    this.onTouched();
  }

  protected toggle(): void {
    if (this.open()) return this.open.set(false);
    const base = this.value() ?? new Date().toISOString();
    const p = zonedParts(base, this.settings.timeZone());
    this.viewMonth.set({ year: p.year, month: p.month });
    this.draftDay.set(`${p.year}-${pad(p.month)}-${pad(p.day)}`);
    this.draftHour.set(this.value() ? p.hour : 9);
    this.draftMinute.set(this.value() ? p.minute : 0);
    this.open.set(true);
  }

  protected shiftMonth(delta: number): void {
    const { year, month } = this.viewMonth();
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    this.viewMonth.set({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  protected pickDay(day: string): void {
    this.draftDay.set(day);
  }

  protected setHour(v: string): void {
    this.draftHour.set(Math.min(23, Math.max(0, Number(v) || 0)));
  }

  protected setMinute(v: string): void {
    this.draftMinute.set(Math.min(59, Math.max(0, Number(v) || 0)));
  }

  protected setNow(): void {
    const p = zonedParts(new Date(), this.settings.timeZone());
    this.draftDay.set(`${p.year}-${pad(p.month)}-${pad(p.day)}`);
    this.draftHour.set(p.hour);
    this.draftMinute.set(p.minute);
  }

  protected apply(): void {
    const instant = localToInstant(
      `${this.draftDay()} ${pad(this.draftHour())}:${pad(this.draftMinute())}`,
      this.settings.timeZone(),
    );
    this.emit(instant);
    this.text.set(formatDateTime(instant, this.settings.timeZone()));
    this.invalid.set(false);
    this.open.set(false);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.open.set(false);
    }
  }

  private emit(v: string | null): void {
    this.value.set(v);
    this.onChange(v);
  }
}
