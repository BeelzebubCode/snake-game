import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ChestArt, GardenArt, SnakeMark } from './components/Art';
import Modal from './components/Modal';
import TutorialLesson from './components/TutorialLesson';
import TutorialReview from './components/TutorialReview';
import { getLessons } from './game/tutorial';
import { LanguageProvider, translator, useI18n } from './i18n';
import SettingsPanel from './components/SettingsPanel';
import { loadDictionary, missingLetters } from './data/vocabulary';
import { GameEngine } from './game/engine';
import PhaserBoard from './game/PhaserBoard';
import { DIRECTION_LABELS, SKINS, hex, mapFor } from './game/appearance';
import { CHESTS } from './game/types';
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
function Brand({ onClick }: { onClick?: () => void }) {
  const { t } = useI18n();
  return (
    <button className="brand" onClick={onClick} aria-label={t('home.brand')}>
      <SnakeMark />
      <span>
        lexisnake<span className="brand-dot">.</span>
        <small>{t('home.tagline')}</small>
      </span>
    </button>
  );
}
function Library({ save, onClose }: { save: SaveData; onClose: () => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const entries = save.learned.filter((entry) =>
    (entry.word + ' ' + entry.meaningTh).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Modal title={t('journal.title')} onClose={onClose} wide>
      <p className="subtle">{t('journal.count', { count: save.learned.length })}</p>
      <input
        className="text-input library-search"
        placeholder={t('journal.searchPlaceholder')}
        aria-label={t('journal.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="word-list">
        {entries.length ? (
          entries.map((entry) => (
            <div className="word-entry" key={entry.word}>
              <div>
                <strong>{entry.word}</strong>
                <p lang="th">{entry.meaningTh}</p>
              </div>
              <button
                className="icon-button"
                aria-label={t('common.listenPrefix') + entry.word}
                onClick={() => audio.speak(entry.word)}
              >
                ♪
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span>❀</span>
            <h3>{save.learned.length ? t('journal.noResults') : t('journal.emptyTitle')}</h3>
            <p>
              {' '}
              {t('journal.emptyHint')} <br /> {t('journal.saveHint')}{' '}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
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
  return (
    <div className="home">
      <header className="home-header">
        <Brand />
        <nav aria-label={t('home.navigation')}>
          <button onClick={onLibrary}>
            <span aria-hidden="true">▤</span> {t('home.journal')}{' '}
          </button>
          <button onClick={onSettings}>
            <span aria-hidden="true">☷</span> {t('common.settings')}{' '}
          </button>
        </nav>
      </header>
      <main className="home-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-leaf">❧</span> {t('home.unlock')}{' '}
            </div>
            <h1>
              {' '}
              {t('home.headlineFirst')} <br /> {t('home.headlineSecond')}
              <span className="green-text">{t('home.headlineAccent')}</span>
              <span className="heading-flower" aria-hidden="true">
                ✿
              </span>
            </h1>
            <p className="hero-description">
              {' '}
              {t('home.descriptionFirst')} <br className="desktop-break" />{' '}
              {t('home.descriptionSecond')}{' '}
            </p>
            <div className="hero-actions">
              <button className="button primary play-button" onClick={onPlay}>
                {' '}
                {t('home.play')} <span aria-hidden="true">↗</span>
              </button>
              <button className="text-button" onClick={onTutorial}>
                {' '}
                {t('home.tutorial')} <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="hero-note">
              <span aria-hidden="true">♡</span> {t('home.note')}{' '}
            </div>
          </div>
          <div className="hero-illustration">
            <div className="illustration-halo" />
            <GardenArt />
            <div className="floating-note">
              <span>✦</span>
              <div>
                <strong>{t('home.floatingTitle')}</strong>
                <small>{t('home.floatingDetail')}</small>
              </div>
            </div>
            <span className="art-caption">{t('home.artCaption')}</span>
          </div>
        </section>
        <section className="home-bottom" aria-label={t('home.progressLabel')}>
          <div className="progress-summary">
            <span className="eyebrow">{t('home.progressEyebrow')}</span>
            <h2>{t('home.progressTitle')}</h2>
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
          </div>
          <div className="treasure-guide">
            <div className="treasure-heading">
              <span className="eyebrow">{t('home.lootEyebrow')}</span>
              <span className="subtle">{t('home.lootHint')}</span>
            </div>
            <div className="chest-guide-grid">
              {kinds.map((kind) => (
                <div className={'chest-guide ' + kind} key={kind}>
                  <ChestArt kind={kind} />
                  <span>{t(CHESTS[kind].title)}</span>
                  <strong>
                    +{CHESTS[kind].count} <small>{t('common.letters')}</small>
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>
          LEXISNAKE <span className="footer-separator">/</span> {t('home.tagline')}
        </span>
        <span>
          {' '}
          {t('home.footer')} <span aria-hidden="true">❧</span>
        </span>
      </footer>
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
  useEffect(() => {
    const directions: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right',
    };
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,dialog')
      )
        return;
      const phase = engine.state.phase;
      if (
        (event.key === 'Escape' || event.key.toLowerCase() === 'p') &&
        ['playing', 'countdown'].includes(phase)
      ) {
        event.preventDefault();
        engine.pause();
        audio.stop();
        return;
      }
      if (!['playing', 'countdown'].includes(phase)) return;
      if (directions[event.key]) {
        event.preventDefault();
        if (!event.repeat) engine.turn(directions[event.key]);
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
  const reviewingBag = phase === 'lessonReview' && [2, 3].includes(s.lesson);
  const currentMap = mapFor(s.mapStage, s.settings.map);
  const directionPreview = DIRECTION_LABELS[s.nextDirection];
  return (
    <div
      className={'game-screen' + (phase === 'lessonReview' ? ' reviewing-lesson' : '')}
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
      <main className="game-field" aria-label={t('game.board')} tabIndex={-1}>
        <PhaserBoard engine={engine} />
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
          <strong>
            {s.inventory.length} <small>{t('common.items', { count: s.inventory.length })}</small>
          </strong>
        </div>
        <div className="inventory-strip" aria-label={t('game.collectedLetters')}>
          {s.inventory.length ? (
            s.inventory.map((letter, i) => (
              <span
                className={
                  'letter-tile small' +
                  (reviewingBag && (s.lesson === 2 || i > 0) ? ' tutorial-new-letter' : '')
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
      {phase === 'lessonReview' && (
        <TutorialReview step={s.lesson} onContinue={() => engine.continueLesson()} />
      )}
      <div
        className="touch-controls"
        aria-label={t('controls.touch')}
        hidden={phase === 'lessonReview'}
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
            {!s.tutorial && (
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
    if (!audio.enabled) audio.stop();
    setSaveFailed(!writeSave(save));
  }, [save]);
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
      {modal === 'library' && <Library save={save} onClose={() => setModal(null)} />}
    </LanguageProvider>
  );
}
