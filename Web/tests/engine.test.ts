import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';
import {
  CHESTS,
  DEFAULT_SETTINGS,
  LETTER_LIFETIME,
  MAX_LETTERS,
  OBSTACLE_COUNT,
  OBSTACLE_LIFETIME,
  WARP_TIME,
} from '../src/game/types';
import type { ChestKind } from '../src/game/types';
import { canBuild, scoreWord, Vocabulary } from '../src/data/vocabulary';
const make = () => new GameEngine({ ...DEFAULT_SETTINGS }, false, () => 0.3, new Vocabulary());
function advance(e: GameEngine, ms: number) {
  while (ms > 0) {
    const step = Math.min(100, ms);
    e.advance(step);
    ms -= step;
  }
}
function playing(e: GameEngine) {
  e.state.phase = 'playing';
  return e;
}
function crash(e: GameEngine) {
  e.state.phase = 'playing';
  e.state.snake = [
    { x: 39, y: 11 },
    { x: 38, y: 11 },
    { x: 37, y: 11 },
  ];
  e.state.direction = 'right';
  advance(e, 200);
}
function putChest(e: GameEngine, kind: ChestKind) {
  playing(e);
  e.state.chest = { x: 9, y: 11, id: 900, kind, expiresAt: 30_000 };
  advance(e, 200);
}

describe('session and motion', () => {
  it('starts slow, with a one-minute portal and three revival hearts', () => {
    const s = make().state;
    expect(s.settings.speed).toBe('slow');
    expect(s.settings.portalSeconds).toBe(60);
    expect(s.hearts).toBe(3);
    expect(s.phase).toBe('countdown');
    expect(s.letters).toHaveLength(3);
  });
  it('uses the Python slow speed of six cells per second in normal play and tutorial', () => {
    for (const tutorial of [false, true]) {
      const e = new GameEngine({ ...DEFAULT_SETTINGS }, tutorial, () => 0.3, new Vocabulary());
      if (tutorial) e.startLesson();
      const x = e.state.snake[0].x;
      advance(e, 3000);
      expect(e.state.phase).toBe('playing');
      expect(e.state.snake[0].x).toBe(x);
      advance(e, 1000);
      expect(e.state.snake[0].x).toBe(x + 6);
    }
  });
  it('buffers valid turns without accepting a direct reversal', () => {
    const e = playing(make());
    e.turn('left');
    advance(e, 200);
    expect(e.state.direction).toBe('right');
    e.turn('up');
    e.turn('left');
    advance(e, 200);
    expect(e.state.direction).toBe('up');
    advance(e, 200);
    expect(e.state.direction).toBe('left');
  });
  it('can enter the departing tail cell, unless that move grows the snake', () => {
    const e = playing(make());
    e.state.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ];
    e.state.direction = 'up';
    e.state.letters = e.state.letters.filter((p) => !(p.x === 4 && p.y === 5));
    e.turn('left');
    advance(e, 200);
    expect(e.state.phase).toBe('playing');
    const g = playing(make());
    g.state.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ];
    g.state.direction = 'up';
    g.state.letters[0] = { x: 4, y: 5, letter: 'A', id: 1000, expiresAt: 30000 };
    g.turn('left');
    advance(g, 200);
    expect(g.state.phase).toBe('revive');
  });
});
describe('timed letters and paused world', () => {
  it('replaces all uncollected letters at exactly thirty active seconds', () => {
    const e = playing(make()),
      old = e.state.letters.map((p) => p.id);
    e.state.elapsed = LETTER_LIFETIME - 1;
    e.advance(1);
    expect(e.state.letters).toHaveLength(3);
    expect(e.state.letters.every((p) => !old.includes(p.id) && p.expiresAt === 60_000)).toBe(true);
    expect(new Set(e.state.letters.map((p) => p.x + ',' + p.y)).size).toBe(3);
    expect(e.state.letters.some((p) => e.state.snake.some((q) => q.x === p.x && q.y === p.y))).toBe(
      false,
    );
  });
  it('collects one letter and refills the field to three', () => {
    const e = playing(make());
    e.state.letters[0] = { x: 9, y: 11, id: 900, letter: 'Z', expiresAt: 30000 };
    advance(e, 200);
    expect(e.state.inventory).toContain('Z');
    expect(e.state.letters).toHaveLength(3);
    expect(e.state.snake).toHaveLength(5);
  });
  it('freezes pickup lifetimes and spawn clocks while paused', () => {
    const e = playing(make()),
      before = structuredClone(e.state);
    e.pause();
    advance(e, 90_000);
    expect(e.state.elapsed).toBe(before.elapsed);
    expect(e.state.letters).toEqual(before.letters);
    expect(e.state.nextPortalAt).toBe(before.nextPortalAt);
    e.resume();
    expect(e.state.phase).toBe('countdown');
    advance(e, 3000);
    expect(e.state.phase).toBe('playing');
  });
});
describe('portals and word construction', () => {
  it('uses the configured full duration when entering a portal', () => {
    for (const duration of [30, 60, 90, 120]) {
      const e = new GameEngine({ ...DEFAULT_SETTINGS, portalSeconds: duration });
      playing(e);
      e.state.portals = [{ x: 9, y: 11, expiresAt: 60000 }];
      advance(e, 200);
      expect(e.state.phase).toBe('warp');
      advance(e, WARP_TIME);
      expect(e.state.phase).toBe('challenge');
      expect(e.state.forced).toBe(false);
      expect(e.state.challengeRemaining).toBe(duration * 1000);
    }
  });
  it('counts duplicate letters, consumes them once, and awards classic scores', () => {
    const e = make();
    e.state.phase = 'challenge';
    e.state.inventory = ['A', 'P', 'L', 'E'];
    expect(e.submitWord('APPLE')).toBe(false);
    e.state.inventory.push('P');
    expect(e.submitWord(' apple ')).toBe(true);
    expect(e.state.inventory).toEqual([]);
    expect(e.state.score).toBe(750);
    expect(e.submitWord('APPLE')).toBe(false);
    expect(e.state.score).toBe(750);
    expect(canBuild('APPLE', ['A', 'P', 'L', 'E'])).toBe(false);
    expect(scoreWord({ word: 'CAT', meaningTh: 'แมว', level: 'A1' })).toBe(450);
  });
  it('enforces vocabulary level selection', () => {
    const e = new GameEngine({ ...DEFAULT_SETTINGS, level: 'B2' });
    e.state.phase = 'challenge';
    expect(e.submitWord('CAT')).toBe(false);
    expect(e.state.score).toBe(0);
  });
  it('freezes the challenge on pause and resumes with remaining time', () => {
    const e = make();
    e.state.phase = 'challenge';
    advance(e, 5000);
    const remaining = e.state.challengeRemaining;
    e.pause();
    advance(e, 10000);
    expect(e.state.challengeRemaining).toBe(remaining);
    e.resume();
    expect(e.state.phase).toBe('challenge');
    expect(e.state.challengeRemaining).toBe(remaining);
  });
  it('times out once, retains inventory, and never shrinks below three', () => {
    const e = make();
    e.state.phase = 'challenge';
    const letters = [...e.state.inventory];
    e.state.snake = e.state.snake.slice(0, 3);
    advance(e, 60_000);
    expect(e.state.phase).toBe('countdown');
    expect(e.state.snake).toHaveLength(3);
    expect(e.state.inventory).toEqual(letters);
  });
  it('deducts 100 points on timeout without going below zero', () => {
    const e = make();
    e.state.score = 250;
    e.state.phase = 'challenge';
    advance(e, 60_000);
    expect(e.state.score).toBe(150);
    e.state.phase = 'challenge';
    e.state.score = 40;
    advance(e, 60_000);
    expect(e.state.score).toBe(0);
  });
  it('rejects a word already answered this round', () => {
    const e = make();
    e.state.phase = 'challenge';
    e.state.inventory = ['C', 'A', 'T'];
    expect(e.submitWord('CAT')).toBe(true);
    e.state.phase = 'challenge';
    e.state.inventory = ['C', 'A', 'T'];
    const score = e.state.score;
    expect(e.submitWord('CAT')).toBe(false);
    expect(e.state.score).toBe(score);
    expect(e.state.inventory).toEqual(['C', 'A', 'T']);
    expect(e.state.error).not.toBe('');
  });
  it('spawns a bonus portal when the bag is full', () => {
    const e = make();
    playing(e);
    e.state.nextPortalAt = Number.MAX_SAFE_INTEGER;
    e.state.inventory = Array.from({ length: 29 }, () => 'A');
    advance(e, 100);
    expect(e.state.portals).toHaveLength(0);
    e.state.inventory.push('A');
    advance(e, 100);
    expect(e.state.portals).toHaveLength(2);
  });
  it('re-arms the bonus portal after the bag drains below maximum', () => {
    const e = make();
    e.state.nextPortalAt = Number.MAX_SAFE_INTEGER;
    e.state.inventory = Array.from({ length: 30 }, () => 'A');
    playing(e);
    advance(e, 100);
    expect(e.state.portals).toHaveLength(2);
    e.state.portals = [];
    advance(e, 100);
    expect(e.state.portals).toHaveLength(0);
    e.state.inventory = ['A'];
    advance(e, 100);
    e.state.inventory = Array.from({ length: 30 }, () => 'A');
    advance(e, 100);
    expect(e.state.portals).toHaveLength(2);
  });
  it('spawns only the bonus portal if a gate is already open', () => {
    const e = make();
    playing(e);
    e.state.portals = [{ x: 30, y: 3, expiresAt: 60_000 }];
    e.state.inventory = Array.from({ length: 30 }, () => 'A');
    advance(e, 100);
    expect(e.state.portals).toHaveLength(2);
  });
  it('freezes the world during the warp and lets the player leave a normal gate entry', () => {
    const e = playing(make());
    e.state.portals = [{ x: 9, y: 11, expiresAt: 60000 }];
    advance(e, 200);
    expect(e.state.phase).toBe('warp');
    const elapsed = e.state.elapsed;
    advance(e, 500);
    expect(e.state.elapsed).toBe(elapsed);
    advance(e, WARP_TIME);
    expect(e.state.phase).toBe('challenge');
    e.leaveChallenge();
    expect(e.state.phase).toBe('countdown');
  });
});
describe('red bricks and the bag limit', () => {
  const clearField = (e: GameEngine) => {
    e.state.letters = [];
    e.state.obstacles = [];
    e.state.snake = [
      { x: 8, y: 11 },
      { x: 7, y: 11 },
      { x: 6, y: 11 },
      { x: 5, y: 11 },
    ];
    e.state.chest = null;
  };
  it('keeps five bricks on a regular board and none during the tutorial', () => {
    expect(make().state.obstacles).toHaveLength(OBSTACLE_COUNT);
    expect(new GameEngine({ ...DEFAULT_SETTINGS }, true).state.obstacles).toEqual([]);
  });
  it('never places a brick close to the snake head', () => {
    const e = make();
    for (const brick of e.state.obstacles) {
      expect(
        Math.abs(brick.x - e.state.snake[0].x) + Math.abs(brick.y - e.state.snake[0].y),
      ).toBeGreaterThanOrEqual(8);
    }
  });
  it('breaks on contact: -50 points, one random letter lost, and a replacement appears', () => {
    const e = playing(make());
    clearField(e);
    e.state.score = 300;
    e.state.inventory = ['C', 'A', 'T'];
    e.state.obstacles = [{ id: 901, x: 9, y: 11, expiresAt: 40_000 }];
    advance(e, 200);
    expect(e.state.phase).toBe('playing');
    expect(e.state.score).toBe(250);
    expect(e.state.inventory).toHaveLength(2);
    expect(e.state.toast).not.toBe('');
    expect(e.state.obstacles.some((b) => b.id === 901)).toBe(false);
    advance(e, 100);
    expect(e.state.obstacles).toHaveLength(OBSTACLE_COUNT);
  });
  it('costs points even with an empty bag, never below zero', () => {
    const e = playing(make());
    clearField(e);
    e.state.score = 20;
    e.state.inventory = [];
    e.state.obstacles = [{ id: 902, x: 9, y: 11, expiresAt: 40_000 }];
    advance(e, 200);
    expect(e.state.score).toBe(0);
    expect(e.state.inventory).toEqual([]);
  });
  it('is fatal with zero points, opening the revive screen (or ending the run with no hearts)', () => {
    const e = playing(make());
    clearField(e);
    e.state.score = 0;
    e.state.obstacles = [{ id: 904, x: 9, y: 11, expiresAt: 40_000 }];
    advance(e, 200);
    expect(e.state.phase).toBe('revive');
    expect(e.state.deathReason).not.toBe('');
    expect(e.state.obstacles.some((b) => b.id === 904)).toBe(false);
    const spent = playing(make());
    clearField(spent);
    spent.state.hearts = 0;
    spent.state.score = 0;
    spent.state.obstacles = [{ id: 905, x: 9, y: 11, expiresAt: 40_000 }];
    advance(spent, 200);
    expect(spent.state.phase).toBe('gameOver');
  });
  it('removes bricks after forty active seconds and refills the board', () => {
    const e = make();
    const ids = e.state.obstacles.map((b) => b.id);
    e.state.phase = 'playing';
    e.state.snake = [
      { x: 8, y: 1 },
      { x: 7, y: 1 },
      { x: 6, y: 1 },
      { x: 5, y: 1 },
    ];
    e.state.direction = 'left';
    e.advance(100);
    e.state.elapsed = OBSTACLE_LIFETIME;
    e.advance(100);
    expect(e.state.obstacles).toHaveLength(OBSTACLE_COUNT);
    expect(e.state.obstacles.every((b) => !ids.includes(b.id))).toBe(true);
  });
  it('never lets the bag exceed 30 letters, from pickups or chests', () => {
    const e = playing(make());
    clearField(e);
    e.state.inventory = Array.from({ length: MAX_LETTERS }, () => 'A');
    e.state.letters = [{ id: 903, letter: 'Z', x: 9, y: 11, expiresAt: 30_000 }];
    advance(e, 200);
    expect(e.state.inventory).toHaveLength(MAX_LETTERS);
    e.state.phase = 'chest';
    e.state.inventory = Array.from({ length: 28 }, () => 'A');
    e.state.reward = {
      kind: 'red',
      letters: ['B', 'B', 'B', 'B', 'B'],
      elapsed: 0,
      revealed: true,
      opened: true,
    };
    expect(e.claimChest()).toBe(true);
    expect(e.state.inventory).toHaveLength(MAX_LETTERS);
  });
});
describe('four chest tiers', () => {
  it.each(Object.keys(CHESTS) as ChestKind[])(
    'reveals and grants %s rewards exactly once',
    (kind) => {
      const e = make(),
        before = e.state.inventory.length;
      putChest(e, kind);
      expect(e.state.phase).toBe('chest');
      expect(e.state.reward?.letters).toHaveLength(CHESTS[kind].count);
      const elapsed = e.state.elapsed,
        letters = structuredClone(e.state.letters),
        reward = [...e.state.reward!.letters];
      expect(e.claimChest()).toBe(false);
      advance(e, 1600);
      expect(e.state.elapsed).toBe(elapsed);
      expect(e.state.letters).toEqual(letters);
      expect(e.state.reward?.letters).toEqual(reward);
      expect(e.claimChest()).toBe(true);
      expect(e.state.inventory).toHaveLength(before + CHESTS[kind].count);
      expect(e.claimChest()).toBe(false);
      expect(e.state.inventory).toHaveLength(before + CHESTS[kind].count);
    },
  );
  it('freezes reveal while paused and skips animation for reduced motion', () => {
    const e = make();
    putChest(e, 'gold');
    advance(e, 400);
    e.pause();
    advance(e, 4000);
    expect(e.state.reward?.elapsed).toBe(400);
    e.resume();
    advance(e, 1200);
    expect(e.state.reward?.revealed).toBe(true);
    const r = new GameEngine({ ...DEFAULT_SETTINGS, reducedMotion: true });
    putChest(r, 'red');
    expect(r.state.reward?.revealed).toBe(true);
    expect(r.claimChest()).toBe(true);
  });
});
describe('revival', () => {
  it('lets wrong answers retry without spending a heart or score', () => {
    const e = make();
    e.state.score = 700;
    crash(e);
    expect(e.state.phase).toBe('revive');
    expect(e.state.reviveRemaining).toBe(30000);
    expect(e.submitRevival('WRONG')).toBe(false);
    expect(e.state.hearts).toBe(3);
    expect(e.state.score).toBe(700);
    const answer = e.state.reviveWord!.word;
    expect(e.submitRevival(' ' + answer.toLowerCase() + ' ')).toBe(true);
    expect(e.state.hearts).toBe(2);
    expect(e.state.score).toBe(600);
    expect(e.state.phase).toBe('countdown');
    expect(e.submitRevival(answer)).toBe(false);
    expect(e.state.hearts).toBe(2);
  });
  it('allows three successful revivals and ends on the fourth death', () => {
    const e = make();
    for (let remaining = 2; remaining >= 0; remaining--) {
      crash(e);
      expect(e.submitRevival(e.state.reviveWord!.word)).toBe(true);
      expect(e.state.hearts).toBe(remaining);
      expect(e.state.score).toBe(0);
    }
    crash(e);
    expect(e.state.phase).toBe('gameOver');
    expect(e.submitRevival('CAT')).toBe(false);
  });
  it('keeps the snake length but costs 100 points and five random letters when reviving', () => {
    const e = make();
    e.state.inventory = ['A', 'P', 'P', 'L', 'E', 'S', 'T', 'O', 'N'];
    e.state.score = 500;
    crash(e);
    const length = e.state.snake.length;
    e.submitRevival(e.state.reviveWord!.word);
    expect(e.state.inventory).toHaveLength(4);
    expect(e.state.score).toBe(400);
    expect(e.state.snake).toHaveLength(length);
    expect(e.state.direction).toBe('right');
    expect(e.state.letters.some((p) => e.state.snake.some((q) => q.x === p.x && q.y === p.y))).toBe(
      false,
    );
  });
  it('pauses the revival timer and rejects answers after the deadline', () => {
    const e = make();
    crash(e);
    advance(e, 5000);
    e.pause();
    advance(e, 10000);
    expect(e.state.reviveRemaining).toBe(25000);
    e.resume();
    const answer = e.state.reviveWord!.word;
    advance(e, 25000);
    expect(e.state.phase).toBe('gameOver');
    expect(e.submitRevival(answer)).toBe(false);
  });
});
describe('beginner tutorial', () => {
  function engine() {
    return new GameEngine(
      { ...DEFAULT_SETTINGS, speed: 'expert', portalSeconds: 15 },
      true,
      () => 0.3,
      new Vocabulary(),
    );
  }
  it('requires steering and boosting, then teaches collecting, chests, portals and spelling', () => {
    const e = engine();
    expect(e.state.settings.speed).toBe('slow');
    expect(e.state.settings.portalSeconds).toBe(60);
    expect(e.state.letters).toEqual([]);
    e.startLesson();
    advance(e, 3400);
    expect(e.state.lesson).toBe(0); // Straight movement does not complete the steering lesson.
    e.turn('up');
    advance(e, 400);
    expect(e.state.lesson).toBe(0);
    expect(e.state.practicedDirections).toEqual([]);
    advance(e, 250);
    for (const direction of ['left', 'down', 'right'] as const) {
      e.turn(direction);
      advance(e, 650);
    }
    expect(e.state.practicedDirections).toEqual(['up', 'left', 'down', 'right']);
    expect(e.state.phase).toBe('lessonReview');
    const snake = structuredClone(e.state.snake);
    advance(e, 90000);
    expect(e.state.snake).toEqual(snake);
    expect(e.state.lesson).toBe(0);
    e.continueLesson();
    expect(e.state.lesson).toBe(1);
    e.continueLesson(); // Repeated clicks cannot skip another lesson.
    expect(e.state.lesson).toBe(1);
    e.startLesson();
    advance(e, 3400);
    expect(e.state.lesson).toBe(1); // Normal speed does not complete the boost lesson.
    e.setBoost(true);
    advance(e, 600);
    expect(e.state.lesson).toBe(1);
    expect(e.state.phase).toBe('lessonReview');
    e.continueLesson();
    e.startLesson();
    expect(e.state.letters.map((l) => l.letter)).toEqual(['C']);
    advance(e, 3600);
    expect(e.state.inventory).toEqual([]); // Time to see and approach the letter.
    advance(e, 1400);
    expect(e.state.inventory).toEqual(['C']);
    expect(e.state.phase).toBe('lessonReview');
    advance(e, 90000);
    expect(e.state.lesson).toBe(2);
    expect(e.state.inventory).toEqual(['C']);
    e.continueLesson();
    e.startLesson();
    expect(e.state.letters).toEqual([]);
    advance(e, 5000);
    expect(e.state.phase).toBe('chest');
    expect(e.state.reward!.letters).toEqual(['A', 'T']);
    expect(e.claimChest()).toBe(false);
    advance(e, 90000);
    expect(e.state.reward!.elapsed).toBe(0);
    expect(e.state.reward!.revealed).toBe(false);
    e.openTutorialChest();
    advance(e, 1600);
    advance(e, 90000);
    expect(e.state.phase).toBe('chest');
    expect(e.state.inventory).toEqual(['C']);
    expect(e.claimChest()).toBe(true);
    expect(e.claimChest()).toBe(false);
    expect(e.state.inventory).toEqual(['C', 'A', 'T']);
    expect(e.state.phase).toBe('lessonReview');
    advance(e, 90000);
    expect(e.state.lesson).toBe(3);
    e.continueLesson();
    expect(e.state.lesson).toBe(4);
    e.startLesson();
    expect(e.state.portals.length).toBeGreaterThan(0);
    expect(e.state.letters).toEqual([]);
    advance(e, 3800);
    expect(e.state.phase).toBe('lesson');
    expect(e.state.lesson).toBe(5);
    const time = e.state.challengeRemaining;
    advance(e, 120000);
    expect(e.state.challengeRemaining).toBe(time);
    expect(e.state.letters).toEqual([]);
    e.startLesson();
    expect(e.state.phase).toBe('challenge');
    expect(e.hint()).toBe('CAT');
    expect(e.submitWord('ACT')).toBe(false);
    expect(e.state.inventory).toHaveLength(3);
    expect(e.submitWord('CAT')).toBe(true);
    expect(e.state.score).toBe(450);
    e.continueWord();
    // Brick lesson: one scripted brick, C A T in the bag, hitting it costs 50 points and a letter.
    expect(e.state.lesson).toBe(6);
    expect(e.state.phase).toBe('lesson');
    e.startLesson();
    expect(e.state.phase).toBe('countdown');
    expect(e.state.obstacles).toHaveLength(1);
    expect(e.state.inventory).toEqual(['C', 'A', 'T']);
    advance(e, 3000 + 2500);
    expect(e.state.phase).toBe('lessonReview');
    expect(e.state.score).toBe(400);
    expect(e.state.inventory).toHaveLength(2);
    e.continueLesson();
    expect(e.state.lesson).toBe(7);
    expect(e.state.phase).toBe('lesson');
    expect(e.state.obstacles).toEqual([]);
    e.startLesson();
    expect(e.state.phase).toBe('tutorialDone');
    expect(e.state.hearts).toBe(3);
  });
  it('keeps manual chest opening and review even with reduced motion', () => {
    const e = new GameEngine({ ...DEFAULT_SETTINGS, reducedMotion: true }, true);
    e.state.lesson = 3;
    e.state.inventory = ['C'];
    e.startLesson();
    advance(e, 5000);
    expect(e.state.reward?.opened).toBe(false);
    expect(e.claimChest()).toBe(false);
    e.openTutorialChest();
    expect(e.state.reward?.revealed).toBe(true);
    expect(e.claimChest()).toBe(true);
    e.pause();
    advance(e, 90000);
    e.resume();
    expect(e.state.phase).toBe('lessonReview');
    expect(e.state.lesson).toBe(3);
    expect(e.state.inventory).toEqual(['C', 'A', 'T']);
  });
  it('never fills three random letters or spawns random objects during any practice stage', () => {
    for (const lesson of [0, 1, 2, 3, 4]) {
      const e = engine();
      e.state.lesson = lesson;
      e.startLesson();
      advance(e, 3000);
      e.state.elapsed = 90000;
      e.state.snake = [
        { x: 20, y: 11 },
        { x: 19, y: 11 },
        { x: 18, y: 11 },
      ];
      advance(e, 200);
      expect(e.state.letters.map((l) => l.letter)).toEqual(lesson === 2 ? ['C'] : []);
      expect(e.state.chest?.kind ?? null).toBe(lesson === 3 ? 'silver' : null);
      expect(e.state.portals.length > 0).toBe(lesson === 4);
    }
  });
  it('retries the same objective after collisions, keeping inventory and hearts', () => {
    const e = engine();
    e.state.lesson = 4;
    e.state.inventory = ['C', 'A', 'T'];
    e.startLesson();
    advance(e, 3000);
    e.state.snake = [
      { x: 39, y: 10 },
      { x: 38, y: 10 },
      { x: 37, y: 10 },
    ];
    advance(e, 200);
    expect(e.state.phase).toBe('lesson');
    expect(e.state.lesson).toBe(4);
    expect(e.state.hearts).toBe(3);
    expect(e.state.inventory).toEqual(['C', 'A', 'T']);
    e.startLesson();
    expect(e.state.letters).toEqual([]);
    expect(e.state.chest).toBeNull();
    advance(e, 3800);
    expect(e.state.lesson).toBe(5);
  });
  it('pauses instructions and resumes help without resetting challenge time or objects', () => {
    const e = engine();
    e.state.lesson = 2;
    e.startLesson();
    advance(e, 3200);
    const letter = structuredClone(e.state.letters);
    e.showLesson();
    advance(e, 90000);
    e.pause();
    e.resume();
    e.startLesson();
    expect(e.state.letters).toEqual(letter);
    expect(e.state.lesson).toBe(2);
    e.state.lesson = 5;
    e.state.phase = 'lesson';
    e.startLesson();
    advance(e, 10000);
    e.showLesson();
    advance(e, 90000);
    e.startLesson();
    expect(e.state.phase).toBe('challenge');
    expect(e.state.challengeRemaining).toBe(50000);
    advance(e, 50000);
    expect(e.state.challengeRemaining).toBe(60000);
    expect(e.state.hearts).toBe(3);
  });
});
