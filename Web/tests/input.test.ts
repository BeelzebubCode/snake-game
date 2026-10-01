import { describe, expect, it } from 'vitest';
import { directionForKey, isPauseKey } from '../src/game/input';

describe('keyboard layouts', () => {
  it('steers with physical WASD whatever character the layout types', () => {
    expect(directionForKey({ key: 'ไ', code: 'KeyW' })).toBe('up');
    expect(directionForKey({ key: 'ฟ', code: 'KeyA' })).toBe('left');
    expect(directionForKey({ key: 'ห', code: 'KeyS' })).toBe('down');
    expect(directionForKey({ key: 'ก', code: 'KeyD' })).toBe('right');
    // Shifted Thai characters and Caps Lock still follow the physical key.
    expect(directionForKey({ key: 'ฏ', code: 'KeyD' })).toBe('right');
    expect(directionForKey({ key: 'W', code: 'KeyW' })).toBe('up');
  });
  it('falls back to typed characters when no physical code is reported', () => {
    expect(directionForKey({ key: 'ไ', code: '' })).toBe('up');
    expect(directionForKey({ key: 'ฟ', code: '' })).toBe('left');
    expect(directionForKey({ key: 'ห', code: '' })).toBe('down');
    expect(directionForKey({ key: 'ก', code: '' })).toBe('right');
    expect(directionForKey({ key: 'a', code: '' })).toBe('left');
  });
  it('keeps the arrow keys and ignores everything else', () => {
    expect(directionForKey({ key: 'ArrowUp', code: 'ArrowUp' })).toBe('up');
    expect(directionForKey({ key: 'ArrowRight', code: 'ArrowRight' })).toBe('right');
    expect(directionForKey({ key: 'q', code: 'KeyQ' })).toBeUndefined();
    expect(directionForKey({ key: 'ๆ', code: 'KeyQ' })).toBeUndefined();
  });
  it('pauses with P (including its Thai key) and Escape', () => {
    expect(isPauseKey({ key: 'p', code: 'KeyP' })).toBe(true);
    expect(isPauseKey({ key: 'ย', code: 'KeyP' })).toBe(true);
    expect(isPauseKey({ key: 'Escape', code: 'Escape' })).toBe(true);
    expect(isPauseKey({ key: 'o', code: 'KeyO' })).toBe(false);
  });
});
