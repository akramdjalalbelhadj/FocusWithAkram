import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TourComponent } from './tour';
import { TourEngine } from './tour-engine';
import { TourDiagram, TourStep, availableSteps } from './tour-model';

const FLOW: TourDiagram = {
  label: 'Le parcours',
  stages: [
    { icon: 'lightbulb', tone: 'amber', title: 'Idée', text: 'Capturer' },
    { icon: 'sparkles', tone: 'violet', title: 'Réflexion', text: 'Développer' },
    { icon: 'list-checks', tone: 'green', title: 'Tâches', text: 'Agir' },
  ],
};

@Injectable()
class TestTour extends TourEngine {
  protected readonly replayTarget = 'replay';
  readonly done = vi.fn(async () => undefined);
  protected markDone(): Promise<void> {
    return this.done();
  }
  run(steps: TourStep[]): boolean {
    return this.begin(steps);
  }
}

describe('availableSteps', () => {
  it('garde les étapes sans cible et celles dont la cible est affichée', () => {
    const steps: TourStep[] = [
      { title: 'Intro', text: '…', diagram: FLOW },
      { target: 'absent', title: 'A', text: '…' },
      { target: 'present', title: 'B', text: '…' },
    ];
    expect(availableSteps(steps, (t) => t === 'present').map((s) => s.title)).toEqual([
      'Intro',
      'B',
    ]);
  });
});

describe('TourComponent', () => {
  let fixture: ComponentFixture<TourComponent>;
  let tour: TestTour;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestTour] });
    tour = TestBed.inject(TestTour);
    fixture = TestBed.createComponent(TourComponent);
    fixture.componentRef.setInput('engine', tour);
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  it('n’affiche rien tant que la visite n’a pas commencé', () => {
    fixture.detectChanges();
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('affiche le schéma comme une liste numérotée et colorée, dans un dialogue nommé', () => {
    tour.run([
      { title: 'De l’idée à l’action', text: 'Trois étapes :', diagram: FLOW },
      { title: 'Agir', text: 'Créer des tâches', diagram: { ...FLOW, focus: 2 } },
    ]);
    fixture.detectChanges();
    const dialog = el().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(el().querySelector('#ff-tour-title')?.textContent).toBe('De l’idée à l’action');
    expect(dialog.classList).toContain('tour-wide');
    const list = el().querySelector('ol.tour-diagram')!;
    expect(list.getAttribute('aria-label')).toBe('Le parcours');
    const stages = Array.from(list.querySelectorAll('li'));
    expect(stages.map((s) => s.getAttribute('data-tone'))).toEqual(['amber', 'violet', 'green']);
    expect(stages[0].textContent).toContain('1Idée');
    expect(stages[0].textContent).toContain('Capturer');
    expect(stages.some((s) => s.hasAttribute('aria-current'))).toBe(false);

    tour.next();
    fixture.detectChanges();
    const focused = Array.from(el().querySelectorAll('ol.tour-diagram li'));
    expect(focused[2].getAttribute('aria-current')).toBe('step');
    expect(focused[0].classList).toContain('tour-stage-dim');
    expect(el().querySelector('.tour-actions .btn-primary')?.textContent?.trim()).toBe('Terminer');
  });

  it('affiche une matrice 2 × 2 : axes visuels seulement, badges Q1 à Q4, sans flèches', () => {
    const matrix: TourDiagram = {
      label: 'Les quatre cases',
      layout: 'matrix',
      axes: { columns: ['Urgent', 'Pas urgent'], rows: ['Important', 'Pas important'] },
      stages: (['q1', 'q2', 'q3', 'q4'] as const).map((tone, i) => ({
        icon: 'flame',
        tone,
        title: `Case ${i + 1}`,
        text: '…',
        badge: tone.toUpperCase(),
      })),
    };
    tour.run([{ title: 'Matrice', text: 'Deux questions :', diagram: matrix }]);
    fixture.detectChanges();
    const figure = el().querySelector('.tour-figure')!;
    expect(figure.classList).toContain('tour-figure-matrix');
    const axes = Array.from(figure.querySelectorAll('.tour-axis-columns, .tour-axis-rows'));
    expect(axes.map((a) => a.textContent?.trim())).toEqual([
      'UrgentPas urgent',
      'ImportantPas important',
    ]);
    expect(axes.every((a) => a.getAttribute('aria-hidden') === 'true')).toBe(true);
    const stages = Array.from(figure.querySelectorAll('ol li'));
    expect(stages.map((s) => s.querySelector('.tour-stage-num')?.textContent)).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4',
    ]);
    expect(stages.map((s) => s.getAttribute('data-tone'))).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('Échap passe la visite et l’enregistre', () => {
    tour.run([{ title: 'Seule étape', text: '…' }]);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tour.active()).toBe(false);
    expect(tour.done).toHaveBeenCalledTimes(1);
  });
});
