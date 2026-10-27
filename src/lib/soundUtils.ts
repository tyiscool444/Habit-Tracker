// Web Audio API synthesizer for timer chimes - zero external dependencies

const STORAGE_KEY = 'habitthat_timer_sound_v1';

interface Chime {
  freqs: number[];
  type: OscillatorType;
  gap: number;      // seconds between notes
  peak: number;     // peak gain
  attack: number;   // seconds to reach peak (0 = start at peak)
  decay: number;    // seconds to fade out
}

// 3-tone peaceful ascending chime (C5 -> E5 -> G5)
const FOCUS_COMPLETE: Chime = { freqs: [523.25, 659.25, 783.99], type: 'sine', gap: 0.16, peak: 0.25, attack: 0.04, decay: 0.9 };
// 2-tone uplifting chime (G5 -> C6)
const BREAK_COMPLETE: Chime = { freqs: [783.99, 1046.5], type: 'triangle', gap: 0.18, peak: 0.22, attack: 0.03, decay: 0.8 };
const CLICK: Chime = { freqs: [800], type: 'sine', gap: 0, peak: 0.08, attack: 0, decay: 0.05 };

class SoundPlayer {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) this.soundEnabled = saved === 'true';
      } catch {
        // Storage unavailable
      }
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Storage unavailable
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) this.ctx = new AudioContextClass();
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private play({ freqs, type, gap, peak, attack, decay }: Chime) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const t = now + idx * gap;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        if (attack > 0) {
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(peak, t + attack);
        } else {
          gain.gain.setValueAtTime(peak, t);
        }
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    } catch {
      // Audio playback failed silently
    }
  }

  public playFocusComplete() {
    this.play(FOCUS_COMPLETE);
  }

  public playBreakComplete() {
    this.play(BREAK_COMPLETE);
  }

  public playClick() {
    this.play(CLICK);
  }
}

export const timerSound = new SoundPlayer();
