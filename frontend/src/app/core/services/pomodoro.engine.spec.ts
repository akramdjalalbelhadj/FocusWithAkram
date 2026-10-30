import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroSession } from '../api/models';
import { PomodoroEngine } from './pomodoro.engine';

function session(over: Partial<PomodoroSession> = {}): PomodoroSession {
  return {
    id: 's1', type: 'WORK', status: 'RUNNING', taskId: null, taskTitle: null, plannedSeconds: 1500, elapsedSeconds: 0,
    remainingSeconds: 1500, workedSeconds: 0, sequenceNumber: 1, startedAt: '2026-10-30T10:00:00Z',
    lastResumedAt: '2026-10-30T10:00:00Z', expectedEndAt: '2026-10-30T10:25:00Z', endedAt: null,
    next: { type: 'SHORT_BREAK', plannedSeconds: 300, sequenceNumber: 1 }, ...over,
  };
}

describe('PomodoroEngine', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T10:10:00Z'));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('calcule le temps restant depuis l’heure de fin serveur, sans compteur', async () => {
    const engine = TestBed.inject(PomodoroEngine);
    http.expectOne('/api/v1/pomodoro/sessions/active').flush({ session: session(), serverTime: '2026-10-30T10:10:00Z' });
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.isRunning()).toBe(true);
    expect(engine.remainingSeconds()).toBe(15 * 60);

    // Onglet en arrière-plan / veille : le temps réel a avancé de 7 min sans aucun tick.
    vi.setSystemTime(new Date('2026-10-30T10:17:00Z'));
    await vi.advanceTimersByTimeAsync(300);
    expect(engine.remainingSeconds()).toBeCloseTo(8 * 60, 0); // l'horloge simulee a avance de 300 ms
    expect(engine.clock()).toBe('08:00');
  });

  it('corrige l’écart entre l’horloge du client et celle du serveur', async () => {
    const engine = TestBed.inject(PomodoroEngine);
    // Le client retarde de 2 minutes : sans correction, il afficherait 17 min au lieu de 15.
    http.expectOne('/api/v1/pomodoro/sessions/active').flush({ session: session(), serverTime: '2026-10-30T10:12:00Z' });
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.remainingSeconds()).toBe(13 * 60);
  });

  it('affiche le temps figé d’une session en pause', async () => {
    const engine = TestBed.inject(PomodoroEngine);
    http.expectOne('/api/v1/pomodoro/sessions/active').flush({
      session: session({ status: 'PAUSED', lastResumedAt: null, expectedEndAt: null, elapsedSeconds: 600, remainingSeconds: 900 }),
      serverTime: '2026-10-30T10:10:00Z',
    });
    await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.isPaused()).toBe(true);
    expect(engine.remainingSeconds()).toBe(900);
  });

  it('restaure la session depuis le cache local avant la réponse du serveur', async () => {
    localStorage.setItem('ff.pomodoro.v1', JSON.stringify({ session: session(), offsetMs: 0, lastTaskId: 't1' }));
    const engine = TestBed.inject(PomodoroEngine);
    // Aucune réponse réseau encore : l'état est déjà là (rechargement de page / hors ligne).
    expect(engine.isRunning()).toBe(true);
    expect(engine.remainingSeconds()).toBe(15 * 60);
    expect(engine.lastTaskId()).toBe('t1');
    http.expectOne('/api/v1/pomodoro/sessions/active').flush({ session: null, serverTime: '2026-10-30T10:10:00Z' });
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.isActive()).toBe(false); // le serveur reste la référence
  });

  it('termine la session une seule fois à l’échéance', async () => {
    const engine = TestBed.inject(PomodoroEngine);
    http.expectOne('/api/v1/pomodoro/sessions/active').flush({ session: session(), serverTime: '2026-10-30T10:10:00Z' });
    await vi.advanceTimersByTimeAsync(0);

    vi.setSystemTime(new Date('2026-10-30T10:25:01Z'));
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250); // plusieurs ticks : un seul appel de clôture
    const calls = http.match('/api/v1/pomodoro/sessions/s1/complete');
    expect(calls.length).toBe(1);
    calls[0].flush({
      session: session({ status: 'COMPLETED', workedSeconds: 1500, endedAt: '2026-10-30T10:25:00Z', expectedEndAt: null }),
      serverTime: '2026-10-30T10:25:01Z',
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.isActive()).toBe(false);
    expect(engine.finished()?.status).toBe('COMPLETED');
  });
});
