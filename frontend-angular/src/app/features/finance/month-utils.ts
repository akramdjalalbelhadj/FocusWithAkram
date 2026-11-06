import { longDate, monthName } from '../../core/util/time';

/** Calculs de calendrier de la feuille du mois (mois AAAA-MM, dates AAAA-MM-JJ), sans fuseau horaire. */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const SHORT_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Vrai pour un mois AAAA-MM valide. */
export function isMonth(text: string | null | undefined): boolean {
  return MONTH.test((text ?? '').trim());
}

/** Mois AAAA-MM decale de `delta` mois. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** Nombre de jours du mois (28 a 31). */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Date du jour `day` dans le mois, bornee au dernier jour du mois (31 en novembre : le 30). */
export function dayInMonth(month: string, day: number): string {
  const d = Math.min(Math.max(1, Math.trunc(day)), daysInMonth(month));
  return `${month}-${pad(d)}`;
}

export function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

export function lastDayOfMonth(month: string): string {
  return dayInMonth(month, 31);
}

/** Nombre de mois de `from` a `to` inclus (0 si `to` precede `from`). */
export function monthCount(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) + 1);
}

/** « novembre 2026 ». */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${monthName(m)} ${y}`;
}

/** « 28 nov. », « 1er janv. ». */
export function shortDate(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${SHORT_MONTHS[m - 1]}`;
}

/** Jour du mois saisi : entier de 1 a 31, sinon null. */
export function parseDayOfMonth(text: string | number | null | undefined): number | null {
  const value = typeof text === 'number' ? text : Number(String(text ?? '').trim());
  return Number.isInteger(value) && value >= 1 && value <= 31 ? value : null;
}

/**
 * Date par defaut d'un reel saisi pour une ligne du mois : la date prevue, sans depasser aujourd'hui
 * (une operation realisee ne peut pas etre datee dans le futur).
 */
export function actualDefaultDate(planned: string, today: string): string {
  return planned > today ? today : planned;
}

/** Date par defaut d'une depense saisie depuis la feuille d'un mois : aujourd'hui, ou le dernier jour d'un mois passe. */
export function expenseDefaultDate(month: string, today: string): string {
  const current = today.slice(0, 7);
  if (month === current) return today;
  return month < current ? lastDayOfMonth(month) : firstDayOfMonth(month);
}

export type RecurrenceMode = 'once' | 'monthly';

export interface Recurrence {
  /** Un seul mois ou chaque mois. */
  mode: RecurrenceMode;
  /** Premier mois (AAAA-MM). */
  from: string;
  /** Dernier mois (AAAA-MM) pour « chaque mois » ; null : sans fin. */
  to: string | null;
  /** Jour du mois (1 a 31), borne au dernier jour des mois plus courts. */
  day: number;
}

export interface RecurrenceDates {
  /** Premiere echeance. */
  startDate: string;
  /** Derniere echeance au plus tard (dernier jour du dernier mois), null : sans fin. */
  endDate: string | null;
  /** Nombre d'echeances, null : sans fin. */
  count: number | null;
}

/** Dates de l'echeancier mensuel correspondant a une saisie « un seul mois » ou « chaque mois de … a … ». */
export function recurrenceDates(r: Recurrence): RecurrenceDates {
  const startDate = dayInMonth(r.from, r.day);
  if (r.mode === 'once') return { startDate, endDate: lastDayOfMonth(r.from), count: 1 };
  if (!r.to) return { startDate, endDate: null, count: null };
  return { startDate, endDate: lastDayOfMonth(r.to), count: monthCount(r.from, r.to) };
}

/** Message d'erreur d'une saisie de periode, ou null si elle est valide. */
export function recurrenceError(r: Recurrence): string | null {
  if (!isMonth(r.from)) return 'Indiquez le mois (format AAAA-MM).';
  if (parseDayOfMonth(r.day) === null) return 'Le jour du mois doit être compris entre 1 et 31.';
  if (r.mode === 'monthly' && r.to !== null) {
    if (!isMonth(r.to)) return 'Indiquez le dernier mois (format AAAA-MM), ou choisissez « Sans fin ».';
    if (r.to < r.from) return 'Le dernier mois doit suivre le premier.';
  }
  return null;
}

/**
 * Phrase qui resume la periode : « le 28 novembre 2026 », « le 28 de chaque mois, de novembre 2026 à février
 * 2027 (4 mois) », « le 5 de chaque mois, à partir de novembre 2026 ».
 */
export function recurrenceText(r: Recurrence): string {
  const dates = recurrenceDates(r);
  if (r.mode === 'once') return `le ${longDate(dates.startDate)}`;
  const day = `le ${r.day === 1 ? '1er' : r.day} de chaque mois`;
  const shorter = r.day > 28 ? ' (le dernier jour pour les mois plus courts)' : '';
  if (!r.to) return `${day}${shorter}, à partir de ${monthLabel(r.from)}`;
  if (r.to === r.from) return `le ${longDate(dates.startDate)}`;
  return `${day}${shorter}, de ${monthLabel(r.from)} à ${monthLabel(r.to)} (${dates.count} mois)`;
}
