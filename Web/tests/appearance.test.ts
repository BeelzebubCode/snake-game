import { describe, expect, it } from 'vitest';
import {
  DIRECTION_LABELS,
  countdownArrow,
  MAPS,
  MAP_SCORE_STEP,
  SKINS,
  mapFor,
  sampleCenterline,
  snakeCenterline,
} from '../src/game/appearance';
import { GameEngine } from '../src/game/engine';
import { CELL, COLS, ROWS, DEFAULT_SETTINGS } from '../src/game/types';
import { matchesLevel } from '../src/data/vocabulary';
function advance(e: GameEngine, ms: number) {
  while (ms > 0) {
    const dt = Math.min(ms, 100);
    e.advance(dt);
    ms -= dt;
  }
}
describe('countdown direction preview', () => {
  it('shows accepted pre-steering, rejects reversal, and makes that the first move', () => {
    const e = new GameEngine();
    expect(e.getSnapshot().nextDirection).toBe('right');
    e.turn('up');
    expect(e.getSnapshot().nextDirection).toBe('up');
    e.turn('left');
    expect(e.getSnapshot().nextDirection).toBe('up');
    e.turn('down');
    expect(e.getSnapshot().nextDirection).toBe('down');
    const head = { ...e.state.snake[0] };
    advance(e, 3000);
    advance(e, 200);
    expect(e.state.snake[0]).toEqual({ x: head.x, y: head.y + 1 });
  });
  it('restores arrows after leaving a portal without consuming a queued second move', () => {
    const e = new GameEngine();
    e.state.phase = 'challenge';
    e.state.direction = 'up';
    e.leaveChallenge();
    expect(e.state.phase).toBe('countdown');
    expect(e.state.nextDirection).toBe('up');
    e.turn('down');
    expect(e.state.nextDirection).toBe('up');
    e.turn('left');
    e.turn('right');
    expect(e.state.nextDirection).toBe('right');
    advance(e, 3200);
    expect(e.state.direction).toBe('right');
    expect(DIRECTION_LABELS[e.state.nextDirection].arrow).toBe('→');
  });
});
describe('smooth movement geometry', () => {
  it('interpolates equally on both axes and keeps the real turning corner', () => {
    const horizontal = {
      previousSnake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      snake: [
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
    };
    const vertical = {
      previousSnake: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 5, y: 3 },
      ],
      snake: [
        { x: 5, y: 6 },
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ],
    };
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
      const h = snakeCenterline(horizontal, t),
        v = snakeCenterline(vertical, t);
      expect(h[0].x).toBeCloseTo(v[0].y);
      expect(h.at(-1)!.x).toBeCloseTo(v.at(-1)!.y);
      expect(h[0].x - h.at(-1)!.x).toBeCloseTo(2 * CELL);
    }
    const corner = {
      previousSnake: horizontal.previousSnake,
      snake: [
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
    };
    const line = snakeCenterline(corner, 0.5);
    expect(line).toContainEqual({ x: 5.5 * CELL, y: 5.5 * CELL });
    for (let i = 1; i < line.length; i++)
      expect(line[i].x === line[i - 1].x || line[i].y === line[i - 1].y).toBe(true);
    expect(sampleCenterline(line).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(
      true,
    );
  });
  it('is continuous across ticks and does not jump when boosting', () => {
    const e = new GameEngine();
    e.state.phase = 'playing';
    advance(e, 300);
    const before = snakeCenterline(e.state, e.interpolation)[0],
      fraction = e.interpolation;
    e.setBoost(true);
    expect(e.interpolation).toBeCloseTo(fraction);
    expect(snakeCenterline(e.state, e.interpolation)[0]).toEqual(before);
    e.setBoost(false);
    expect(e.interpolation).toBeCloseTo(fraction);
    const old = structuredClone(e.state);
    advance(e, 100);
    expect(snakeCenterline(old, 1)[0]).toEqual(snakeCenterline(e.state, 0)[0]);
  });
});
describe('maps and original options', () => {
  it('uses the four Python skin palettes and grouped vocabulary filters', () => {
    expect(SKINS.mint.head).toBe(0x2ee6a0);
    expect(SKINS.mint.tail).toBe(0x00b4d8);
    expect(Object.keys(SKINS)).toHaveLength(4);
    expect(DEFAULT_SETTINGS.skin).toBe('mint');
    expect(DEFAULT_SETTINGS.showGrid).toBe(true);
    expect(matchesLevel('A2', 'easy')).toBe(true);
    expect(matchesLevel('B1', 'easy')).toBe(false);
    expect(matchesLevel('B2', 'medium')).toBe(true);
    expect(matchesLevel('C1', 'hard')).toBe(true);
  });
  it('advances at score thresholds without changing game state or reverting on penalties', () => {
    const e = new GameEngine();
    e.state.phase = 'challenge';
    e.state.score = MAP_SCORE_STEP - 450;
    const snake = structuredClone(e.state.snake),
      letters = structuredClone(e.state.letters);
    expect(e.submitWord('CAT')).toBe(true);
    expect(e.state.mapStage).toBe(1);
    expect(e.state.snake).toEqual(snake);
    expect(e.state.letters).toEqual(letters);
    e.state.phase = 'revive';
    e.state.reviveWord = { word: 'CAT', meaningTh: 'แมว', level: 'A1' };
    e.submitRevival('CAT');
    expect(e.state.score).toBe(1400);
    expect(e.state.mapStage).toBe(1);
    expect(mapFor(e.state.mapStage, 'auto').id).toBe('forest');
  });
  it('cycles four maps and respects a fixed-map choice', () => {
    for (let i = 0; i < 8; i++) expect(mapFor(i).id).toBe(MAPS[i % 4].id);
    expect(mapFor(3, 'midnight').id).toBe('midnight');
    expect(mapFor(0, 'volcano').id).toBe('volcano');
    expect(mapFor(NaN).id).toBe('midnight');
  });
});

describe('arrow position in front of the head', () => {
  it('stays ahead and clear of the face in all four directions, including board edges', () => {
    for (const x of [16, 640, COLS * CELL - 16]) {
      for (const y of [16, 352, ROWS * CELL - 16]) {
        for (const direction of ['up', 'down', 'left', 'right'] as const) {
          const head = { x, y },
            arrow = countdownArrow(head, direction);
          const angle = DIRECTION_LABELS[direction].angle;
          expect(Math.hypot(arrow.x - x, arrow.y - y)).toBeGreaterThanOrEqual(34);
          expect((arrow.x - x) * Math.cos(angle) + (arrow.y - y) * Math.sin(angle)).toBeGreaterThan(
            0,
          );
          expect(arrow.x).toBeGreaterThanOrEqual(12);
          expect(arrow.x).toBeLessThanOrEqual(COLS * CELL - 12);
          expect(arrow.y).toBeGreaterThanOrEqual(12);
          expect(arrow.y).toBeLessThanOrEqual(ROWS * CELL - 12);
        }
      }
    }
  });
});
