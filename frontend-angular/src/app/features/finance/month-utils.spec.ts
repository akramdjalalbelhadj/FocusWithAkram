import { describe, expect, it } from 'vitest';
import {
  actualDefaultDate,
  addMonths,
  dayInMonth,
  daysInMonth,
  expenseDefaultDate,
  isMonth,
  lastDayOfMonth,
  monthCount,
  monthLabel,
  parseDayOfMonth,
  recurrenceDates,
  recurrenceError,
  recurrenceText,
  shortDate,
} from './month-utils';

describe('month-utils', () => {
  it('reconnait un mois AAAA-MM', () => {
    expect(isMonth('2026-11')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-1')).toBe(false);
    expect(isMonth('')).toBe(false);
    expect(isMonth(null)).toBe(false);
  });

  it('decale un mois en passant les annees', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
  });

  it('borne le jour au dernier jour du mois', () => {
    expect(daysInMonth('2026-11')).toBe(30);
    expect(daysInMonth('2027-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(dayInMonth('2026-11', 31)).toBe('2026-11-30');
    expect(dayInMonth('2027-02', 30)).toBe('2027-02-28');
    expect(dayInMonth('2026-11', 5)).toBe('2026-11-05');
    expect(dayInMonth('2026-11', 0)).toBe('2026-11-01');
    expect(lastDayOfMonth('2026-12')).toBe('2026-12-31');
  });

  it('compte les mois inclus', () => {
    expect(monthCount('2026-11', '2027-02')).toBe(4);
    expect(monthCount('2026-11', '2026-11')).toBe(1);
    expect(monthCount('2027-02', '2026-11')).toBe(0);
  });

  it('lit un jour du mois entre 1 et 31', () => {
    expect(parseDayOfMonth('28')).toBe(28);
    expect(parseDayOfMonth(1)).toBe(1);
    expect(parseDayOfMonth('0')).toBeNull();
    expect(parseDayOfMonth('32')).toBeNull();
    expect(parseDayOfMonth('2,5')).toBeNull();
    expect(parseDayOfMonth('')).toBeNull();
  });

  it('formate les mois et les dates courtes en francais', () => {
    expect(monthLabel('2027-02')).toBe('février 2027');
    expect(shortDate('2026-11-28')).toBe('28 nov.');
    expect(shortDate('2027-01-01')).toBe('1er janv.');
  });

  it('propose une date de reel jamais dans le futur', () => {
    expect(actualDefaultDate('2026-11-28', '2026-11-05')).toBe('2026-11-05');
    expect(actualDefaultDate('2026-10-28', '2026-11-05')).toBe('2026-10-28');
  });

  it('date une depense saisie depuis un autre mois dans ce mois', () => {
    expect(expenseDefaultDate('2026-11', '2026-11-05')).toBe('2026-11-05');
    expect(expenseDefaultDate('2026-09', '2026-11-05')).toBe('2026-09-30');
    expect(expenseDefaultDate('2027-01', '2026-11-05')).toBe('2027-01-01');
  });

  describe('periode d’un revenu ou d’une depense fixe', () => {
    it('un seul mois : premiere et derniere echeance dans ce mois', () => {
      expect(recurrenceDates({ mode: 'once', from: '2026-11', to: null, day: 28 })).toEqual({
        startDate: '2026-11-28',
        endDate: '2026-11-30',
        count: 1,
      });
    });

    it('chaque mois de novembre a fevrier : fin au dernier jour de fevrier', () => {
      expect(recurrenceDates({ mode: 'monthly', from: '2026-11', to: '2027-02', day: 28 })).toEqual({
        startDate: '2026-11-28',
        endDate: '2027-02-28',
        count: 4,
      });
    });

    it('sans fin : pas de date de fin', () => {
      expect(recurrenceDates({ mode: 'monthly', from: '2026-11', to: null, day: 31 })).toEqual({
        startDate: '2026-11-30',
        endDate: null,
        count: null,
      });
    });

    it('signale les saisies invalides', () => {
      expect(recurrenceError({ mode: 'monthly', from: '2026-11', to: '2027-02', day: 28 })).toBeNull();
      expect(recurrenceError({ mode: 'monthly', from: '2026-11', to: null, day: 28 })).toBeNull();
      expect(recurrenceError({ mode: 'once', from: '', to: null, day: 28 })).toContain('mois');
      expect(recurrenceError({ mode: 'once', from: '2026-11', to: null, day: 40 })).toContain('1 et 31');
      expect(recurrenceError({ mode: 'monthly', from: '2026-11', to: '2026-10', day: 5 })).toContain('suivre');
      expect(recurrenceError({ mode: 'monthly', from: '2026-11', to: 'x', day: 5 })).toContain('dernier mois');
    });

    it('resume la periode en une phrase', () => {
      expect(recurrenceText({ mode: 'once', from: '2026-11', to: null, day: 28 })).toBe('le 28 novembre 2026');
      expect(recurrenceText({ mode: 'monthly', from: '2026-11', to: '2027-02', day: 28 })).toBe(
        'le 28 de chaque mois, de novembre 2026 à février 2027 (4 mois)',
      );
      expect(recurrenceText({ mode: 'monthly', from: '2026-11', to: null, day: 1 })).toBe(
        'le 1er de chaque mois, à partir de novembre 2026',
      );
      expect(recurrenceText({ mode: 'monthly', from: '2026-11', to: null, day: 31 })).toContain(
        'le dernier jour pour les mois plus courts',
      );
    });
  });
});
