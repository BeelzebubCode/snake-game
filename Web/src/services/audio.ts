import type { GameSound } from '../game/engine';
export class GardenAudio {
  enabled = true;
  private context: AudioContext | null = null;
  private active = new Set<OscillatorNode>();
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Gameplay stays available without audio. */
    }
  }
  play(name: GameSound) {
    if (!this.enabled || document.hidden) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const notes: Record<GameSound, number[]> = {
      collect: [659, 880],
      portal: [392, 587, 784],
      success: [523, 659, 784, 1046],
      wrong: [220, 196],
      chest: [440, 554, 659, 880, 1109],
      revive: [392, 523, 659, 784],
      death: [330, 262, 196],
    };
    notes[name].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + index * 0.085;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
      this.active.add(oscillator);
      oscillator.onended = () => {
        this.active.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  stop() {
    for (const oscillator of this.active) {
      try {
        oscillator.stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.active.clear();
    window.speechSynthesis?.cancel();
  }
  speak(word: string, onError?: () => void) {
    if (!this.enabled) return;
    if (!('speechSynthesis' in window)) {
      onError?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.volume = 0.7;
    const voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    utterance.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error)) onError?.();
    };
    window.speechSynthesis.speak(utterance);
  }
}
export const audio = new GardenAudio();
