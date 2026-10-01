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
  private currentMapId = 'midnight';
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
      chest: [],
      chestSpin: [],
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
    // Modern Gacha Sounds (synthesized with Web Audio API)
    if (name === 'chestSpin') {
      const dest = ctx.destination;
      const t0 = ctx.currentTime;
      // Rising magical sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.6);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.12, t0 + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.6);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.6);

      // Star-like tinkles (fast arpeggio)
      const arp = [880, 1109, 1318, 1760, 2217, 2637];
      for (let i = 0; i < 16; i++) {
        const time = t0 + i * 0.04;
        this.tone(dest, arp[i % arp.length] * (1 + (Math.random() - 0.5) * 0.05), time, 0.06, 0.04, 'sine');
      }
      
      // Wind/whoosh noise
      this.noiseHit(dest, t0, 0.3, 2000, 0.1);
      this.noiseHit(dest, t0 + 0.3, 0.3, 4000, 0.15);

      return;
    }
    if (name === 'chest') {
      const dest = ctx.destination;
      const t0 = ctx.currentTime;
      
      // Triumphant SSR Gacha Reveal Chord
      const flourish = [523, 659, 784, 987, 1046, 1318];
      flourish.forEach((freq, i) => {
        this.tone(dest, freq, t0 + i * 0.06, 0.25, 0.12, 'square', 2000);
        this.tone(dest, freq * 2, t0 + i * 0.06, 0.25, 0.06, 'sine');
      });
      
      // Big shiny explosion noise
      this.noiseHit(dest, t0 + 0.35, 0.8, 5000, 0.3);
      
      // Final sustaining chord (Cmaj9)
      const finalChord = [523, 659, 784, 1046, 1568];
      finalChord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0 + 0.35);
        gain.gain.setValueAtTime(0, t0 + 0.35);
        gain.gain.linearRampToValueAtTime(0.04, t0 + 0.38);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.5);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(6000, t0 + 0.35);
        filter.frequency.exponentialRampToValueAtTime(400, t0 + 2.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(t0 + 0.35);
        osc.stop(t0 + 2.5);
      });
      return;
    }
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
  /** Switch music theme (pass null to stop). Crossfades cleanly between themes. */
  setMusicTheme(mapId: string | null) {
    const wasPlaying = this.musicTimer !== null;
    // Stop current music with fade-out
    if (this.musicTimer !== null) {
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
    if (mapId === null || !this.enabled) return;
    this.currentMapId = mapId;
    if (!wasPlaying) return; // Music was off, keep it off (caller starts with setMusic)
    // Restart with new theme after short gap
    window.setTimeout(() => this.startMusic(), 300);
  }
  /** Starts or stops the looping background music; scheduling is handled with a short look-ahead. */
  setMusic(on: boolean, mapId?: string) {
    if (mapId) this.currentMapId = mapId;
    if (on && this.enabled) {
      if (this.musicTimer !== null) return;
      this.startMusic();
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
  duckMusic(duck: boolean) {
    if (!this.enabled || !this.context || !this.musicGain) return;
    const target = duck ? 0.08 : 0.55;
    this.musicGain.gain.setTargetAtTime(target, this.context.currentTime, 0.2);
  }
  private startMusic() {
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
  }
  // Dispatches to the correct map-specific scheduler.
  private scheduleMusic() {
    const ctx = this.context, out = this.musicGain;
    if (!ctx || !out || ctx.state !== 'running') {
      if (ctx) this.nextBeat = Math.max(this.nextBeat, ctx.currentTime + 0.1);
      return;
    }
    const id = this.currentMapId;
    if (id === 'forest') { this.scheduleForest(ctx, out); return; }
    if (id === 'ocean')  { this.scheduleOcean(ctx, out);  return; }
    if (id === 'volcano'){ this.scheduleVolcano(ctx, out);return; }
    if (id === 'desert') { this.scheduleDesert(ctx, out); return; }
    if (id === 'space')  { this.scheduleSpace(ctx, out);  return; }
    if (id === 'city')   { this.scheduleCity(ctx, out);   return; }
    if (id === 'beach')  { this.scheduleBeach(ctx, out);  return; }
    this.scheduleMidnight(ctx, out);
  }
  // ── MIDNIGHT (Synthwave, 138 BPM, Am) ───────────────────────────────────────
  private scheduleMidnight(ctx: AudioContext, out: GainNode) {
    const sixteenth = 60 / 138 / 4,
      roots = [45, 41, 48, 43, 45, 41, 48, 43],
      chords = [[0, 3, 7],[0, 4, 7],[0, 4, 7],[0, 4, 7]],
      arp = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1],
      bassSteps = [0, 3, 6, 8, 10, 12, 14],
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16,
        bar = Math.floor(this.beat / 16) % 8, root = roots[bar],
        chord = chords[bar % 4], lift = bar >= 4 ? 12 : 0;
      if (step % 4 === 0) this.kick(out, when);
      if (step === 4 || step === 12) this.noiseHit(out, when, 0.14, 1800, 0.2);
      if (step % 2 === 0) this.noiseHit(out, when, 0.035, 8000, step % 4 === 2 ? 0.09 : 0.05);
      if (bassSteps.includes(step))
        this.tone(out, midi(root + (step === 6 || step === 14 ? 12 : 0)), when, sixteenth * 2.2, 0.11, 'sawtooth', 700);
      const tones = [chord[0], chord[1], chord[2], 12];
      this.tone(out, midi(root + 24 + lift + tones[arp[step]]), when, sixteenth * 1.4, step % 2 ? 0.03 : 0.045, 'square', 3200);
      if (step === 0 || step === 6 || step === 10)
        for (const note of chord)
          this.tone(out, midi(root + 12 + note), when, sixteenth * 2.5, 0.025, 'sawtooth', 1600);
      this.nextBeat += sixteenth; this.beat += 1;
    }
  }
  // ── FOREST (Ambient, 96 BPM, F major) ───────────────────────────────────────
  private scheduleForest(ctx: AudioContext, out: GainNode) {
    const eighth = 60 / 96 / 2,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      // F  Am  C  G repeating
      roots = [53, 57, 48, 43],
      pads = [[0,4,7],[0,3,7],[0,4,7],[0,4,7]];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 8,
        bar = Math.floor(this.beat / 8) % 4,
        root = roots[bar], chord = pads[bar];
      // Soft pad swell every bar
      if (step === 0)
        for (const n of chord)
          this.tone(out, midi(root + 12 + n), when, eighth * 7, 0.018, 'sine');
      // Gentle high arpeggio
      if (step % 2 === 0) {
        const note = chord[Math.floor(step / 2) % chord.length];
        this.tone(out, midi(root + 24 + note), when, eighth * 1.2, 0.012, 'sine');
      }
      // Soft pluck bass on beat 1
      if (step === 0)
        this.tone(out, midi(root), when, eighth * 1.8, 0.04, 'triangle', 400);
      this.nextBeat += eighth; this.beat += 1;
    }
  }
  // ── OCEAN (Chill, 110 BPM, Dm) ──────────────────────────────────────────────
  private scheduleOcean(ctx: AudioContext, out: GainNode) {
    const sixteenth = 60 / 110 / 4,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      roots = [38, 41, 43, 45], // Dm - F - G - Am
      arp = [0, 2, 1, 2, 0, 2, 1, 0];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16,
        bar = Math.floor(this.beat / 16) % 4, root = roots[bar];
      // Wave kick (every 4)
      if (step % 4 === 0) { this.noiseHit(out, when, 0.28, 80, 0.08); }
      // Deep bass note
      if (step === 0 || step === 8)
        this.tone(out, midi(root), when, sixteenth * 3.5, 0.07, 'sine', 300);
      // Flowing arp
      const idx = Math.floor(step / 2) % arp.length;
      if (step % 2 === 0)
        this.tone(out, midi(root + 24 + [0,3,5,7][arp[idx] % 4]), when, sixteenth * 2, 0.022, 'sine');
      // Soft pad swell
      if (step === 0)
        this.tone(out, midi(root + 12), when, sixteenth * 15, 0.015, 'sine');
      this.nextBeat += sixteenth; this.beat += 1;
    }
  }
  // ── VOLCANO (Epic, 150 BPM, Em) ─────────────────────────────────────────────
  private scheduleVolcano(ctx: AudioContext, out: GainNode) {
    const sixteenth = 60 / 150 / 4,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      roots = [40, 43, 47, 45];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16,
        bar = Math.floor(this.beat / 16) % 4, root = roots[bar];
      // Heavy kick every beat
      if (step % 4 === 0) this.kick(out, when);
      // Punchy snare on 2 and 4
      if (step === 4 || step === 12) this.noiseHit(out, when, 0.1, 2200, 0.28);
      // Hi-hat 16ths
      this.noiseHit(out, when, 0.025, 9000, step % 4 === 0 ? 0.07 : 0.035);
      // Grinding bass
      if ([0,2,6,8,10,14].includes(step))
        this.tone(out, midi(root + (step >= 8 ? 12 : 0)), when, sixteenth * 1.8, 0.09, 'sawtooth', 600);
      // Power chord stabs
      if (step === 0 || step === 8)
        for (const n of [0,7,12])
          this.tone(out, midi(root + 12 + n), when, sixteenth * 2, 0.03, 'square', 2000);
      this.nextBeat += sixteenth; this.beat += 1;
    }
  }
  // ── DESERT (Arabic Phrygian, 120 BPM) ───────────────────────────────────────
  private scheduleDesert(ctx: AudioContext, out: GainNode) {
    const sixteenth = 60 / 120 / 4,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      // Phrygian scale from E: 0,1,3,5,7,8,10
      scale = [0, 1, 3, 5, 7, 8, 10],
      root = 40, // E2
      melody = [0, 0, 1, 3, 5, 3, 1, 0, 8, 7, 5, 3, 1, 0, 1, 3];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16;
      // Hand drum (tabla-like)
      if (step === 0 || step === 6 || step === 10)
        this.noiseHit(out, when, 0.06, 500, 0.12);
      if (step === 4 || step === 8 || step === 12)
        this.noiseHit(out, when, 0.04, 1200, 0.07);
      // Oud-like pluck melody (high octave sawtooth with lowpass)
      const mn = scale[melody[step] % scale.length];
      this.tone(out, midi(root + 24 + mn), when, sixteenth * 0.7, 0.035, 'sawtooth', 900);
      // Drone bass (root + fifth)
      if (step % 8 === 0) {
        this.tone(out, midi(root), when, sixteenth * 7.5, 0.04, 'triangle', 500);
        this.tone(out, midi(root + 7), when, sixteenth * 7.5, 0.018, 'triangle', 500);
      }
      this.nextBeat += sixteenth; this.beat += 1;
    }
  }
  // ── SPACE (Sci-fi Pads, 100 BPM, Cm) ────────────────────────────────────────
  private scheduleSpace(ctx: AudioContext, out: GainNode) {
    const bar = 60 / 100 * 4,
      eighth = bar / 8,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      // Cm - Ab - Eb - Bb
      chords = [[36,39,43],[44,47,51],[39,43,46],[38,41,46]],
      arp = [0,1,2,1,0,2,1,0];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16,
        chord = chords[Math.floor(this.beat / 16) % 4];
      // Slow pad
      if (step === 0)
        for (const n of chord)
          this.tone(out, midi(n + 12), when, eighth * 15, 0.014, 'sine');
      // Sparkle arp
      if (step % 2 === 0) {
        const n = chord[arp[Math.floor(step/2) % 8] % chord.length];
        this.tone(out, midi(n + 24), when, eighth * 0.9, 0.016, 'sine');
      }
      // Sub bass pulse
      if (step === 0 || step === 10)
        this.tone(out, midi(chord[0]), when, eighth * 3, 0.05, 'sine', 200);
      // Occasional noise swoosh
      if (step === 0) this.noiseHit(out, when, 0.4, 4000, 0.025);
      this.nextBeat += eighth / 2; this.beat += 1;
    }
  }
  // ── CITY (Jazz-Funk, 130 BPM, Bbm) ──────────────────────────────────────────
  private scheduleCity(ctx: AudioContext, out: GainNode) {
    const sixteenth = 60 / 130 / 4,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      // Bbm7 - Ebm7 - Ab7 - Db
      roots = [46, 51, 44, 49],
      ext = [[0,3,7,10],[0,3,7,10],[0,4,7,10],[0,4,7,9]];
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 16,
        bar = Math.floor(this.beat / 16) % 4,
        root = roots[bar], chord = ext[bar];
      // Funky kick: 1, 3.5, 4
      if ([0,6,7].includes(step)) this.kick(out, when);
      // Clap on 2 & 4
      if (step === 4 || step === 12) this.noiseHit(out, when, 0.09, 2000, 0.16);
      // Off-beat hi-hat
      if (step % 2 !== 0) this.noiseHit(out, when, 0.025, 8000, 0.04);
      // Slap bass
      if ([0,3,8,11].includes(step))
        this.tone(out, midi(root + (step > 7 ? 12 : 0)), when, sixteenth * 0.8, 0.08, 'triangle', 800);
      // Electric piano chord stab
      if (step === 0 || step === 8)
        for (const n of chord)
          this.tone(out, midi(root + 12 + n), when, sixteenth * 1.8, 0.02, 'sine', 2400);
      this.nextBeat += sixteenth; this.beat += 1;
    }
  }
  // ── BEACH (Tropical Bossa, 118 BPM, G major) ────────────────────────────────
  private scheduleBeach(ctx: AudioContext, out: GainNode) {
    const eighth = 60 / 118 / 2,
      midi = (n: number) => 440 * 2 ** ((n - 69) / 12),
      // Gmaj7 - Em7 - Cmaj7 - D7
      roots = [43, 40, 48, 38],
      chords = [[0,4,7,11],[0,3,7,10],[0,4,7,11],[0,4,7,10]],
      bossa = [1,0,0,1,0,1,1,0]; // bossa nova clave-ish pattern
    while (this.nextBeat < ctx.currentTime + 0.6) {
      const when = this.nextBeat, step = this.beat % 8,
        bar = Math.floor(this.beat / 8) % 4,
        root = roots[bar], chord = chords[bar];
      // Soft bossa kick
      if (bossa[step]) this.noiseHit(out, when, 0.06, 120, 0.06);
      // Maracas-like hi-hat
      this.noiseHit(out, when, 0.04, 7000, step % 2 === 0 ? 0.05 : 0.03);
      // Classical guitar-like chord strum
      if (step === 0 || step === 3) {
        chord.forEach((n, i) =>
          this.tone(out, midi(root + 12 + n), when + i * 0.018, eighth * 1.4, 0.018, 'triangle', 3000)
        );
      }
      // Walking bass
      const bassNote = chord[step % chord.length];
      this.tone(out, midi(root + bassNote * 0.5), when, eighth * 0.9, 0.04, 'triangle', 400);
      this.nextBeat += eighth; this.beat += 1;
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
