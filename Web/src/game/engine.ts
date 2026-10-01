import { translate } from '../i18n/messages';
import type { MessageKey, Params } from '../i18n/messages';
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
  FORCED_GATE_MIN,
  FORCED_GATE_SPREAD,
  LETTER_COUNT,
  LETTER_LIFETIME,
  MAX_LETTERS,
  OBSTACLE_COUNT,
  OBSTACLE_LIFETIME,
  OBSTACLE_SCORE_PENALTY,
  REVIVE_LETTER_LOSS,
  REVIVE_PENALTY,
  REVIVE_TIME,
  ROWS,
  SPEEDS,
  TIMEOUT_PENALTY,
  WARP_TIME,
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
export type GameSound =
  | 'collect'
  | 'portal'
  | 'success'
  | 'wrong'
  | 'chest'
  | 'chestSpin'
  | 'revive'
  | 'death'
  | 'timeout'
  | 'click'
  | 'warp'
  | 'smash'
  | 'page';
export class GameEngine {
  state: GameState;
  private snapshot: GameState;
  private subscribers = new Set<() => void>();
  private sounds = new Set<(name: GameSound) => void>();
  private queued: Direction[] = [];
  private moveAccumulator = 0;
  private hudAccumulator = 0;
  private resumePhase: Phase = 'playing';
  private lessonReturn: Phase | null = null;
  private id = 0;
  private boosted = false;
  private tutorialBoostMoves = 0;
  private tutorialDirectionMoves = 0;
  private gateArmed = true;
  private gateThreshold = 0;
  // Tracks recent letters placed on the map to drive anti-repeat logic.
  private letterHistory: string[] = [];

  private static readonly VOWELS = 'AEIOU';
  private static readonly POOL_EASY = 'AAAAEEEEEIIIOOOUU' + 'TTTNNNSSSRRR';
  private static readonly POOL_MID = 'AAAAEEEEEIIIOOOUU' + 'TTTNNNSSSRRR' + 'HHLLDDCCMM';
  private static readonly POOL_FULL =
    'AAAAEEEEEEIIIIOOOOUUU' + 'TTTTNNNNSSSSRRRR' + 'HHLLDDCCMMPPBBFFGGYY' + 'JKVW' + 'QXZ';

  private pickFrom(pool: string): string {
    return pool[Math.floor(this.random() * pool.length)];
  }
  constructor(
    settings: Settings = DEFAULT_SETTINGS,
    tutorial = false,
    private random: () => number = Math.random,
    private dictionary: Vocabulary = vocabulary,
  ) {
    const snake = this.startSnake();
    this.state = {
      phase: tutorial ? 'lesson' : 'countdown',
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
        ...(tutorial ? { speed: 'slow', portalSeconds: 60 } : {}),
      },
      snake,
      previousSnake: snake.map((p) => ({ ...p })),
      direction: 'right',
      nextDirection: 'right',
      mapStage: 0,
      letters: [],
      chest: null,
      portals: [],
      obstacles: [],
      inventory: [],
      score: 0,
      hearts: 3,
      elapsed: 0,
      nextPortalAt: 15_000,
      nextChestAt: 7_000,
      countdown: 3000,
      challengeRemaining: settings.portalSeconds * 1000,
      warpRemaining: 0,
      forced: false,
      toast: '',
      toastUntil: 0,
      reviveRemaining: REVIVE_TIME,
      reviveWord: null,
      spawnPortal: { x: 8, y: 11, type: 'start' },
      reward: null,
      result: null,
      words: [],
      error: '',
      notice: '',
      tutorial,
      lesson: 0,
      practicedDirections: [],
      deathReason: '',
      sessionId: Math.random().toString(36).slice(2) + Date.now().toString(36),
    };
    if (!tutorial) {
      this.fillLetters();
      this.fillObstacles();
    }
    this.snapshot = structuredClone(this.state);
  }
  private t(key: MessageKey, params?: Params) {
    return translate(this.state.settings.language, key, params);
  }
  private startSnake(): Cell[] {
    return this.makeSnake(4);
  }
  // Lays a snake of any length out safely by placing all segments at the same starting position.
  // As the head moves, the stacked segments will naturally "slither out" of the origin.
  private makeSnake(length: number): Cell[] {
    const headX = 8;
    return Array.from({ length }, () => ({ x: headX, y: 11 }));
  }
  private toast(text: string, duration = 2600) {
    this.state.toast = text;
    this.state.toastUntil = this.state.elapsed + duration;
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
      if (!s.tutorial) {
        s.letters = s.letters.filter((letter) => letter.expiresAt > s.elapsed);
        this.fillLetters();
        if (s.chest && s.chest.expiresAt <= s.elapsed) s.chest = null;
        s.portals = s.portals.filter((p) => p.expiresAt > s.elapsed);
        if (!s.chest && s.elapsed >= s.nextChestAt) this.spawnChest();
        if (s.portals.length === 0 && s.elapsed >= s.nextPortalAt) this.spawnPortal();
        s.obstacles = s.obstacles.filter((brick) => brick.expiresAt > s.elapsed);
        this.fillObstacles();
        if (s.toast && s.elapsed >= s.toastUntil) s.toast = '';
        this.checkFullBag();
      }
      this.moveAccumulator += dt;
      while (this.moveAccumulator >= this.interval && s.phase === 'playing') {
        this.moveAccumulator -= this.interval;
        this.step();
      }
      if (s.spawnPortal) {
        const stackedCount = s.snake.filter(
          (p) => p.x === s.spawnPortal!.x && p.y === s.spawnPortal!.y,
        ).length;
        if (stackedCount === 0) s.spawnPortal = null;
      }
    } else if (s.phase === 'warp') {
      s.warpRemaining = Math.max(0, s.warpRemaining - dt);
      if (!s.warpRemaining) {
        s.phase = 'challenge';
        s.challengeRemaining = s.settings.portalSeconds * 1000;
        s.error = '';
        this.publish();
      }
    } else if (s.phase === 'challenge') {
      s.challengeRemaining = Math.max(0, s.challengeRemaining - dt);
      if (!s.challengeRemaining) {
        if (s.tutorial) {
          s.challengeRemaining = s.settings.portalSeconds * 1000;
          s.error = this.t('engine.practiceTimeout');
        } else {
          if (s.snake.length > 3) s.snake.pop();
          s.score = Math.max(0, s.score - TIMEOUT_PENALTY);
          this.sound('timeout');
          s.previousSnake = s.snake.map((p) => ({ ...p }));
          s.notice = this.t('engine.wordTimeout');
          this.beginCountdown();
        }
        this.publish();
      }
    } else if (s.phase === 'revive') {
      s.reviveRemaining = Math.max(0, s.reviveRemaining - dt);
      if (!s.reviveRemaining) {
        s.deathReason = this.t('engine.reviveTimeout');
        s.phase = 'gameOver';
        this.publish();
      }
    } else if (s.phase === 'chest' && s.reward?.opened && !s.reward.revealed) {
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
  private freeCell(
    exclude: Cell[] = [],
    accept: (cell: Cell) => boolean = () => true,
  ): Cell | null {
    const s = this.state;
    const occupied = [
      ...s.snake,
      ...s.letters,
      ...s.obstacles,
      ...(s.chest ? [s.chest] : []),
      ...exclude,
    ];
    for (const p of s.portals) {
      for (let x = 0; x < 2; x++)
        for (let y = 0; y < 2; y++) occupied.push({ x: p.x + x, y: p.y + y });
    }
    const taken = new Set(occupied.map((p) => p.y * COLS + p.x));
    const available: Cell[] = [];
    for (let y = 1; y < ROWS - 1; y++)
      for (let x = 1; x < COLS - 1; x++)
        if (!taken.has(y * COLS + x) && accept({ x, y })) available.push({ x, y });
    return available.length
      ? available[Math.min(available.length - 1, Math.floor(this.random() * available.length))]
      : null;
  }
  private randomLetter(): string {
    const { score, letters, inventory } = this.state;
    const V = GameEngine.VOWELS;

    const onMap = letters.map((l) => l.letter);
    const hasVowel = onMap.some((l) => V.includes(l)) || inventory.some((l) => V.includes(l));

    // 100% Vowel Guarantee
    if (!hasVowel) {
      return V[Math.floor(this.random() * V.length)];
    }

    const pool =
      score < 500
        ? GameEngine.POOL_EASY
        : score < 1500
          ? GameEngine.POOL_MID
          : GameEngine.POOL_FULL;

    let letter = this.pickFrom(pool);

    // Anti-repeat
    for (let i = 0; i < 3; i++) {
      let isRepeat = this.letterHistory.includes(letter) || onMap.includes(letter);
      if (letter === 'Q' && !onMap.includes('U') && !inventory.includes('U')) isRepeat = true;

      if (isRepeat) {
        letter = this.pickFrom(pool);
      } else {
        break;
      }
    }

    this.letterHistory = [...this.letterHistory.slice(-9), letter];
    return letter;
  }
  private fillLetters() {
    if (this.state.tutorial) return;
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
  // Bricks never appear close to the head, so a new one is always visible before you can reach it.
  private fillObstacles() {
    const s = this.state;
    if (s.tutorial) return;
    while (s.obstacles.length < OBSTACLE_COUNT) {
      const head = s.snake[0];
      const cell = this.freeCell(
        [],
        (c) => Math.abs(c.x - head.x) + Math.abs(c.y - head.y) >= 8 && c.y > 0 && c.y < ROWS - 1,
      );
      if (!cell) return;
      s.obstacles.push({ ...cell, id: ++this.id, expiresAt: s.elapsed + OBSTACLE_LIFETIME });
    }
  }
  private dropLetters(count: number): string[] {
    const inventory = this.state.inventory,
      lost: string[] = [];
    while (lost.length < count && inventory.length) {
      const index = Math.min(inventory.length - 1, Math.floor(this.random() * inventory.length));
      lost.push(...inventory.splice(index, 1));
    }
    return lost;
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
  private spawnPortal(duration = 60_000, nextDelay = 30_000) {
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
          [
            ...s.snake,
            ...s.letters,
            ...s.obstacles,
            ...(s.chest ? [s.chest] : []),
            ...s.portals,
          ].some((p) => same(p, cell)),
        )
      ) {
        s.portals.push({ x, y, expiresAt: s.elapsed + duration });
        s.nextPortalAt = s.elapsed + nextDelay;
        this.sound('portal');
        return;
      }
    }
  }

  private bonusPortalSpawned = false;
  private checkFullBag() {
    const s = this.state,
      count = s.inventory.length;
    if (s.tutorial || count < MAX_LETTERS) {
      this.bonusPortalSpawned = false;
      return;
    }
    if (!this.bonusPortalSpawned && s.portals.length < 2) {
      this.bonusPortalSpawned = true;
      if (s.portals.length === 0) this.spawnPortal(60_000);
      this.spawnPortal(90_000, 30_000); // 1.30 min portal
    }
  }
  private beginWarp(forced: boolean) {
    const s = this.state;
    s.phase = 'warp';
    s.warpRemaining = s.settings.reducedMotion ? 600 : WARP_TIME;
    s.forced = forced;
    s.portals = [];
    s.nextPortalAt = s.elapsed + 30_000;
    s.error = '';
    s.toast = '';
    this.queued = [];
    this.boosted = false;
    this.sound('warp');
    this.publish();
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
          ? this.t('engine.hitWall')
          : this.t('engine.hitBody'),
      );
      return;
    }
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    s.snake.unshift(head);
    if (!pickup) s.snake.pop();
    else {
      s.letters = s.letters.filter((item) => item.id !== pickup.id);
      this.fillLetters();
      if (s.inventory.length >= MAX_LETTERS) {
        this.toast(this.t('engine.bagFull', { max: MAX_LETTERS }));
        this.sound('wrong');
      } else {
        s.inventory.push(pickup.letter);
        this.sound('collect');
      }
      if (s.tutorial && s.lesson === 2) {
        this.finishPractice();
        return;
      }
    }
    const brick = s.obstacles.find((item) => same(item, head));
    if (brick) {
      s.obstacles = s.obstacles.filter((item) => item.id !== brick.id);
      // With no points left to pay the penalty, the brick is fatal and goes to the revive screen.
      if (!s.tutorial && s.score <= 0) {
        this.die(this.t('engine.hitBrick'));
        return;
      }
      s.score = Math.max(0, s.score - OBSTACLE_SCORE_PENALTY);
      const [lost] = this.dropLetters(1);
      this.toast(
        lost
          ? this.t('engine.brickHit', { points: OBSTACLE_SCORE_PENALTY, letter: lost })
          : this.t('engine.brickHitEmpty', { points: OBSTACLE_SCORE_PENALTY }),
      );
      this.sound('smash');
      if (s.tutorial && s.lesson === 6) {
        this.finishPractice();
        return;
      }
      this.publish();
    }
    if (s.tutorial && s.lesson === 0) {
      const target = (['up', 'left', 'down', 'right'] as Direction[])[s.practicedDirections.length];
      this.tutorialDirectionMoves = s.direction === target ? this.tutorialDirectionMoves + 1 : 0;
      if (this.tutorialDirectionMoves >= 3) {
        s.practicedDirections.push(target);
        this.tutorialDirectionMoves = 0;
        this.publish();
      }
      if (s.practicedDirections.length === 4) {
        this.finishPractice();
        return;
      }
    }
    if (s.tutorial && s.lesson === 1 && this.boosted) this.tutorialBoostMoves += 1;
    if (s.tutorial && s.lesson === 1 && this.tutorialBoostMoves >= 5) {
      this.finishPractice();
      return;
    }
    if (s.chest && same(s.chest, head)) {
      const kind = s.chest.kind;
      s.reward = {
        kind,
        letters: s.tutorial
          ? ['A', 'T']
          : Array.from({ length: CHESTS[kind].count }, () => this.randomLetter()),
        elapsed: 0,
        revealed: !s.tutorial && s.settings.reducedMotion,
        opened: !s.tutorial,
      };
      s.chest = null;
      s.nextChestAt = s.elapsed + 20_000;
      s.phase = 'chest';
      this.queued = [];
      this.boosted = false;
      // Spin sound fires immediately when the chest is hit (or auto-opened).
      if (!s.tutorial) this.sound('chestSpin');
      this.publish();
      return;
    }
    const enteredPortal = s.portals.find(
      (p) => head.x >= p.x && head.x < p.x + 2 && head.y >= p.y && head.y < p.y + 2,
    );
    if (enteredPortal) {
      if (!s.tutorial) {
        this.beginWarp(false);
        return;
      }
      s.phase = 'challenge';
      s.challengeRemaining = s.settings.portalSeconds * 1000;
      s.portals = [];
      s.nextPortalAt = s.elapsed + 30_000;
      s.error = '';
      this.queued = [];
      this.boosted = false;
      this.sound('portal');
      this.nextLesson();
    }
  }
  private finishPractice() {
    const s = this.state;
    s.phase = 'lessonReview';
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    this.queued = [];
    this.boosted = false;
    this.publish();
  }
  continueLesson() {
    if (!this.state.tutorial || this.state.phase !== 'lessonReview') return;
    this.nextLesson();
  }
  openTutorialChest() {
    const s = this.state;
    if (!s.tutorial || s.phase !== 'chest' || !s.reward || s.reward.opened) return;
    s.reward.opened = true;
    s.reward.revealed = s.settings.reducedMotion;
    this.sound('chestSpin');
    this.publish();
  }
  private nextLesson() {
    const s = this.state;
    s.lesson += 1;
    s.phase = 'lesson';
    s.notice = '';
    s.letters = [];
    s.chest = null;
    s.portals = [];
    s.obstacles = [];
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    this.queued = [];
    this.boosted = false;
    this.lessonReturn = null;
    this.publish();
  }
  private prepareLessonField() {
    const s = this.state;
    this.tutorialBoostMoves = 0;
    this.tutorialDirectionMoves = 0;
    s.practicedDirections = [];
    s.snake = this.startSnake();
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    s.direction = 'right';
    s.nextDirection = 'right';
    s.letters = [];
    s.chest = null;
    s.portals = [];
    // Practice objects are scripted and stay until collected, even after a retry.
    if (s.lesson === 2)
      s.letters = [
        { id: ++this.id, letter: 'C', x: 18, y: 11, expiresAt: Number.MAX_SAFE_INTEGER },
      ];
    if (s.lesson === 3)
      s.chest = { id: ++this.id, kind: 'silver', x: 18, y: 11, expiresAt: Number.MAX_SAFE_INTEGER };
    if (s.lesson === 4) s.portals = [{ x: 12, y: 10, expiresAt: Number.MAX_SAFE_INTEGER }];
    s.obstacles = [];
    if (s.lesson === 6) {
      s.obstacles = [{ id: ++this.id, x: 18, y: 11, expiresAt: Number.MAX_SAFE_INTEGER }];
      s.inventory = ['C', 'A', 'T'];
    }
  }
  showLesson() {
    const s = this.state;
    if (!s.tutorial || !['playing', 'countdown', 'challenge'].includes(s.phase)) return;
    this.lessonReturn = s.phase;
    s.phase = 'lesson';
    this.queued = [];
    this.boosted = false;
    this.publish();
  }
  startLesson() {
    const s = this.state;
    if (!s.tutorial || s.phase !== 'lesson') return;
    if (this.lessonReturn) {
      const target = this.lessonReturn;
      this.lessonReturn = null;
      if (target === 'challenge') s.phase = target;
      else this.beginCountdown();
    } else if (s.lesson === 7) s.phase = 'tutorialDone';
    else if (s.lesson === 5) {
      s.phase = 'challenge';
      s.challengeRemaining = s.settings.portalSeconds * 1000;
      s.error = '';
    } else {
      this.prepareLessonField();
      this.beginCountdown();
    }
    this.publish();
  }
  clearWordError() {
    if (this.state.phase !== 'challenge' || !this.state.error) return;
    this.state.error = '';
    this.publish();
  }
  submitWord(input: string): boolean {
    const s = this.state;
    if (s.phase !== 'challenge') return false;
    const word = normalizeWord(input);
    const entry = this.dictionary.find(word);
    let error = '';
    if (!/^[A-Z]+$/.test(word)) error = this.t('engine.enterWord');
    else if (!canBuild(word, s.inventory)) error = this.t('engine.missingLetters');
    else if (s.tutorial && word !== 'CAT') error = this.t('engine.tutorialWord');
    else if (!entry) error = this.t('engine.unknownWord');
    else if (!s.tutorial && s.words.some((w) => w.entry.word === entry.word))
      error = this.t('engine.duplicateWord');
    else if (!s.tutorial && !matchesLevel(entry.level, s.settings.level))
      error = this.t('engine.levelMismatch');
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
    if (s.tutorial) return 'CAT';
    const entry = this.dictionary.hint(s.inventory, s.tutorial ? 'all' : s.settings.level);
    if (!entry) {
      s.error = this.t('engine.noHint');
      this.publish();
    }
    return entry?.word ?? '';
  }
  leaveChallenge() {
    if (this.state.phase !== 'challenge' || this.state.tutorial || this.state.forced) return;
    this.state.notice = this.t('engine.leavePortal');
    this.beginCountdown();
    this.publish();
  }
  continueWord() {
    if (this.state.phase !== 'wordResult') return;
    if (this.state.tutorial) {
      this.nextLesson();
      return;
    } else this.beginCountdown();
    this.publish();
  }
  swapChestLetter(rewardIndex: number, inventoryIndex: number) {
    const s = this.state;
    if (s.phase !== 'chest' || !s.reward?.revealed) return;

    // Swap the letters
    const temp = s.reward.letters[rewardIndex];
    s.reward.letters[rewardIndex] = s.inventory[inventoryIndex];
    s.inventory[inventoryIndex] = temp;

    this.publish();
  }

  claimChest() {
    const s = this.state;
    if (s.phase !== 'chest' || !s.reward?.opened || !s.reward.revealed) return false;
    const room = Math.max(0, MAX_LETTERS - s.inventory.length),
      added = s.reward.letters.slice(0, room);
    s.inventory.push(...added);
    s.notice =
      added.length < s.reward.letters.length
        ? this.t('engine.lootCapped', {
            chest: this.t(CHESTS[s.reward.kind].title),
            count: added.length,
            max: MAX_LETTERS,
          })
        : this.t('engine.lootAdded', {
            chest: this.t(CHESTS[s.reward.kind].title),
            count: added.length,
          });
    s.reward = null;
    if (s.tutorial) {
      this.finishPractice();
      return true;
    }
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
      this.prepareLessonField();
      s.notice = this.t('engine.practiceRetry');
      this.lessonReturn = null;
      s.phase = 'lesson';
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
      s.error = this.t('engine.reviveWrong');
      this.sound('wrong');
      this.publish();
      return false;
    }
    s.hearts -= 1;
    s.score = Math.max(0, s.score - REVIVE_PENALTY);
    // The body keeps its length; the price is points and part of the inventory instead.
    s.snake = this.makeSnake(s.snake.length);
    s.spawnPortal = { x: 8, y: 11, type: 'revive' };
    s.previousSnake = s.snake.map((p) => ({ ...p }));
    s.direction = 'right';
    s.letters = s.letters.filter((p) => !s.snake.some((q) => same(p, q)));
    s.obstacles = s.obstacles.filter((p) => !s.snake.some((q) => same(p, q)));
    s.chest = null;
    s.portals = [];
    s.nextPortalAt = s.elapsed + 10_000;
    s.nextChestAt = s.elapsed + 12_000;
    const lost = this.dropLetters(REVIVE_LETTER_LOSS);
    this.fillLetters();
    this.fillObstacles();
    s.reviveWord = null;
    s.error = '';
    s.notice = this.t('engine.revived', {
      points: REVIVE_PENALTY,
      lost: lost.length,
    });
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
