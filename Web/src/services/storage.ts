import { DEFAULT_SETTINGS } from '../game/types';
import type { GameState, Settings, Word } from '../game/types';
export interface SaveData {
  version: 2;
  settings: Settings;
  bestScore: number;
  played: number;
  learned: Word[];
  tutorialComplete: boolean;
}
const KEY = 'lexisnake:v2';
export const freshSave = (): SaveData => ({
  version: 2,
  settings: { ...DEFAULT_SETTINGS },
  bestScore: 0,
  played: 0,
  learned: [],
  tutorialComplete: false,
});
export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || raw.version !== 2) return freshSave();
    const defaults = freshSave(),
      s = raw.settings ?? {};
    return {
      ...defaults,
      settings: {
        language: s.language === 'th' ? 'th' : 'en',
        skin: ['mint', 'purple', 'fire', 'ocean'].includes(s.skin) ? s.skin : 'mint',
        snakeStyle: s.snakeStyle === 'classic' ? 'classic' : 'smooth',
        showGrid: typeof s.showGrid === 'boolean' ? s.showGrid : true,
        map: [
          'auto',
          'random',
          'midnight',
          'forest',
          'ocean',
          'volcano',
          'desert',
          'space',
          'city',
          'beach',
        ].includes(s.map)
          ? s.map
          : 'random',
        speed: ['slow', 'normal', 'fast', 'expert'].includes(s.speed) ? s.speed : 'slow',
        portalSeconds: [15, 30, 45, 60, 90, 120].includes(s.portalSeconds) ? s.portalSeconds : 60,
        level: ['all', 'easy', 'medium', 'hard', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(
          s.level,
        )
          ? s.level
          : 'all',
        sound: typeof s.sound === 'boolean' ? s.sound : true,
        reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : false,
      },
      bestScore: Number.isFinite(raw.bestScore) ? Math.max(0, raw.bestScore) : 0,
      played: Number.isFinite(raw.played) ? Math.max(0, Math.floor(raw.played)) : 0,
      tutorialComplete: raw.tutorialComplete === true,
      learned: Array.isArray(raw.learned)
        ? raw.learned
            .filter(
              (e: Word) =>
                e &&
                typeof e.word === 'string' &&
                typeof e.meaningTh === 'string' &&
                ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(e.level),
            )
            .slice(-500)
        : [],
    };
  } catch {
    return freshSave();
  }
}
export function writeSave(save: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export function recordRound(save: SaveData, state: GameState): SaveData {
  if (state.tutorial)
    return { ...save, tutorialComplete: state.phase === 'tutorialDone' || save.tutorialComplete };
  const entries = new Map(save.learned.map((e) => [e.word, e]));
  for (const result of state.words) entries.set(result.entry.word, result.entry);
  return {
    ...save,
    bestScore: Math.max(save.bestScore, state.score),
    played: save.played + 1,
    learned: [...entries.values()].slice(-500),
  };
}
