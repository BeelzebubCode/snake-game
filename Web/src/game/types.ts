import type { MessageKey } from '../i18n/en';
export type Language = 'en' | 'th';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Speed = 'slow' | 'normal' | 'fast' | 'expert';
export type SkinId = 'mint' | 'purple' | 'fire' | 'ocean';
export type MapChoice = 'auto' | 'random' | 'midnight' | 'forest' | 'ocean' | 'volcano' | 'desert' | 'space' | 'city' | 'beach';
export type VocabularyFilter = Level | 'all' | 'easy' | 'medium' | 'hard';
export type ChestKind = 'silver' | 'gold' | 'purple' | 'red';
export type Phase =
  | 'lesson'
  | 'lessonReview'
  | 'countdown'
  | 'playing'
  | 'warp'
  | 'challenge'
  | 'wordResult'
  | 'chest'
  | 'revive'
  | 'paused'
  | 'gameOver'
  | 'tutorialDone';
export interface Cell {
  x: number;
  y: number;
}
export interface Settings {
  language: Language;
  speed: Speed;
  portalSeconds: number;
  level: VocabularyFilter;
  skin: SkinId;
  snakeStyle: 'smooth' | 'classic';
  showGrid: boolean;
  map: MapChoice;
  sound: boolean;
  reducedMotion: boolean;
}
export interface Word {
  word: string;
  meaningTh: string;
  level: Level;
}
export interface Letter extends Cell {
  id: number;
  letter: string;
  expiresAt: number;
}
export interface Chest extends Cell {
  id: number;
  kind: ChestKind;
  expiresAt: number;
}
export interface Portal extends Cell {
  expiresAt: number;
}
export interface Obstacle extends Cell {
  id: number;
  expiresAt: number;
}
export interface Reward {
  kind: ChestKind;
  letters: string[];
  elapsed: number;
  revealed: boolean;
  opened: boolean;
}
export interface WordResult {
  entry: Word;
  points: number;
}
export interface GameState {
  phase: Phase;
  settings: Settings;
  snake: Cell[];
  previousSnake: Cell[];
  direction: Direction;
  nextDirection: Direction;
  mapStage: number;
  letters: Letter[];
  chest: Chest | null;
  portal: Portal | null;
  obstacles: Obstacle[];
  inventory: string[];
  score: number;
  hearts: number;
  elapsed: number;
  nextPortalAt: number;
  nextChestAt: number;
  countdown: number;
  challengeRemaining: number;
  warpRemaining: number;
  /** True when a full inventory, not the snake, pulled the player into the gate. */
  forced: boolean;
  toast: string;
  toastUntil: number;
  reviveRemaining: number;
  reviveWord: Word | null;
  spawnPortal: { x: number; y: number; type: 'start' | 'revive' } | null;
  reward: Reward | null;
  result: WordResult | null;
  words: WordResult[];
  error: string;
  notice: string;
  tutorial: boolean;
  lesson: number;
  practicedDirections: Direction[];
  deathReason: string;
  sessionId: string;
}
export const COLS = 40,
  ROWS = 22,
  CELL = 32;
export const LETTER_LIFETIME = 30_000,
  LETTER_COUNT = 3,
  REVIVE_TIME = 30_000,
  OBSTACLE_COUNT = 5,
  OBSTACLE_LIFETIME = 40_000,
  OBSTACLE_SCORE_PENALTY = 50,
  MAX_LETTERS = 30,
  FORCED_GATE_MIN = 20,
  FORCED_GATE_SPREAD = 6,
  WARP_TIME = 1_200,
  TIMEOUT_PENALTY = 100,
  REVIVE_PENALTY = 100,
  REVIVE_LETTER_LOSS = 5;
export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  speed: 'slow',
  skin: 'mint',
  snakeStyle: 'smooth',
  showGrid: true,
  map: 'auto',
  portalSeconds: 60,
  level: 'all',
  sound: true,
  reducedMotion: false,
};
export const SPEEDS: Record<Speed, number> = { slow: 6, normal: 8, fast: 12, expert: 16 };
export const CHESTS: Record<
  ChestKind,
  { title: MessageKey; count: number; color: string; weight: number }
> = {
  silver: { title: 'chest.silver', count: 2, color: '#becbde', weight: 45 },
  gold: { title: 'chest.gold', count: 3, color: '#ffc542', weight: 30 },
  purple: { title: 'chest.purple', count: 4, color: '#b778ff', weight: 18 },
  red: { title: 'chest.red', count: 5, color: '#ff617d', weight: 7 },
};
