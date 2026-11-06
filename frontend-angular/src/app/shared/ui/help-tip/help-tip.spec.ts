import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HelpTipComponent } from './help-tip';

describe('HelpTipComponent', () => {
  let fixture: ComponentFixture<HelpTipComponent>;
  let button: HTMLButtonElement;
  let bubble: HTMLElement;

  function create(): ComponentFixture<HelpTipComponent> {
    const f = TestBed.createComponent(HelpTipComponent);
    f.componentRef.setInput('label', 'Prévu');
    f.componentRef.setInput('text', 'Montant attendu pour ce mois.');
    f.detectChanges();
    return f;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = create();
    document.body.appendChild(fixture.nativeElement);
    button = fixture.nativeElement.querySelector('button');
    bubble = fixture.nativeElement.querySelector('[role="tooltip"]');
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  const isOpen = () => button.getAttribute('aria-expanded') === 'true' && bubble.classList.contains('help-tip-open');

  it('nomme le bouton et le decrit par le texte de la bulle, meme fermee', () => {
    expect(button.getAttribute('aria-label')).toBe('Aide : Prévu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-describedby')).toBe(bubble.id);
    expect(bubble.textContent?.trim()).toBe('Montant attendu pour ce mois.');
    expect(isOpen()).toBe(false);
  });

  it('s’ouvre au clic et se ferme par Echap', () => {
    button.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('un second clic referme la bulle', () => {
    button.click();
    button.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('s’ouvre au focus clavier et se ferme quand le focus part', () => {
    button.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    button.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('reste ouverte quand la page defile jusqu’au bouton (focus clavier)', () => {
    button.dispatchEvent(new FocusEvent('focus'));
    document.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(isOpen()).toBe(true);
  });

  it('se ferme par un clic ailleurs, mais pas par un clic dans la bulle', () => {
    button.click();
    fixture.detectChanges();
    bubble.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('Echap n’importe ou ferme une bulle ouverte au survol', () => {
    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('donne un identifiant distinct a chaque bulle', () => {
    const other = create();
    const otherBubble: HTMLElement = other.nativeElement.querySelector('[role="tooltip"]');
    expect(otherBubble.id).not.toBe(bubble.id);
    other.destroy();
  });

  it('reste dans un ecran de 390 px quand le bouton est au bord droit', () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    button.getBoundingClientRect = () =>
      ({ left: 360, right: 384, top: 100, bottom: 124, width: 24, height: 24, x: 360, y: 100 }) as DOMRect;
    try {
      button.click();
      fixture.detectChanges();
      const left = parseFloat(bubble.style.left);
      const bubbleWidth = parseFloat(bubble.style.width);
      expect(left).toBeGreaterThanOrEqual(8);
      expect(left + bubbleWidth).toBeLessThanOrEqual(390 - 8);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });
});
