import type { GameSound } from '../game/engine';
export class GardenAudio {
  enabled = true;
  private context: AudioContext | null = null;
  private active = new Set<OscillatorNode>();
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private nextBeat = 0;
  private beat = 0;
  private noise: AudioBuffer | null = null;
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
    if (name === 'page') {
      // A soft paper swish: a short band of filtered noise.
      this.noiseHit(ctx.destination, ctx.currentTime, 0.22, 1800, 0.07);
      this.noiseHit(ctx.destination, ctx.currentTime + 0.05, 0.16, 3400, 0.04);
      return;
    }
    const notes: Record<GameSound, number[]> = {
      collect: [659, 880],
      portal: [392, 587, 784],
      success: [523, 659, 784, 1046],
      wrong: [220, 196],
      chest: [440, 554, 659, 880, 1109],
      revive: [392, 523, 659, 784],
      death: [330, 262, 196],
      timeout: [440, 349, 262, 196],
      click: [720],
      warp: [147, 196, 247, 311, 392, 494, 622, 784, 988],
      smash: [180, 120, 82],
      page: [],
    };
    const wave: Partial<Record<GameSound, OscillatorType>> = {
      wrong: 'triangle',
      death: 'triangle',
      timeout: 'triangle',
      click: 'triangle',
      warp: 'sawtooth',
      smash: 'square',
      collect: 'triangle',
    };
    notes[name].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + index * 0.085;
      oscillator.type = wave[name] ?? 'sine';
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
  /** Starts or stops the looping background music; scheduling is handled with a short look-ahead. */
  setMusic(on: boolean) {
    if (on && this.enabled) {
      if (this.musicTimer !== null) return;
      this.unlock();
      const ctx = this.context;
      if (!ctx) return;
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.55;
      this.musicGain.connect(ctx.destination);
      this.nextBeat = ctx.currentTime + 0.1;
      this.beat = 0;
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
      this.scheduleMusic();
    } else if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
      const gain = this.musicGain;
      this.musicGain = null;
      if (gain && this.context) {
        gain.gain.cancelScheduledValues(this.context.currentTime);
        gain.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
        window.setTimeout(() => gain.disconnect(), 600);
      }
    }
  }
  // An upbeat 138 BPM groove in A minor (Am-F-C-G): four-on-the-floor kick, clap, hats, a rolling
  // bass and a 16th-note arpeggio. Every sound is synthesised, so there are no audio files to ship.
  private scheduleMusic() {
    const ctx = this.context,
      out = this.musicGain;
    if (!ctx || !out || ctx.state !== 'running') {
      if (ctx) this.nextBeat = Math.max(this.nextBeat, ctx.currentTime + 0.1);
      return;
    }
    const sixteenth = 60 / 138 / 4,
      roots = [45, 41, 48, 43, 45, 41, 48, 43],
      chords = [
        [0, 3, 7],
        [0, 4, 7],
        [0, 4, 7],
        [0, 4, 7],
      ],
      arp = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1],
      bassSteps = [0, 3, 6, 8, 10, 12, 14],
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat,
        step = this.beat % 16,
        bar = Math.floor(this.beat / 16) % 8,
        root = roots[bar],
        chord = chords[bar % 4],
        lift = bar >= 4 ? 12 : 0;
      if (step % 4 === 0) this.kick(out, when);
      if (step === 4 || step === 12) this.noiseHit(out, when, 0.14, 1800, 0.2);
      if (step % 2 === 0) this.noiseHit(out, when, 0.035, 8000, step % 4 === 2 ? 0.09 : 0.05);
      if (bassSteps.includes(step))
        this.tone(
          out,
          midi(root + (step === 6 || step === 14 ? 12 : 0)),
          when,
          sixteenth * 2.2,
          0.11,
          'sawtooth',
          700,
        );
      const tones = [chord[0], chord[1], chord[2], 12];
      this.tone(
        out,
        midi(root + 24 + lift + tones[arp[step]]),
        when,
        sixteenth * 1.4,
        step % 2 ? 0.03 : 0.045,
        'square',
        3200,
      );
      if (step === 0 || step === 6 || step === 10)
        for (const note of chord)
          this.tone(out, midi(root + 12 + note), when, sixteenth * 2.5, 0.025, 'sawtooth', 1600);
      this.nextBeat += sixteenth;
      this.beat += 1;
    }
  }
  private kick(out: AudioNode, start: number) {
    const ctx = this.context;
    if (!ctx) return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(160, start);
    oscillator.frequency.exponentialRampToValueAtTime(42, start + 0.12);
    gain.gain.setValueAtTime(0.5, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(start);
    oscillator.stop(start + 0.25);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  private noiseHit(
    out: AudioNode,
    start: number,
    length: number,
    highpass: number,
    volume: number,
  ) {
    const ctx = this.context;
    if (!ctx) return;
    this.noise ??= (() => {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    })();
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(start);
    source.stop(start + length + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  private tone(
    out: AudioNode,
    frequency: number,
    start: number,
    length: number,
    volume: number,
    type: OscillatorType,
    cutoff = 0,
  ) {
    const ctx = this.context;
    if (!ctx) return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain(),
      filter = cutoff ? ctx.createBiquadFilter() : null;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    if (filter) {
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      oscillator.connect(filter);
      filter.connect(gain);
    } else oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter?.disconnect();
      gain.disconnect();
    };
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
