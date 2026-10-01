import type { Direction } from './types';

// Physical keys win, so WASD works on every keyboard layout (including Thai Kedmanee, where the
// same keys type ไ ฟ ห ก). The typed characters remain as a fallback for virtual keyboards that
// report no physical code.
const byCode: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyA: 'left',
  KeyS: 'down',
  KeyD: 'right',
};
const byKey: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  a: 'left',
  A: 'left',
  s: 'down',
  S: 'down',
  d: 'right',
  D: 'right',
  ไ: 'up',
  ฟ: 'left',
  ห: 'down',
  ก: 'right',
};
type KeyLike = Pick<KeyboardEvent, 'key' | 'code'>;
export const directionForKey = (event: KeyLike): Direction | undefined =>
  byCode[event.code] ?? byKey[event.key];
export const isPauseKey = (event: KeyLike) =>
  event.key === 'Escape' ||
  event.code === 'Escape' ||
  event.code === 'KeyP' ||
  event.key.toLowerCase() === 'p' ||
  event.key === 'ย';
