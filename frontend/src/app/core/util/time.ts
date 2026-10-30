/**
 * Utilitaires de dates. Le backend renvoie des instants UTC ; l'affichage et la saisie se font dans le
 * fuseau horaire configure par l'utilisateur (et non celui du navigateur), au format `yyyy-MM-dd HH:mm`.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Decompose un instant en champs de calendrier dans le fuseau donne. */
export function zonedParts(instant: Date | string | number, timeZone: string): ZonedParts {
  const date = instant instanceof Date ? instant : new Date(instant);
  const map: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  return {
    year: map['year'],
    month: map['month'],
    day: map['day'],
    hour: map['hour'] === 24 ? 0 : map['hour'],
    minute: map['minute'],
    second: map['second'],
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `yyyy-MM-dd` dans le fuseau donne. */
export function formatDay(instant: Date | string, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** `yyyy-MM-dd HH:mm` dans le fuseau donne (format d'affichage impose). */
export function formatDateTime(instant: Date | string | null | undefined, timeZone: string): string {
  if (!instant) return '';
  const p = zonedParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatTime(instant: Date | string | null | undefined, timeZone: string): string {
  if (!instant) return '';
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

export function isValidLocalDateTime(text: string): boolean {
  const m = LOCAL_PATTERN.exec(text.trim());
  if (!m) return false;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || h > 23 || mi > 59 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

/**
 * Convertit une date locale saisie (`yyyy-MM-dd HH:mm`, dans `timeZone`) en instant ISO UTC.
 * Gere les changements d'heure : une heure inexistante (saut printemps) est decalee vers l'avant,
 * une heure ambigue (retour automne) prend la seconde occurrence (heure d'hiver).
 */
export function localToInstant(text: string, timeZone: string): string | null {
  const m = LOCAL_PATTERN.exec(text.trim());
  if (!m || !isValidLocalDateTime(text)) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(guess, timeZone);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const diff = wanted - actual;
    if (diff === 0) break;
    guess += diff;
  }
  // Heure inexistante (saut de printemps) : l'instant obtenu s'affiche une heure trop tot ; on avance d'une heure.
  const check = zonedParts(guess, timeZone);
  if (Date.UTC(check.year, check.month - 1, check.day, check.hour, check.minute) !== wanted) guess += 3_600_000;
  return new Date(guess).toISOString();
}

/** Instant du debut de la journee locale `yyyy-MM-dd` dans le fuseau. */
export function startOfDayInstant(day: string, timeZone: string): string {
  return localToInstant(`${day} 00:00`, timeZone) ?? new Date(day).toISOString();
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Jour de la semaine ISO (1 = lundi ... 7 = dimanche) d'un `yyyy-MM-dd`. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

const WEEK_START: Record<string, number> = { MONDAY: 1, SUNDAY: 7, SATURDAY: 6 };

export function startOfWeek(day: string, weekStartsOn: string): string {
  const first = WEEK_START[weekStartsOn] ?? 1;
  const diff = (isoWeekday(day) - first + 7) % 7;
  return addDays(day, -diff);
}

/** Duree en secondes -> « 3 h 45 », « 25 min », « 40 s ». */
export function formatDuration(totalSeconds: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—';
  const sign = totalSeconds < 0 ? '−' : opts.signed && totalSeconds > 0 ? '+' : '';
  const abs = Math.abs(Math.round(totalSeconds));
  if (abs < 60) return `${sign}${abs} s`;
  const minutes = Math.round(abs / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${sign}${m} min`;
  if (h >= 24 && m === 0 && h % 24 === 0) return `${sign}${h / 24} j`;
  return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${pad(m)}`;
}

/** `mm:ss` pour le minuteur (heures au-dela de 60 min). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function monthName(month1: number): string {
  return MONTHS[month1 - 1];
}

export function weekdayName(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** « 30 octobre 2026 ». */
export function longDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
}

/** « vendredi 30 octobre ». */
export function dayLabel(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${weekdayName(day)} ${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;
}
