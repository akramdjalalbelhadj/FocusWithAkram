import { Injectable } from '@angular/core';

type SoundName = 'bell' | 'chime' | 'soft';

/** Sons de fin de session generes avec WebAudio : aucun fichier audio a embarquer. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;

  play(name: SoundName = 'bell'): void {
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const notes: Record<
        SoundName,
        { f: number; at: number; len: number; type: OscillatorType }[]
      > = {
        bell: [
          { f: 880, at: 0, len: 1.2, type: 'sine' },
          { f: 1320, at: 0, len: 0.9, type: 'sine' },
        ],
        chime: [
          { f: 659, at: 0, len: 0.5, type: 'triangle' },
          { f: 880, at: 0.18, len: 0.5, type: 'triangle' },
          { f: 1175, at: 0.36, len: 0.9, type: 'triangle' },
        ],
        soft: [
          { f: 523, at: 0, len: 1.4, type: 'sine' },
          { f: 659, at: 0.25, len: 1.4, type: 'sine' },
        ],
      };
      for (const n of notes[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + n.at;
        osc.type = n.type;
        osc.frequency.value = n.f;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + n.len);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + n.len + 0.05);
      }
    } catch {
      /* audio indisponible ou bloque : sans consequence */
    }
  }
}
