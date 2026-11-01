import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounced } from './debounced';

describe('debounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });
  afterEach(() => vi.useRealTimers());

  it('ne propage la valeur qu’apres une pause de saisie', () => {
    const source = signal('');
    const out = runInInjectionContext(TestBed.inject(Injector), () => debounced(source, 250));
    for (const value of ['f', 'fo', 'foc']) {
      source.set(value);
      TestBed.tick();
      vi.advanceTimersByTime(100);
    }
    expect(out()).toBe('');
    vi.advanceTimersByTime(250);
    expect(out()).toBe('foc');
  });
});
