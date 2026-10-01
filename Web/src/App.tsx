import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ChestArt, GardenArt, SnakeMark } from './components/Art';
import Modal from './components/Modal';
import TutorialLesson from './components/TutorialLesson';
import TutorialReview from './components/TutorialReview';
import { getLessons } from './game/tutorial';
import { LanguageProvider, translator, useI18n } from './i18n';
import SettingsPanel from './components/SettingsPanel';
import JournalBook from './components/JournalBook';
import { loadDictionary, missingLetters } from './data/vocabulary';
import { GameEngine } from './game/engine';
import PhaserBoard from './game/PhaserBoard';
import { directionForKey, isPauseKey } from './game/input';
import { DIRECTION_LABELS, SKINS, hex, mapFor } from './game/appearance';
import { CHESTS, MAX_LETTERS } from './game/types';
import type { ChestKind, Direction, GameState, Settings } from './game/types';
import { audio } from './services/audio';
import { loadSave, recordRound, writeSave } from './services/storage';
import type { SaveData } from './services/storage';

const format = (value: number) => value.toLocaleString('en-US');
const clock = (ms: number) =>
  Math.max(0, Math.ceil(ms / 1000))
    .toString()
    .padStart(2, '0');
const kinds = Object.keys(CHESTS) as ChestKind[];
const MENU_TILES = ['L', 'E', 'X', 'I', 'W', 'O', 'R', 'D', 'S', 'A'];
function Home({
  save,
  onPlay,
  onTutorial,
  onSettings,
  onLibrary,
}: {
  save: SaveData;
  onPlay: () => void;
  onTutorial: () => void;
  onSettings: () => void;
  onLibrary: () => void;
}) {
  const { t } = useI18n();
  const hasPlayed = save.played > 0 || save.bestScore > 0 || save.learned.length > 0;
  return (
    <div className="menu-screen">
      <div className="menu-sky" aria-hidden="true">
        {MENU_TILES.map((letter, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties}>
            {letter}
          </span>
        ))}
      </div>
      <nav className="menu-corner" aria-label={t('home.navigation')}>
        <button className="menu-tile journal" onClick={onLibrary}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Zm0 15A1.5 1.5 0 0 0 6.5 21H19v-3M9 7.5h6M9 11h6" />
          </svg>
          <span>{t('home.journal')}</span>
        </button>
        <button className="menu-tile settings" onClick={onSettings}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7.4 5.1.1-1.6-.1-1.6 1.8-1.4-1.8-3.1-2.1.8a7.6 7.6 0 0 0-2.8-1.6L13.1 3h-3.6l-.4 2.1A7.6 7.6 0 0 0 6.3 6.7l-2.1-.8-1.8 3.1L4.2 10.4 4.1 12l.1 1.6-1.8 1.4 1.8 3.1 2.1-.8a7.6 7.6 0 0 0 2.8 1.6l.4 2.1h3.6l.4-2.1a7.6 7.6 0 0 0 2.8-1.6l2.1.8 1.8-3.1-1.8-1.4Z" />
          </svg>
          <span>{t('common.settings')}</span>
        </button>
      </nav>
      <main className="menu-stage">
        <section className="menu-panel">
          <div className="menu-logo">
            <SnakeMark />
            <h1>
              lexisnake<span className="brand-dot">.</span>
            </h1>
            <p>{t('home.tagline')}</p>
          </div>
          <div className="menu-buttons">
            <button className="menu-play" onClick={onPlay}>
              <span>{t('home.play')}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5-13-7.5Z" />
              </svg>
            </button>
            <button className="menu-secondary" onClick={onTutorial}>
              <span>{t('home.tutorial')}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <ul className="menu-tips">
            <li>
              <span aria-hidden="true">✦</span> {t('home.unlock')}
            </li>
            <li>
              <span aria-hidden="true">♡</span> {t('home.note')}
            </li>
          </ul>
        </section>
        <section className="menu-art" aria-hidden="true">
          <div className="illustration-halo" />
          <GardenArt />
          <span className="art-caption">{t('home.artCaption')}</span>
        </section>
      </main>
      {hasPlayed && (
        <section className="menu-score" aria-label={t('home.progressTitle')}>
          <div className="menu-score-title">
            <span className="eyebrow">{t('home.progressEyebrow')}</span>
            <strong>{t('home.progressTitle')}</strong>
          </div>
          <div className="home-stats">
            <div>
              <strong>{format(save.bestScore)}</strong>
              <span>{t('common.highScore')}</span>
            </div>
            <div>
              <strong>{save.learned.length}</strong>
              <span>{t('common.wordsFound')}</span>
            </div>
            <div>
              <strong>{save.played}</strong>
              <span>{t('common.runs')}</span>
            </div>
          </div>
        </section>
      )}
      <section className="loot-bar" aria-label={t('home.progressLabel')}>
        <div className="loot-title">
          <span className="eyebrow">{t('home.lootEyebrow')}</span>
          <span className="subtle">{t('home.lootHint')}</span>
        </div>
        <div className="loot-slots">
          {kinds.map((kind) => (
            <div className={'loot-slot ' + kind} key={kind}>
              <ChestArt kind={kind} />
              <span>{t(CHESTS[kind].title)}</span>
              <strong>
                +{CHESTS[kind].count} <small>{t('common.letters')}</small>
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Timer({ remaining, total }: { remaining: number; total: number }) {
  const { t } = useI18n();
  return (
    <div
      className={'timer ' + (remaining < 10000 ? 'urgent' : '')}
      style={{ '--progress': (remaining / total) * 100 + '%' } as CSSProperties}
    >
      <span>{clock(remaining)}</span>
      <small>{t('common.seconds')}</small>
    </div>
  );
}
function GameScreen({
  engine,
  onHome,
  onRecord,
  onSoundToggle,
  soundEnabled,
}: {
  engine: GameEngine;
  onHome: () => void;
  onRecord: (state: GameState) => void;
  onSoundToggle: () => void;
  soundEnabled: boolean;
}) {
  const { t, language } = useI18n();
  const LESSONS = getLessons(language);
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [draft, setDraft] = useState(''),
    [revivalDraft, setRevivalDraft] = useState(''),
    [leave, setLeave] = useState(false),
    [speechError, setSpeechError] = useState(''),
    [inputFeedback, setInputFeedback] = useState('');
  const playRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef(onRecord);
  recordRef.current = onRecord;
  const previousPhase = useRef(s.phase);
  useEffect(() => {
    if (s.phase !== previousPhase.current) setInputFeedback('');
    if (['gameOver', 'tutorialDone'].includes(s.phase)) recordRef.current(s);
    if (s.phase === 'paused') audio.stop();
    if (
      s.phase === 'challenge' &&
      previousPhase.current !== 'paused' &&
      previousPhase.current !== 'challenge' &&
      !(s.tutorial && previousPhase.current === 'lesson')
    )
      setDraft('');
    if (
      s.phase === 'revive' &&
      previousPhase.current !== 'paused' &&
      previousPhase.current !== 'revive'
    )
      setRevivalDraft('');
    previousPhase.current = s.phase;
  }, [s.phase, s]);
  const musicOn = soundEnabled && !['paused', 'gameOver', 'tutorialDone'].includes(s.phase);
  useEffect(() => {
    audio.setMusic(musicOn);
  }, [musicOn]);
  useEffect(() => () => audio.setMusic(false), []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,dialog')
      )
        return;
      const phase = engine.state.phase;
      if (isPauseKey(event) && ['playing', 'countdown'].includes(phase)) {
        event.preventDefault();
        engine.pause();
        audio.stop();
        return;
      }
      if (!['playing', 'countdown'].includes(phase)) return;
      const direction = directionForKey(event);
      if (direction) {
        event.preventDefault();
        if (!event.repeat) engine.turn(direction);
      }
      if (event.code === 'Space' || event.key === 'Shift') {
        event.preventDefault();
        engine.setBoost(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'Shift') engine.setBoost(false);
    };
    const hide = () => {
      if (document.hidden) {
        engine.pause();
        audio.stop();
      }
    };
    const blur = () => {
      engine.pause();
      audio.stop();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    const off = engine.onSound((name) => audio.play(name));
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hide);
      off();
      audio.stop();
    };
  }, [engine]);
  const askHome = () => {
    engine.pause();
    audio.stop();
    setLeave(true);
  };
  const changeDraft = (input: string) => {
    const next = input.toUpperCase().trim();
    if (next && !/^[A-Z]+$/.test(next)) {
      setInputFeedback(t('input.englishOnly'));
      return;
    }
    const missing = missingLetters(next, s.inventory);
    if (missing.length) {
      const counts = new Map<string, number>();
      missing.forEach((letter) => counts.set(letter, (counts.get(letter) ?? 0) + 1));
      const letters = [...counts]
        .map(([letter, count]) => (count > 1 ? `${letter} ×${count}` : letter))
        .join(', ');
      setInputFeedback(s.inventory.length ? t('input.missing', { letters }) : t('input.empty'));
      return;
    }
    setDraft(next.slice(0, 24));
    setInputFeedback('');
    engine.clearWordError();
  };
  const wordFeedback =
    inputFeedback || s.error || (s.inventory.length === 0 ? t('input.empty') : '');
  const used: Record<string, number> = {};
  for (const letter of draft) used[letter] = (used[letter] ?? 0) + 1;
  const currentCounts: Record<string, number> = {};
  const spelling = (event: FormEvent) => {
    event.preventDefault();
    setInputFeedback('');
    engine.submitWord(draft);
  };
  const phase = s.phase;
  const reviewingBag = phase === 'lessonReview' && [2, 3, 6].includes(s.lesson);
  const currentMap = mapFor(s.mapStage, s.settings.map);
  const directionPreview = DIRECTION_LABELS[s.nextDirection];
  return (
    <div
      className={
        'game-screen' +
        (phase === 'lessonReview' ? ' reviewing-lesson' : '') +
        (phase === 'warp' ? ' warping' : '')
      }
      ref={playRef}
      data-map={currentMap.id}
      style={
        {
          '--map-accent': hex(currentMap.accent),
          '--board-bg': hex(currentMap.background),
        } as CSSProperties
      }
    >
      <header className="game-header">
        <div className="game-brand">
          <button className="icon-button" aria-label={t('common.home')} onClick={askHome}>
            ⌂
          </button>
          <span
            className="map-badge"
            title={s.settings.map === 'auto' ? t('game.mapProgress') : t('game.selectedMap')}
          >
            {currentMap.name}
          </span>
          <span className="game-title">
            lexisnake<span>.</span>
          </span>
          {s.tutorial && <span className="pill">{t('common.tutorial')}</span>}
        </div>
        <div className="game-stats">
          <div className="score-stat">
            <span>{t('common.score')}</span>
            <strong data-testid="score">{format(s.score)}</strong>
          </div>
          <div className="hearts" role="img" aria-label={t('game.revives', { count: s.hearts })}>
            {[0, 1, 2].map((i) => (
              <span className={i < s.hearts ? '' : 'spent'} aria-hidden="true" key={i}>
                ♥
              </span>
            ))}
          </div>
        </div>
        <div className="game-actions">
          <span className="portal-clock">
            <i />{' '}
            {s.tutorial
              ? t('game.practiceStatus')
              : s.portal
                ? t('game.portalOpen')
                : t('game.portalCountdown', { seconds: clock(s.nextPortalAt - s.elapsed) })}
          </span>
          <button
            className="icon-button"
            aria-label={soundEnabled ? t('game.mute') : t('game.unmute')}
            aria-pressed={soundEnabled}
            onClick={onSoundToggle}
          >
            {soundEnabled ? '♪' : '♩'}
          </button>
          <button
            className="icon-button fullscreen-button"
            aria-label={t('game.fullscreen')}
            onClick={() => {
              if (!document.fullscreenElement)
                void playRef.current?.requestFullscreen?.().catch(() => {});
              else void document.exitFullscreen().catch(() => {});
            }}
          >
            ⛶
          </button>
          <button
            className="icon-button pause-button"
            aria-label={t('game.pause')}
            onClick={() => {
              engine.pause();
              audio.stop();
            }}
          >
            Ⅱ
          </button>
        </div>
      </header>
      <main className="game-field" aria-label={t('game.board')} tabIndex={-1}>
        <PhaserBoard engine={engine} />
        {s.tutorial && ['playing', 'countdown'].includes(phase) && (
          <aside className="tutorial-task" aria-label={t('tutorial.objective')}>
            <span className="tutorial-task-step">
              {s.lesson + 1} / {LESSONS.length}
            </span>
            <div className="tutorial-objective">
              <p>{LESSONS[s.lesson].task}</p>
              {s.lesson === 0 && (
                <ol className="steering-checklist" aria-label={t('tutorial.directionsLabel')}>
                  {(['up', 'left', 'down', 'right'] as Direction[]).map((direction, index) => (
                    <li
                      key={direction}
                      className={s.practicedDirections.includes(direction) ? 'done' : ''}
                      aria-current={s.practicedDirections.length === index ? 'step' : undefined}
                    >
                      {s.practicedDirections.includes(direction)
                        ? '✓'
                        : ['W ↑', 'A ←', 'S ↓', 'D →'][index]}{' '}
                      {t(DIRECTION_LABELS[direction].name)}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <button className="text-button" onClick={() => engine.showLesson()}>
              {' '}
              {t('tutorial.instructions')}{' '}
            </button>
          </aside>
        )}
        {phase === 'lessonReview' && (
          <TutorialReview step={s.lesson} onContinue={() => engine.continueLesson()} />
        )}
        {s.toast && phase === 'playing' && (
          <div className="toast" role="status" key={s.toast + s.toastUntil}>
            {s.toast}
          </div>
        )}
        {phase === 'warp' && (
          <div className={'warp-overlay' + (s.forced ? ' forced' : '')} role="status">
            <div className="warp-ring" aria-hidden="true" />
            <strong>{s.forced ? t('warp.forced') : t('warp.enter')}</strong>
          </div>
        )}
        {phase === 'countdown' && (
          <div className="countdown-overlay">
            <div className="countdown-card">
              <div className="countdown-number" key={Math.ceil(s.countdown / 1000)}>
                {Math.ceil(s.countdown / 1000) || 1}
              </div>
              <p>{s.notice || t('game.getReady')}</p>
              <div
                className="direction-preview"
                role="status"
                data-testid="direction-preview"
                aria-label={t('game.nextDirection') + t(directionPreview.name)}
              >
                <strong aria-hidden="true">{directionPreview.arrow}</strong>
                <span>
                  {t('game.direction')} {t(directionPreview.name)}
                </span>
              </div>
              <small>{t('game.countdownHint')}</small>
              <span className="countdown-map">{currentMap.name}</span>
            </div>
          </div>
        )}
      </main>
      <footer
        className={'game-tray' + (reviewingBag ? ' tutorial-bag-focus' : '')}
        data-reduced-motion={s.settings.reducedMotion}
        aria-label={t('game.inventory')}
      >
        <div className="tray-label">
          <span>{t('game.inventory')}</span>
          <strong className={s.inventory.length >= 20 ? 'bag-heavy' : ''}>
            {s.inventory.length}
            {!s.tutorial && <span className="bag-cap">/{MAX_LETTERS}</span>}{' '}
            <small>{t('common.items', { count: s.inventory.length })}</small>
          </strong>
        </div>
        <div className="inventory-strip" aria-label={t('game.collectedLetters')}>
          {s.inventory.length ? (
            s.inventory.map((letter, i) => (
              <span
                className={
                  'letter-tile small' +
                  (reviewingBag && s.lesson !== 6 && (s.lesson === 2 || i > 0)
                    ? ' tutorial-new-letter'
                    : '')
                }
                key={i}
              >
                {letter}
              </span>
            ))
          ) : (
            <span className="empty-inventory">{t('game.emptyInventory')}</span>
          )}
        </div>
        <div className="control-hint">
          <span>
            <kbd>W A S D</kbd> {t('controls.arrows')}{' '}
          </span>
          <span>
            <kbd>Shift</kbd> / <kbd>Space</kbd> {t('controls.boostHint')} <kbd>P</kbd>{' '}
            {t('controls.pause')}{' '}
          </span>
        </div>
      </footer>
      <div
        className="touch-controls"
        aria-label={t('controls.touch')}
        data-ghost={phase === 'lessonReview'}
      >
        <div className="dpad">
          <button
            aria-label={t('controls.up')}
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('up');
            }}
          >
            ↑
          </button>
          <button
            aria-label={t('controls.left')}
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('left');
            }}
          >
            ←
          </button>
          <button
            aria-label={t('controls.down')}
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('down');
            }}
          >
            ↓
          </button>
          <button
            aria-label={t('controls.right')}
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('right');
            }}
          >
            →
          </button>
        </div>
        <button
          className="boost-button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            engine.setBoost(true);
          }}
          onPointerUp={() => engine.setBoost(false)}
          onPointerCancel={() => engine.setBoost(false)}
          onLostPointerCapture={() => engine.setBoost(false)}
        >
          {' '}
          {t('controls.boost')}{' '}
        </button>
      </div>

      {phase === 'lesson' && (
        <TutorialLesson
          step={s.lesson}
          notice={s.notice}
          onContinue={() => engine.startLesson()}
          onHome={onHome}
        />
      )}
      {phase === 'challenge' && (
        <Modal title={t('portal.title')} wide className="challenge-modal">
          <div className="challenge-heading">
            <div>
              <span className="eyebrow">{t('portal.eyebrow')}</span>
              <p className="subtle">
                {s.tutorial ? t('portal.tutorialTask') : t('portal.description')}
              </p>
              {s.tutorial && (
                <button className="text-button" onClick={() => engine.showLesson()}>
                  {' '}
                  {t('tutorial.instructions')}{' '}
                </button>
              )}
            </div>
            <Timer remaining={s.challengeRemaining} total={s.settings.portalSeconds * 1000} />
          </div>
          <form onSubmit={spelling}>
            <label className="sr-only" htmlFor="word-input">
              {' '}
              {t('portal.inputLabel')}{' '}
            </label>
            <input
              id="word-input"
              className="word-input"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={24}
              readOnly={s.inventory.length === 0}
              placeholder={
                s.inventory.length === 0
                  ? t('portal.emptyPlaceholder')
                  : s.tutorial
                    ? 'CAT'
                    : t('portal.placeholder')
              }
              aria-describedby="word-input-help word-input-feedback"
              aria-invalid={Boolean(wordFeedback)}
              value={draft}
              onChange={(e) => changeDraft(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const input = e.currentTarget;
                const start = input.selectionStart ?? draft.length;
                const end = input.selectionEnd ?? draft.length;
                changeDraft(
                  draft.slice(0, start) + e.clipboardData.getData('text') + draft.slice(end),
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  changeDraft('');
                }
              }}
            />
            <p id="word-input-help" className="subtle">
              {' '}
              {t('portal.inputHelp')}{' '}
            </p>
            <p
              id="word-input-feedback"
              className="input-feedback"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="word-feedback"
            >
              {wordFeedback || '\u00a0'}
            </p>
            <div className="challenge-inventory" aria-label={t('portal.letterSelection')}>
              {s.inventory.map((letter, i) => {
                currentCounts[letter] = (currentCounts[letter] ?? 0) + 1;
                const selected = currentCounts[letter] <= (used[letter] ?? 0);
                return (
                  <button
                    key={i}
                    className={'letter-tile ' + (selected ? 'selected' : '')}
                    type="button"
                    disabled={selected || draft.length >= 24}
                    onClick={() => changeDraft(draft + letter)}
                    aria-label={t('portal.selectPrefix') + letter}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <div className="word-tools">
              <button
                type="button"
                className="text-button"
                onClick={() => changeDraft(draft.slice(0, -1))}
              >
                {' '}
                {t('portal.delete')}{' '}
              </button>
              <button type="button" className="text-button" onClick={() => changeDraft('')}>
                {' '}
                {t('portal.clear')}{' '}
              </button>
              <button
                type="button"
                className="text-button hint-button"
                onClick={() => {
                  setInputFeedback('');
                  const hint = engine.hint();
                  if (hint) changeDraft(hint);
                }}
              >
                {' '}
                {t('portal.hint')}{' '}
              </button>
            </div>
            <button type="submit" className="button primary full" disabled={!draft}>
              {' '}
              {t('portal.submit')} <span>↗</span>
            </button>
          </form>
          <div className="modal-bottom-actions">
            <button className="text-button" onClick={() => engine.pause()}>
              {' '}
              {t('common.pause')}{' '}
            </button>
            {!s.tutorial && !s.forced && (
              <button className="text-button" onClick={() => engine.leaveChallenge()}>
                {' '}
                {t('portal.leave')}{' '}
              </button>
            )}
          </div>
        </Modal>
      )}
      {phase === 'wordResult' && s.result && (
        <Modal title={t('word.success')} className="result-modal">
          <span className="result-flower" aria-hidden="true">
            ✿
          </span>
          <strong className="result-word">{s.result.entry.word}</strong>
          <span className="eyebrow">{t('word.thaiMeaning')}</span>
          <p className="result-meaning" lang="th">
            {s.result.entry.meaningTh}
          </p>
          <span className="points-pill">
            +{format(s.result.points)} {t('common.score')}
          </span>
          <button
            className="text-button centered"
            onClick={() => {
              setSpeechError('');
              audio.speak(s.result!.entry.word, () => setSpeechError(t('word.speechUnavailable')));
            }}
          >
            {' '}
            {t('word.pronounce')}{' '}
          </button>
          {speechError && (
            <p className="subtle" role="status">
              {speechError}
            </p>
          )}
          <button
            className="button primary full"
            onClick={() => {
              audio.stop();
              engine.continueWord();
            }}
          >
            {s.tutorial ? t('word.tutorialContinue') : t('word.continue')} →
          </button>
        </Modal>
      )}
      {phase === 'chest' && s.reward && (
        <Modal
          title={
            !s.reward.opened
              ? t('chest.ready')
              : s.reward.revealed
                ? t('chest.revealed')
                : t('chest.opening')
          }
          className={'chest-modal ' + s.reward.kind}
        >
          <span className="eyebrow">
            {t(CHESTS[s.reward.kind].title)} · {CHESTS[s.reward.kind].count}{' '}
            {t('common.letterLabel')}{' '}
          </span>
          <div
            className={
              'chest-display ' + (s.reward.revealed ? 'revealed' : s.reward.opened ? 'rolling' : '')
            }
          >
            <div className="reward-aura" />
            <ChestArt kind={s.reward.kind} open={s.reward.revealed} />
          </div>
          {s.reward.opened && (
            <div
              className="reward-letters"
              aria-label={
                s.reward.revealed
                  ? t('chest.receivedPrefix') + s.reward.letters.join(' ')
                  : t('chest.rollingLabel')
              }
              aria-live="polite"
            >
              {s.reward.letters.map((letter, i) => (
                <span
                  className={'letter-tile ' + (s.reward!.revealed ? 'reward-reveal' : 'shuffling')}
                  style={{ '--delay': i * 90 + 'ms' } as CSSProperties}
                  key={i}
                >
                  {s.reward!.revealed
                    ? letter
                    : String.fromCharCode(65 + ((Math.floor(s.reward!.elapsed / 80) + i * 7) % 26))}
                </span>
              ))}
            </div>
          )}
          <p className="subtle">{s.tutorial ? t('chest.tutorialHint') : t('chest.paused')}</p>
          {!s.reward.opened ? (
            <button className="button primary full" onClick={() => engine.openTutorialChest()}>
              {' '}
              {t('chest.openSilver')}{' '}
            </button>
          ) : (
            <button
              className="button primary full"
              disabled={!s.reward.revealed}
              onClick={() => engine.claimChest()}
            >
              {' '}
              {t('chest.claim', { count: CHESTS[s.reward.kind].count })} <span>✓</span>
            </button>
          )}
        </Modal>
      )}
      {phase === 'revive' && s.reviveWord && (
        <Modal title={t('revive.title')} className="revive-modal">
          <div className="revive-heading">
            <span className="revive-heart" aria-hidden="true">
              ♡
            </span>
            <Timer remaining={s.reviveRemaining} total={30_000} />
          </div>
          <p className="subtle">{t('revive.hearts', { reason: s.deathReason, count: s.hearts })}</p>
          <p className="revive-question">
            {' '}
            {t('revive.prompt')} <strong lang="th">“{s.reviveWord.meaningTh}”</strong>
            <br /> {t('revive.question')}{' '}
          </p>
          <span className="spelling-hint">
            {s.reviveWord.word[0]} {'_ '.repeat(s.reviveWord.word.length - 1)}{' '}
            <small>
              ({s.reviveWord.word.length} {t('revive.lengthSuffix')}
            </small>
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              engine.submitRevival(revivalDraft);
            }}
          >
            <input
              className="text-input revival-input"
              aria-label={t('revive.inputLabel')}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={t('revive.placeholder')}
              value={revivalDraft}
              maxLength={24}
              onChange={(e) => setRevivalDraft(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            />
            <p className="form-error" role="status">
              {s.error || '\u00a0'}
            </p>
            <div className="revive-cost">
              <span>{t('revive.heartCost')}</span>
              <span>{t('revive.scoreCost')}</span>
            </div>
            <button className="button primary full" disabled={!revivalDraft}>
              {' '}
              {t('revive.submit')}{' '}
            </button>
          </form>
          <button className="text-button centered" onClick={() => engine.pause()}>
            {' '}
            {t('common.pause')}{' '}
          </button>
          <button className="text-button centered subdued" onClick={() => engine.endRound()}>
            {' '}
            {t('revive.end')}{' '}
          </button>
        </Modal>
      )}
      {phase === 'paused' && !leave && (
        <Modal title={t('pause.title')}>
          <div className="modal-illustration">
            <span className="cloud-symbol" aria-hidden="true">
              ☁
            </span>
          </div>
          <p className="modal-description">{t('pause.description')}</p>
          <button
            className="button primary full"
            onClick={() => {
              audio.unlock();
              engine.resume();
            }}
          >
            {' '}
            {t('pause.resume')}{' '}
          </button>
          <button className="button secondary full" onClick={() => setLeave(true)}>
            {' '}
            {t('common.home')}{' '}
          </button>
        </Modal>
      )}
      {leave && (
        <Modal title={t('quit.title')} onClose={() => setLeave(false)}>
          <p className="modal-description">{t('quit.description')}</p>
          <button className="button primary full" onClick={onHome}>
            {' '}
            {t('quit.confirm')}{' '}
          </button>
          <button className="button secondary full" onClick={() => setLeave(false)}>
            {' '}
            {t('quit.cancel')}{' '}
          </button>
        </Modal>
      )}
      {phase === 'gameOver' && (
        <Modal title={t('gameOver.title')} className="gameover-modal">
          <div className="modal-illustration">
            <SnakeMark large />
          </div>
          <span className="eyebrow">{t('gameOver.eyebrow')}</span>
          <div className="final-score">
            {format(s.score)}
            <small>{t('common.score')}</small>
          </div>
          <p className="subtle">
            {t('gameOver.words', { reason: s.deathReason, count: s.words.length })}
          </p>
          {s.words.length > 0 && (
            <div className="round-words">
              {s.words.map((word, i) => (
                <span key={i}>{word.entry.word}</span>
              ))}
            </div>
          )}
          <button className="button primary full" onClick={onHome}>
            {' '}
            {t('gameOver.home')}{' '}
          </button>
        </Modal>
      )}
      {phase === 'tutorialDone' && (
        <Modal title={t('tutorial.doneTitle')} className="result-modal">
          <span className="result-flower">✿</span>
          <p className="modal-description">
            {' '}
            {t('tutorial.donePath')} <br /> {t('tutorial.doneDetail')}{' '}
          </p>
          <div className="mini-chest-guide">
            {kinds.map((kind) => (
              <div key={kind}>
                <ChestArt kind={kind} />
                <span>+{CHESTS[kind].count}</span>
              </div>
            ))}
          </div>
          <div className="soft-note"> {t('tutorial.doneHearts')} </div>
          <button className="button primary full" onClick={onHome}>
            {' '}
            {t('tutorial.doneHome')}{' '}
          </button>
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  const [save, setSave] = useState(loadSave);
  const t = translator(save.settings.language);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [modal, setModal] = useState<'experience' | 'settings' | 'library' | null>(null);
  const [dictionaryStatus, setDictionaryStatus] = useState<'loading' | 'ready' | 'fallback'>(
    'loading',
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const recorded = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    void loadDictionary().then((ok) => {
      if (active) setDictionaryStatus(ok ? 'ready' : 'fallback');
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    audio.enabled = save.settings.sound;
    if (!audio.enabled) {
      audio.stop();
      audio.setMusic(false);
    }
    setSaveFailed(!writeSave(save));
  }, [save]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('button:not(:disabled):not([data-silent])')
      )
        audio.play('click');
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      document.documentElement.classList.toggle(
        'reduce-motion',
        save.settings.reducedMotion || media.matches,
      );
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [save.settings.reducedMotion]);
  useEffect(() => {
    const skin = SKINS[save.settings.skin];
    document.documentElement.style.setProperty('--snake-head', hex(skin.head));
    document.documentElement.style.setProperty('--snake-tail', hex(skin.tail));
  }, [save.settings.skin]);
  const record = useCallback((state: GameState) => {
    if (recorded.current.has(state.sessionId)) return;
    recorded.current.add(state.sessionId);
    setSave((current) => recordRound(current, state));
  }, []);
  const start = (tutorial: boolean) => {
    audio.unlock();
    audio.play('collect');
    const settings = {
      ...save.settings,
      reducedMotion:
        save.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    setEngine(new GameEngine(settings, tutorial));
    setModal(null);
  };
  const home = () => {
    if (engine) {
      record(engine.state);
      engine.dispose();
    }
    audio.stop();
    setEngine(null);
    setModal(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
  return (
    <LanguageProvider language={save.settings.language}>
      {engine ? (
        <GameScreen
          engine={engine}
          onHome={home}
          onRecord={record}
          soundEnabled={save.settings.sound}
          onSoundToggle={() =>
            setSave((current) => ({
              ...current,
              settings: { ...current.settings, sound: !current.settings.sound },
            }))
          }
        />
      ) : (
        <Home
          save={save}
          onPlay={() => {
            audio.unlock();
            setModal('experience');
          }}
          onTutorial={() => start(true)}
          onSettings={() => setModal('settings')}
          onLibrary={() => setModal('library')}
        />
      )}
      {!engine && dictionaryStatus === 'fallback' && (
        <p className="app-notice" role="status">
          {' '}
          {t('app.dictionaryFallback')}{' '}
          <button
            onClick={() => {
              setDictionaryStatus('loading');
              void loadDictionary().then((ok) => setDictionaryStatus(ok ? 'ready' : 'fallback'));
            }}
          >
            {' '}
            {t('app.retryDictionary')}{' '}
          </button>
        </p>
      )}
      {saveFailed && (
        <p className="app-notice" role="status">
          {' '}
          {t('app.saveFailed')}{' '}
        </p>
      )}
      {modal === 'experience' && (
        <Modal title={t('experience.title')} onClose={() => setModal(null)} wide>
          <p className="subtle">{t('experience.description')}</p>
          <div className="experience-options">
            <button className="experience-card" onClick={() => start(true)}>
              <span className="experience-icon">❧</span>
              <strong>{t('experience.new')}</strong>
              <p>
                {' '}
                {t('experience.newDetailFirst')} <br /> {t('experience.newDetailSecond')}{' '}
              </p>
              <span className="experience-link">{t('experience.newAction')}</span>
            </button>
            <button className="experience-card returning" onClick={() => start(false)}>
              <span className="experience-icon">✦</span>
              <strong>{t('experience.returning')}</strong>
              <p>
                {' '}
                {t('experience.returningFirst')} <br /> {t('experience.returningSecond')}{' '}
              </p>
              <span className="experience-link">{t('experience.returningAction')}</span>
            </button>
          </div>
          {dictionaryStatus === 'loading' && <p className="subtle">{t('experience.loading')}</p>}
        </Modal>
      )}
      {modal === 'settings' && (
        <SettingsPanel
          settings={save.settings}
          onClose={() => setModal(null)}
          onSave={(settings) => {
            setSave((current) => ({ ...current, settings }));
            setModal(null);
          }}
        />
      )}
      {modal === 'library' && <JournalBook save={save} onClose={() => setModal(null)} />}
    </LanguageProvider>
  );
}
