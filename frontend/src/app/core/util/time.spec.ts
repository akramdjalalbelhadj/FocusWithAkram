import { describe, expect, it } from 'vitest';
import {
  addDays, formatClock, formatDateTime, formatDay, formatDuration, isValidLocalDateTime, localToInstant, startOfWeek,
} from './time';

const PARIS = 'Europe/Paris';

describe('time utils', () => {
  it('affiche les instants UTC au format yyyy-MM-dd HH:mm dans le fuseau demandé', () => {
    expect(formatDateTime('2026-10-30T08:30:00Z', PARIS)).toBe('2026-10-30 09:30'); // CET (UTC+1)
    expect(formatDateTime('2026-07-01T08:30:00Z', PARIS)).toBe('2026-07-01 10:30'); // CEST (UTC+2)
    expect(formatDateTime('2026-10-30T08:30:00Z', 'UTC')).toBe('2026-10-30 08:30');
    expect(formatDateTime(null, PARIS)).toBe('');
  });

  it('regroupe par jour local et non par jour UTC', () => {
    expect(formatDay('2026-10-29T23:30:00Z', PARIS)).toBe('2026-10-30');
  });

  it('convertit une saisie locale en instant UTC, avec changements d’heure', () => {
    expect(localToInstant('2026-10-30 09:30', PARIS)).toBe('2026-10-30T08:30:00.000Z');
    expect(localToInstant('2026-07-01 10:30', PARIS)).toBe('2026-07-01T08:30:00.000Z');
    // Retour à l'heure d'hiver (25 oct. 2026) : 02:30 est ambigu, la 2nde occurrence (CET) est retenue.
    expect(localToInstant('2026-10-25 02:30', PARIS)).toBe('2026-10-25T01:30:00.000Z');
    // Aller-retour stable le jour du changement d'heure.
    const iso = localToInstant('2026-10-25 12:00', PARIS)!;
    expect(formatDateTime(iso, PARIS)).toBe('2026-10-25 12:00');
  });

  it('décale une heure inexistante (saut de printemps) vers l’avant', () => {
    // 29 mars 2026 : 02:30 n'existe pas à Paris.
    const iso = localToInstant('2026-03-29 02:30', PARIS)!;
    expect(formatDateTime(iso, PARIS)).toBe('2026-03-29 03:30');
  });

  it('valide le format de saisie', () => {
    expect(isValidLocalDateTime('2026-10-30 09:30')).toBe(true);
    expect(isValidLocalDateTime('2026-02-30 09:30')).toBe(false);
    expect(isValidLocalDateTime('2026-10-30 24:00')).toBe(false);
    expect(isValidLocalDateTime('30/10/2026 09:30')).toBe(false);
    expect(localToInstant('n’importe quoi', PARIS)).toBeNull();
  });

  it('formate les durées et le minuteur', () => {
    expect(formatDuration(25 * 60)).toBe('25 min');
    expect(formatDuration(3 * 3600 + 45 * 60)).toBe('3 h 45');
    expect(formatDuration(-70 * 60, { signed: true })).toBe('−1 h 10');
    expect(formatDuration(25 * 60, { signed: true })).toBe('+25 min');
    expect(formatDuration(null)).toBe('—');
    expect(formatClock(25 * 60)).toBe('25:00');
    expect(formatClock(0.2)).toBe('00:01'); // arrondi au-dessus : jamais 00:00 avant la fin réelle
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('calcule le début de semaine selon la préférence', () => {
    expect(startOfWeek('2026-10-30', 'MONDAY')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-30', 'SUNDAY')).toBe('2026-10-25');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});
