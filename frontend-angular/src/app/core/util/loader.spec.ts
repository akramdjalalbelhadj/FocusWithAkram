import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { RefreshService } from '../services/refresh.service';
import { Loader } from './loader';

describe('Loader', () => {
  let requests: Subject<string>[];
  let loader: Loader<string>;

  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({});
    loader = runInInjectionContext(TestBed.inject(Injector), () => new Loader(() => {
      const request = new Subject<string>();
      requests.push(request);
      return request;
    }));
    TestBed.tick();
  });

  it('charge au demarrage puis expose la donnee', () => {
    expect(requests).toHaveLength(1);
    expect(loader.loading()).toBe(true);
    requests[0].next('premier');
    expect(loader.data()).toBe('premier');
    expect(loader.loading()).toBe(false);
  });

  it('annule la requete precedente quand un rechargement est demande', () => {
    TestBed.inject(RefreshService).bump();
    TestBed.tick();
    expect(requests).toHaveLength(2);
    expect(requests[0].observed).toBe(false);
    requests[0].next('obsolete');
    requests[1].next('recent');
    expect(loader.data()).toBe('recent');
  });

  it('signale une erreur sans perdre la derniere donnee', () => {
    requests[0].next('ok');
    loader.load();
    requests[1].error(new Error('reseau'));
    expect(loader.error()).toBe(true);
    expect(loader.data()).toBe('ok');
  });
});
