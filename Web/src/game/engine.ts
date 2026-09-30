import {
  canBuild,
  matchesLevel,
  normalizeWord,
  REVIVAL_WORDS,
  scoreWord,
  Vocabulary,
  vocabulary,
} from '../data/vocabulary';
import {
  CHESTS,
  COLS,
  DEFAULT_SETTINGS,
  LETTER_COUNT,
  LETTER_LIFETIME,
  REVIVE_TIME,
  ROWS,
  SPEEDS,
} from './types';
import { MAP_SCORE_STEP } from './appearance';
import type { Cell, ChestKind, Direction, GameState, Phase, Settings } from './types';

const vectors: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export type GameSound = 'collect' | 'portal' | 'success' | 'wrong' | 'chest' | 'revive' | 'death';
export class GameEngine {
  state: GameState;
  private snapshot: GameState;
  private subscribers = new Set<() => void>();
  private sounds = new Set<(name: GameSound) => void>();
  private queued: Direction[] = [];
  private moveAccumulator = 0;
  private hudAccumulator = 0;
  private resumePhase: Phase = 'playing';
  private id = 0;
  private boosted = false;
  constructor(
    settings: Settings = DEFAULT_SETTINGS,
    tutorial = false,
    private random: () => number = Math.random,
    private dictionary: Vocabulary = vocabulary,
  ) {
    const snake = this.startSnake();
    this.state = {
      phase: tutorial ? 'lesson' : 'countdown',
      settings: { ...DEFAULT_SETTINGS, ...settings },
      snake,
      previousSnake: snake.map((p) => ({ ...p })),
      direction: 'right',
      nextDirection: 'right',
      mapStage: 0,
      letters: [],
      chest: null,
      portal: null,
      inventory: tutorial ? [] : ['C', 'A', 'T'],
      score: 0,
      hearts: 3,
      elapsed: 0,
      nextPortalAt: 15_000,
      nextChestAt: 7_000,
      countdown: 3000,
      challengeRemaining: settings.portalSeconds * 1000,
      reviveRemaining: REVIVE_TIME,
      reviveWord: null,
      reward: null,
      result: null,
      words: [],
      error: '',
      notice: '',
      tutorial,
      lesson: 0,
      deathReason: '',
      sessionId: Math.random().toString(36).slice(2) + Date.now().toString(36),
    };
    if (tutorial) {
      this.state.letters = ['C', 'A', 'T'].map((letter, i) => ({
        id: ++this.id,
        letter,
        x: 11 + i * 2,
        y: 11,
        expiresAt: LETTER_LIFETIME,
      }));
    } else this.fillLetters();
    this.snapshot = structuredClone(this.state);
  }
  private startSnake(): Cell[] {
    return [0, 1, 2, 3].map((i) => ({ x: 8 - i, y: 11 }));
  }
  getSnapshot = () => this.snapshot;
  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  };
  onSound(callback: (name: GameSound) => void) {
    this.sounds.add(callback);
    return () => {
      this.sounds.delete(callback);
    };
  }
  private sound(name: GameSound) {
    for (const callback of this.sounds) callback(name);
  }
  private publish() {
    this.snapshot = structuredClone(this.state);
    this.subscribers.forEach((callback) => callback());
  }
  get interpolation() {
    return this.state.phase === 'playing' ? Math.min(1, this.moveAccumulator / this.interval) : 1;
  }
  private get interval() {
    return 1000 / (SPEEDS[this.state.settings.speed] * (this.boosted ? 1.7 : 1));
  }
  setBoost(value: boolean) {
    const progress = this.moveAccumulator / this.interval;
    this.boosted = value && this.state.phase === 'playing';
    this.moveAccumulator = progress * this.interval;
  }
  turn(direction: Direction) {
    if (this.state.phase === 'countdown') {
      const from = vectors[this.state.direction],
        to = vectors[direction];
      if (from.x + to.x === 0 && from.y + to.y === 0) return;
      this.queued = direction === this.state.direction ? [] : [direction];
      this.state.nextDirection = direction;
      this.publish();
      return;
    }
    if (this.state.phase !== 'playing' || this.queued.length >= 2) return;
    const last = this.queued.at(-1) ?? this.state.direction;
    if (
      direction === last ||
      (vectors[last].x + vectors[direction].x === 0 && vectors[last].y + vectors[direction].y === 0)
    )
      return;
    this.queued.push(direction);
    this.state.nextDirection = this.queued[0];
    this.publish();
  }
  advance(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    // No catch-up burst after a stalled or hidden tab.
    const dt = Math.min(delta, 250),
      s = this.state;
    this.hudAccumulator += dt;
    if (s.phase === 'countdown') {
      s.countdown = Math.max(0, s.countdown - dt);
      if (!s.countdown) {
        s.phase = 'playing';
        this.moveAccumulator = 0;
        this.publish();
      }
    } else if (s.phase === 'playing') {
      s.elapsed += dt;
      s.letters = s.letters.filter((letter) => letter.expiresAt > s.elapsed);
      this.fillLetters();
      if (s.chest && s.chest.expiresAt <= s.elapsed) s.chest = null;
      if (s.portal && s.portal.expiresAt <= s.elapsed) s.portal = null;
      if (!s.tutorial) {
        if (!s.chest && s.elapsed >= s.nextChestAt) this.spawnChest();
        if (!s.portal && s.elapsed >= s.nextPortalAt) this.spawnPortal();
      }
      this.moveAccumulator += dt;
      while (this.moveAccumulator >= this.interval && s.phase === 'playing') {
        this.moveAccumulator -= this.interval;
        this.step();
      }
    } else if (s.phase === 'challenge') {
      s.challengeRemaining = Math.max(0, s.challengeRemaining - dt);
      if (!s.challengeRemaining) {
        if (s.tutorial) {
          s.challengeRemaining = s.settings.portalSeconds * 1000;
          s.error = 'ลองอีกครั้งได้เลย ตัวอักษรยังอยู่ครบ';
        } else {
          if (s.snake.length > 3) s.snake.pop();
          s.previousSnake = s.snake.map((p) => ({ ...p }));
          s.notice = 'หมดเวลาแล้ว หางลด 1 ข้อ ตัวอักษรยังอยู่ครบ';
          this.beginCountdown();
        }
        this.publish();
      }
    } else if (s.phase === 'revive') {
      s.reviveRemaining = Math.max(0, s.reviveRemaining - dt);
      if (!s.reviveRemaining) {
        s.deathReason = 'หมดเวลาฟื้นคืนชีพ';
        s.phase = 'gameOver';
        this.publish();
      }
    } else if (s.phase === 'chest' && s.reward && !s.reward.revealed) {
      s.reward.elapsed += dt;
      if (s.reward.elapsed >= (s.settings.reducedMotion ? 0 : 1600)) {
        s.reward.revealed = true;
        this.sound('chest');
        this.publish();
      }
    }
    if (this.hudAccumulator >= 100) {
      this.hudAccumulator = 0;
      this.publish();
    }
  }
  private freeCell(exclude: Cell[] = []): Cell | null {
    const s = this.state;
    const occupied = [...s.snake, ...s.letters, ...(s.chest ? [s.chest] : []), ...exclude];
    if (s.portal)
      for (let x = 0; x < 2; x++)
        for (let y = 0; y < 2; y++) occupied.push({ x: s.portal.x + x, y: s.portal.y + y });
    const taken = new Set(occupied.map((p) => p.y * COLS + p.x));
    const available: Cell[] = [];
    for (let y = 1; y < ROWS - 1; y++)
      for (let x = 1; x < COLS - 1; x++) if (!taken.has(y * COLS + x)) available.push({ x, y });
    return available.length
      ? available[Math.min(available.length - 1, Math.floor(this.random() * available.length))]
      : null;
  }
  private randomLetter(): string {
    const pool = 'AAAAAEEEEEEEIIIIOOOOUUUTTTTNNNNSSSSRRRRHHLLDDCCMMPPBBFFGGJKQVWXYZ';
    return pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))];
  }
  private fillLetters() {
    while (this.state.letters.length < LETTER_COUNT) {
      const cell = this.freeCell();
      if (!cell) return;
      this.state.letters.push({
        ...cell,
        id: ++this.id,
        letter: this.randomLetter(),
        expiresAt: this.state.elapsed + LETTER_LIFETIME,
      });
    }
  }
  private spawnChest() {
    const cell = this.freeCell();
    if (!cell) return;
    let roll = this.random() * 100,
      kind: ChestKind = 'red';
    for (const candidate of Object.keys(CHESTS) as ChestKind[]) {
      roll -= CHESTS[candidate].weight;
      if (roll < 0) {
        kind = candidate;
        break;
      }
    }
    this.state.chest = { ...cell, id: ++this.id, kind, expiresAt: this.state.elapsed + 30_000 };
    this.state.nextChestAt = this.state.elapsed + 20_000;
  }
  private spawnPortal() {
    const s = this.state,
      base = this.freeCell();
    if (!base) return;
    // Reserve the whole 2x2 gate; never cover the snake, letters, or a chest.
    for (let offset = 0; offset < COLS * ROWS; offset++) {
      const x = ((base.x + offset) % (COLS - 3)) + 1,
        y = ((base.y + Math.floor(offset / (COLS - 3))) % (ROWS - 3)) + 1;
      const cells = [
        { x, y },
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x + 1, y: y + 1 },
      ];
      if (
        !cells.some((cell) =>
          [...s.snake, ...s.letters, ...(s.chest ? [s.chest] : [])].some((p) => same(p, cell)),
        )
      ) {
        s.portal = { x, y, expiresAt: s.elapsed + 60_000 };
        s.nextPortalAt = s.elapsed + 30_000;
        this.sound('portal');
        return;
      }
    }
  }
  private step() {
    const s = this.state;
    s.direction = this.queued.shift() ?? s.direction;
    s.nextDirection = this.queued[0] ?? s.direction;
    const v = vectors[s.direction],
      head = { x: s.snake[0].x + v.x, y: s.snake[0].y + v.y };
    const pickup = s.letters.find((letter) => same(letter, head));
    const body = pickup ? s.snake : s.snake.slice(0, -1);
    if (
      head.x < 0 ||
      head.x >= COLS ||
      head.y < 0 ||
      head.y >= ROWS ||
      body.some((p) => same(p, head))
    ) {
      this.die(
        head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS
          ? 'เจ้างูชนขอบสวน'
          : 'เจ้างูชนตัวเอง',
      );
      return;
    }
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    s.snake.unshift(head);
    if (!pickup) s.snake.pop();
    else {
      s.inventory.push(pickup.letter);
      s.letters = s.letters.filter((item) => item.id !== pickup.id);
      this.fillLetters();
      this.sound('collect');
      if (s.tutorial && s.lesson === 0) {
        s.inventory = ['C', 'A', 'T'];
        s.lesson = 1;
        s.phase = 'lesson';
        this.queued = [];
        this.publish();
        return;
      }
    }
    if (s.chest && same(s.chest, head)) {
      const kind = s.chest.kind;
      s.reward = {
        kind,
        letters: Array.from({ length: CHESTS[kind].count }, () => this.randomLetter()),
        elapsed: 0,
        revealed: s.settings.reducedMotion,
      };
      s.chest = null;
      s.nextChestAt = s.elapsed + 20_000;
      s.phase = 'chest';
      this.queued = [];
      this.boosted = false;
      this.publish();
      return;
    }
    if (
      s.portal &&
      head.x >= s.portal.x &&
      head.x < s.portal.x + 2 &&
      head.y >= s.portal.y &&
      head.y < s.portal.y + 2
    ) {
      s.phase = 'challenge';
      s.challengeRemaining = s.settings.portalSeconds * 1000;
      s.portal = null;
      s.nextPortalAt = s.elapsed + 30_000;
      s.error = '';
      this.queued = [];
      this.boosted = false;
      this.sound('portal');
      this.publish();
    }
  }
  startLesson() {
    const s = this.state;
    if (s.phase !== 'lesson') return;
    if (s.lesson === 1) {
      s.snake = this.startSnake();
      s.previousSnake = s.snake.map((p) => ({ ...p }));
      s.direction = 'right';
      s.portal = { x: 13, y: 11, expiresAt: s.elapsed + 3600_000 };
      s.letters = s.letters.filter((p) => !(p.x >= 13 && p.x <= 14 && p.y >= 11 && p.y <= 12));
      this.fillLetters();
    }
    this.beginCountdown();
    this.publish();
  }
  submitWord(input: string): boolean {
    const s = this.state;
    if (s.phase !== 'challenge') return false;
    const word = normalizeWord(input);
    const entry = this.dictionary.find(word);
    let error = '';
    if (!/^[A-Z]+$/.test(word)) error = 'ใส่คำภาษาอังกฤษก่อนนะ';
    else if (!canBuild(word, s.inventory)) error = 'ตัวอักษรในกระเป๋าไม่พอสำหรับคำนี้';
    else if (!entry) error = 'ยังไม่พบคำนี้ในคลัง ลองคำอื่นได้เลย';
    else if (!s.tutorial && !matchesLevel(entry.level, s.settings.level))
      error = 'คำนี้ไม่อยู่ในชุดระดับที่เลือก';
    if (error) {
      s.error = error;
      this.sound('wrong');
      this.publish();
      return false;
    }
    const result = { entry: entry!, points: scoreWord(entry!) };
    for (const letter of word) s.inventory.splice(s.inventory.indexOf(letter), 1);
    s.score += result.points;
    s.mapStage = Math.max(s.mapStage, Math.floor(s.score / MAP_SCORE_STEP));
    s.words.push(result);
    s.result = result;
    s.phase = 'wordResult';
    s.error = '';
    this.sound('success');
    this.publish();
    return true;
  }
  hint(): string {
    const s = this.state;
    if (s.phase !== 'challenge') return '';
    const entry = this.dictionary.hint(s.inventory, s.tutorial ? 'all' : s.settings.level);
    if (!entry) {
      s.error = 'ยังเรียงคำในชุดนี้ไม่ได้ เก็บอักษรเพิ่มในรอบถัดไป';
      this.publish();
    }
    return entry?.word ?? '';
  }
  leaveChallenge() {
    if (this.state.phase !== 'challenge' || this.state.tutorial) return;
    this.state.notice = 'เก็บตัวอักษรเพิ่ม แล้วกลับเข้าประตูรอบถัดไปได้';
    this.beginCountdown();
    this.publish();
  }
  continueWord() {
    if (this.state.phase !== 'wordResult') return;
    if (this.state.tutorial) this.state.phase = 'tutorialDone';
    else this.beginCountdown();
    this.publish();
  }
  claimChest() {
    const s = this.state;
    if (s.phase !== 'chest' || !s.reward?.revealed) return false;
    s.inventory.push(...s.reward.letters);
    s.notice = CHESTS[s.reward.kind].title + ' เพิ่ม ' + s.reward.letters.length + ' ตัวอักษร';
    s.reward = null;
    this.beginCountdown();
    this.publish();
    return true;
  }
  private die(reason: string) {
    const s = this.state;
    this.queued = [];
    this.boosted = false;
    this.sound('death');
    if (s.tutorial) {
      s.snake = this.startSnake();
      s.previousSnake = s.snake.map((p) => ({ ...p }));
      s.direction = 'right';
      s.notice = 'ลองใหม่ได้เลย โหมดฝึกไม่เสียหัวใจ';
      s.letters = s.letters.filter((p) => !s.snake.some((q) => same(p, q)));
      this.fillLetters();
      this.beginCountdown();
      this.publish();
      return;
    }
    s.deathReason = reason;
    s.error = '';
    if (s.hearts > 0) {
      s.phase = 'revive';
      s.reviveRemaining = REVIVE_TIME;
      s.reviveWord =
        REVIVAL_WORDS[
          Math.min(REVIVAL_WORDS.length - 1, Math.floor(this.random() * REVIVAL_WORDS.length))
        ];
    } else s.phase = 'gameOver';
    this.publish();
  }
  submitRevival(input: string): boolean {
    const s = this.state;
    if (s.phase !== 'revive' || s.hearts <= 0 || s.reviveRemaining <= 0 || !s.reviveWord)
      return false;
    if (normalizeWord(input) !== s.reviveWord.word) {
      s.error = 'ยังไม่ถูก ลองสะกดอีกครั้งได้เลย';
      this.sound('wrong');
      this.publish();
      return false;
    }
    s.hearts -= 1;
    s.score = Math.max(0, s.score - 100);
    s.snake = this.startSnake();
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    s.direction = 'right';
    s.letters = s.letters.filter((p) => !s.snake.some((q) => same(p, q)));
    s.chest = null;
    s.portal = null;
    s.nextPortalAt = s.elapsed + 10_000;
    s.nextChestAt = s.elapsed + 12_000;
    this.fillLetters();
    s.reviveWord = null;
    s.error = '';
    s.notice = 'กลับมาแล้ว! หัก 100 คะแนน และใช้หัวใจ 1 ดวง';
    this.sound('revive');
    this.beginCountdown();
    this.publish();
    return true;
  }
  endRound() {
    if (['revive', 'paused'].includes(this.state.phase)) {
      this.state.phase = 'gameOver';
      this.publish();
    }
  }
  private beginCountdown() {
    this.state.phase = 'countdown';
    this.state.nextDirection = this.state.direction;
    this.state.countdown = 3000;
    this.moveAccumulator = 0;
    this.queued = [];
    this.boosted = false;
    this.state.previousSnake = this.state.snake.map((p) => ({ ...p }));
  }
  pause() {
    const s = this.state;
    if (['paused', 'gameOver', 'tutorialDone'].includes(s.phase)) return;
    this.resumePhase = s.phase;
    s.phase = 'paused';
    this.queued = [];
    this.boosted = false;
    this.publish();
  }
  resume() {
    if (this.state.phase !== 'paused') return;
    if (this.resumePhase === 'playing') this.beginCountdown();
    else this.state.phase = this.resumePhase;
    this.publish();
  }
  updateSettings(settings: Settings) {
    this.state.settings = { ...settings };
    this.publish();
  }
  dispose() {
    this.subscribers.clear();
    this.sounds.clear();
  }
}
