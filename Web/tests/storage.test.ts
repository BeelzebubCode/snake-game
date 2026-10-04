import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freshSave, loadSave, recordRound, writeSave } from '../src/services/storage';
import { GameEngine } from '../src/game/engine';
describe('versioned local save', () => {
  beforeEach(() => {
    const entries = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    });
  });
  it('recovers defaults from corrupt or invalid data', () => {
    localStorage.setItem('lexisnake:v2', 'bad JSON');
    expect(loadSave()).toEqual(freshSave());
    localStorage.setItem(
      'lexisnake:v2',
      JSON.stringify({
        version: 2,
        settings: { speed: 'turbo', portalSeconds: -1 },
        bestScore: -5,
        learned: [null, {}],
      }),
    );
    const save = loadSave();
    expect(save.settings.speed).toBe('slow');
    expect(save.settings.portalSeconds).toBe(60);
    expect(save.bestScore).toBe(0);
    expect(save.learned).toEqual([]);
  });
  it('round-trips settings and reports blocked storage', () => {
    const save = freshSave();
    save.settings.portalSeconds = 120;
    save.settings.speed = 'fast';
    save.settings.language = 'th';
    expect(writeSave(save)).toBe(true);
    expect(loadSave().settings).toEqual(save.settings);
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Blocked');
      },
      getItem: () => {
        throw new Error('Blocked');
      },
    });
    expect(writeSave(save)).toBe(false);
    expect(loadSave()).toEqual(freshSave());
  });
  it('uses English for new saves and invalid languages while preserving progress', () => {
    expect(freshSave().settings.language).toBe('en');
    localStorage.setItem(
      'lexisnake:v2',
      JSON.stringify({ version: 2, settings: { language: 'unknown' }, bestScore: 7200, played: 9 }),
    );
    const save = loadSave();
    expect(save.settings.language).toBe('en');
    expect(save.bestScore).toBe(7200);
    expect(save.played).toBe(9);
    save.settings.language = 'th';
    writeSave(save);
    expect(loadSave().settings.language).toBe('th');
  });
  it('records scores and unique learned words while keeping tutorial stats separate', () => {
    const e = new GameEngine();
    e.state.phase = 'challenge';
    e.state.inventory = ['C', 'A', 'T'];
    e.submitWord('CAT');
    const save = recordRound(freshSave(), e.state);
    expect(save.played).toBe(1);
    expect(save.bestScore).toBe(450);
    expect(save.learned).toHaveLength(1);
    expect(recordRound(save, e.state).learned).toHaveLength(1);
    e.state.tutorial = true;
    e.state.phase = 'tutorialDone';
    const tutorial = recordRound(save, e.state);
    expect(tutorial.tutorialComplete).toBe(true);
    expect(tutorial.played).toBe(1);
  });

  it('migrates older V2 settings without resetting player progress', () => {
    localStorage.setItem(
      'lexisnake:v2',
      JSON.stringify({
        version: 2,
        settings: { speed: 'normal', portalSeconds: 90, sound: false },
        bestScore: 4500,
        played: 12,
        tutorialComplete: true,
        learned: [{ word: 'CAT', meaningTh: 'แมว', level: 'A1' }],
      }),
    );
    const save = loadSave();
    expect(save.settings).toMatchObject({
      language: 'en',
      skin: 'mint',
      snakeStyle: 'smooth',
      showGrid: true,
      map: 'random',
      speed: 'normal',
      portalSeconds: 90,
      sound: false,
    });
    expect(save.bestScore).toBe(4500);
    expect(save.played).toBe(12);
    expect(save.tutorialComplete).toBe(true);
    expect(save.learned).toHaveLength(1);
    Object.assign(save.settings, {
      skin: 'fire',
      snakeStyle: 'classic',
      showGrid: false,
      map: 'volcano',
      speed: 'expert',
      level: 'medium',
      portalSeconds: 45,
    });
    expect(writeSave(save)).toBe(true);
    expect(loadSave()).toEqual(save);
  });
});
