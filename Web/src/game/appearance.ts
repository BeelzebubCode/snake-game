import type { MessageKey } from '../i18n/en';
import type { Cell, Direction, GameState, MapChoice, SkinId } from './types';
import { CELL, COLS, ROWS } from './types';
export const MAP_SCORE_STEP = 1500;
export const SKINS: Record<SkinId, { name: string; head: number; tail: number }> = {
  mint: { name: 'Neon Mint', head: 0x2ee6a0, tail: 0x00b4d8 },
  purple: { name: 'Cyber Purple', head: 0xec4899, tail: 0x9333ea },
  fire: { name: 'Golden Fire', head: 0xfbbf24, tail: 0xef4444 },
  ocean: { name: 'Ocean Blue', head: 0x38bdf8, tail: 0x1e3a8a },
};
export const MAPS = [
  {
    id: 'midnight',
    name: 'Neon Grid',
    description: 'map.midnight',
    background: 0x12121c,
    grid: 0x242638,
    accent: 0x2ee6a0,
    secondary: 0x3498db,
  },
  {
    id: 'forest',
    name: 'Firefly Forest',
    description: 'map.forest',
    background: 0x081f1d,
    grid: 0x153a30,
    accent: 0x68ef9e,
    secondary: 0x0da7a3,
  },
  {
    id: 'ocean',
    name: 'Midnight Ocean',
    description: 'map.ocean',
    background: 0x08182d,
    grid: 0x163651,
    accent: 0x38bdf8,
    secondary: 0x9a70ff,
  },
  {
    id: 'volcano',
    name: 'Ember Valley',
    description: 'map.volcano',
    background: 0x24121e,
    grid: 0x442537,
    accent: 0xffac55,
    secondary: 0xf15b7e,
  },
  {
    id: 'desert',
    name: 'Golden Pyramid',
    description: 'map.desert',
    background: 0x1a1408,
    grid: 0x332a12,
    accent: 0xe6aa3a,
    secondary: 0xf07d30,
  },
  {
    id: 'space',
    name: 'Nebula Drift',
    description: 'map.space',
    background: 0x000510,
    grid: 0x0d1530,
    accent: 0xb07aff,
    secondary: 0xff6eb4,
  },
  {
    id: 'city',
    name: 'Night City',
    description: 'map.city',
    background: 0x070d1a,
    grid: 0x0f1f33,
    accent: 0xffe066,
    secondary: 0x3af0d0,
  },
  {
    id: 'beach',
    name: 'Coral Shore',
    description: 'map.beach',
    background: 0x061424,
    grid: 0x0d2640,
    accent: 0x5de8d0,
    secondary: 0xffd97a,
  },
] as const;
export function mapFor(stage: number, choice: MapChoice = 'auto') {
  if (choice !== 'auto' && choice !== 'random') {
    return MAPS.find((map) => map.id === choice) ?? MAPS[0];
  }
  const s = Number.isFinite(stage) ? Math.max(0, Math.floor(stage)) : 0;
  if (choice === 'auto') return MAPS[s % MAPS.length];

  let currentIdx = 0;
  for (let i = 1; i <= s; i++) {
    const hash = (i * 2654435761) >>> 0;
    const offset = 1 + (hash % (MAPS.length - 1));
    currentIdx = (currentIdx + offset) % MAPS.length;
  }
  return MAPS[currentIdx];
}
export const DIRECTION_LABELS: Record<
  Direction,
  { arrow: string; name: MessageKey; angle: number }
> = {
  up: { arrow: '↑', name: 'direction.up', angle: -Math.PI / 2 },
  down: { arrow: '↓', name: 'direction.down', angle: Math.PI / 2 },
  left: { arrow: '←', name: 'direction.left', angle: Math.PI },
  right: { arrow: '→', name: 'direction.right', angle: 0 },
};
export const hex = (color: number) => '#' + color.toString(16).padStart(6, '0');
export function mixColor(a: number, b: number, t: number): number {
  const v = Math.max(0, Math.min(1, t));
  return [16, 8, 0].reduce(
    (result, shift) =>
      result | (Math.round(((a >> shift) & 255) * (1 - v) + ((b >> shift) & 255) * v) << shift),
    0,
  );
}
// The centerline keeps the exact grid corner between adjacent moving segments.
// Connecting their independently interpolated centers directly cuts the corner.
export function snakeCenterline(
  state: Pick<GameState, 'snake' | 'previousSnake'>,
  fraction: number,
): Cell[] {
  const current = state.snake,
    previous = state.previousSnake;
  if (!current.length) return [];
  const t = Math.max(0, Math.min(1, fraction));
  const interpolate = (a: Cell, b: Cell) => ({
    x: (a.x + (b.x - a.x) * t + 0.5) * CELL,
    y: (a.y + (b.y - a.y) * t + 0.5) * CELL,
  });
  const head = interpolate(previous[0] ?? current[0], current[0]);
  const points = [
    head,
    ...current.slice(1).map((p) => ({ x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL })),
  ];
  const last = current.length - 1;
  if (last > 0) points.push(interpolate(previous[last] ?? current[last], current[last]));
  return points.filter(
    (p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.001,
  );
}
export function sampleCenterline(points: Cell[], spacing = 4): Cell[] {
  if (!points.length) return [];
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
    for (let j = 1; j <= steps; j++)
      result.push({ x: a.x + ((b.x - a.x) * j) / steps, y: a.y + ((b.y - a.y) * j) / steps });
  }
  return result;
}

// Keep the arrow ahead of the snake, with enough separation to see its face.
// At a wall, slide sideways instead of clamping the arrow back over the head.
export function countdownArrow(head: Cell, direction: Direction): Cell {
  const angle = DIRECTION_LABELS[direction].angle;
  const ux = Math.round(Math.cos(angle)),
    uy = Math.round(Math.sin(angle));
  const width = COLS * CELL,
    height = ROWS * CELL;
  let x = Math.max(12, Math.min(width - 12, head.x + ux * 40));
  let y = Math.max(12, Math.min(height - 12, head.y + uy * 40));
  if (Math.hypot(x - head.x, y - head.y) < 34) {
    if (ux) y = head.y + (head.y + 40 <= height - 12 ? 40 : -40);
    else x = head.x + (head.x + 40 <= width - 12 ? 40 : -40);
  }
  return { x, y };
}
