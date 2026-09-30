import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ChestArt, GardenArt, SnakeMark } from './components/Art';
import Modal from './components/Modal';
import TutorialLesson from './components/TutorialLesson';
import TutorialReview from './components/TutorialReview';
import { LESSONS } from './game/tutorial';
import SettingsPanel from './components/SettingsPanel';
import { canBuild, loadDictionary } from './data/vocabulary';
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
  return (
    <button className="brand" onClick={onClick} aria-label="LexiSnake หน้าแรก">
      <SnakeMark />
      <span>
        lexisnake<span className="brand-dot">.</span>
        <small>A LITTLE WORD ADVENTURE</small>
      </span>
    </button>
  );
}
function Library({ save, onClose }: { save: SaveData; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const entries = save.learned.filter((entry) =>
    (entry.word + ' ' + entry.meaningTh).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Modal title="สมุดคำศัพท์ของคุณ" onClose={onClose} wide>
      <p className="subtle">คำที่คุณเรียงสำเร็จจากรอบที่ผ่านมา · {save.learned.length} คำ</p>
      <input
        className="text-input library-search"
        placeholder="ค้นหาคำศัพท์หรือคำแปล"
        aria-label="ค้นหาคำศัพท์"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="word-list">
        {entries.length ? (
          entries.map((entry) => (
            <div className="word-entry" key={entry.word}>
              <div>
                <strong>{entry.word}</strong>
                <p>{entry.meaningTh}</p>
              </div>
              <button
                className="icon-button"
                aria-label={'ฟัง ' + entry.word}
                onClick={() => audio.speak(entry.word)}
              >
                ♪
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span>❀</span>
            <h3>{save.learned.length ? 'ยังไม่เจอคำที่ค้นหา' : 'คำแรกกำลังรอคุณอยู่'}</h3>
            <p>
              เข้าไปเก็บอักษรและเรียงคำในประตูสวน
              <br />
              คำที่พบจะบันทึกไว้ที่นี่เมื่อจบรอบ
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
  return (
    <div className="home">
      <header className="home-header">
        <Brand />
        <nav aria-label="เมนูหลัก">
          <button onClick={onLibrary}>
            <span aria-hidden="true">▤</span> สมุดคำศัพท์
          </button>
          <button onClick={onSettings}>
            <span aria-hidden="true">☷</span> ตั้งค่า
          </button>
        </nav>
      </header>
      <main className="home-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-leaf">❧</span> โลกใหม่รออยู่ทุก 1,500 คะแนน
            </div>
            <h1>
              เล่นทีละนิด
              <br />
              รู้จักคำใหม่<span className="green-text">อีกหน่อย</span>
              <span className="heading-flower" aria-hidden="true">
                ✿
              </span>
            </h1>
            <p className="hero-description">
              พาเจ้างูเดินเล่น เก็บตัวอักษร เปิดกล่องสมบัติ
              <br className="desktop-break" /> แล้วปลดล็อกแมพใหม่ให้ทุกการเล่นมีสีสัน
            </p>
            <div className="hero-actions">
              <button className="button primary play-button" onClick={onPlay}>
                เข้าไปเล่นกัน <span aria-hidden="true">↗</span>
              </button>
              <button className="text-button" onClick={onTutorial}>
                ลองฝึกก่อน <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="hero-note">
              <span aria-hidden="true">♡</span> เริ่มช้า ๆ ได้ มีหัวใจให้ลองใหม่อีก 3 ครั้ง
            </div>
          </div>
          <div className="hero-illustration">
            <div className="illustration-halo" />
            <GardenArt />
            <div className="floating-note">
              <span>✦</span>
              <div>
                <strong>คำใหม่หนึ่งคำ</strong>
                <small>ความสุขเล็ก ๆ ในทุกวัน</small>
              </div>
            </div>
            <span className="art-caption">YOUR LITTLE GARDEN OF WORDS</span>
          </div>
        </section>
        <section className="home-bottom" aria-label="ความคืบหน้าและกล่องสมบัติ">
          <div className="progress-summary">
            <span className="eyebrow">เติบโตไปทีละคำ</span>
            <h2>สวนของคุณ</h2>
            <div className="home-stats">
              <div>
                <strong>{format(save.bestScore)}</strong>
                <span>คะแนนสูงสุด</span>
              </div>
              <div>
                <strong>{save.learned.length}</strong>
                <span>คำที่ค้นพบ</span>
              </div>
              <div>
                <strong>{save.played}</strong>
                <span>รอบที่เล่น</span>
              </div>
            </div>
          </div>
          <div className="treasure-guide">
            <div className="treasure-heading">
              <span className="eyebrow">ของขวัญระหว่างทาง</span>
              <span className="subtle">เจอกล่องแล้วลองเปิดดูสิ</span>
            </div>
            <div className="chest-guide-grid">
              {kinds.map((kind) => (
                <div className={'chest-guide ' + kind} key={kind}>
                  <ChestArt kind={kind} />
                  <span>{CHESTS[kind].title}</span>
                  <strong>
                    +{CHESTS[kind].count} <small>อักษร</small>
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>
          LEXISNAKE <span className="footer-separator">/</span> A NEON WORD ADVENTURE
        </span>
        <span>
          เติบโตในแบบของคุณ <span aria-hidden="true">❧</span>
        </span>
      </footer>
    </div>
  );
}
function Timer({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div
      className={'timer ' + (remaining < 10000 ? 'urgent' : '')}
      style={{ '--progress': (remaining / total) * 100 + '%' } as CSSProperties}
    >
      <span>{clock(remaining)}</span>
      <small>วินาที</small>
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
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [draft, setDraft] = useState(''),
    [revivalDraft, setRevivalDraft] = useState(''),
    [leave, setLeave] = useState(false),
    [speechError, setSpeechError] = useState('');
  const playRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef(onRecord);
  recordRef.current = onRecord;
  const previousPhase = useRef(s.phase);
  useEffect(() => {
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
  const used: Record<string, number> = {};
  for (const letter of draft) used[letter] = (used[letter] ?? 0) + 1;
  const currentCounts: Record<string, number> = {};
  const spelling = (event: FormEvent) => {
    event.preventDefault();
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
          <button className="icon-button" aria-label="กลับหน้า Home" onClick={askHome}>
            ⌂
          </button>
          <span
            className="map-badge"
            title={s.settings.map === 'auto' ? 'เปลี่ยนแมพทุก 1,500 คะแนน' : 'แมพที่เลือก'}
          >
            {currentMap.name}
          </span>
          <span className="game-title">
            lexisnake<span>.</span>
          </span>
          {s.tutorial && <span className="pill">ฝึกสอน</span>}
        </div>
        <div className="game-stats">
          <div className="score-stat">
            <span>คะแนน</span>
            <strong data-testid="score">{format(s.score)}</strong>
          </div>
          <div className="hearts" role="img" aria-label={'ฟื้นคืนชีพได้อีก ' + s.hearts + ' ครั้ง'}>
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
              ? 'สนามฝึก · ไม่เสียหัวใจ'
              : s.portal
                ? 'ประตูเปิดแล้ว'
                : 'ประตูอีก ' + clock(s.nextPortalAt - s.elapsed) + ' วิ'}
          </span>
          <button
            className="icon-button"
            aria-label={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            aria-pressed={soundEnabled}
            onClick={onSoundToggle}
          >
            {soundEnabled ? '♪' : '♩'}
          </button>
          <button
            className="icon-button fullscreen-button"
            aria-label="เต็มหน้าจอ"
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
            aria-label="พักเกม"
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
        <aside className="tutorial-task" aria-label="เป้าหมายบทสอน">
          <span className="tutorial-task-step">
            {s.lesson + 1} / {LESSONS.length}
          </span>
          <div className="tutorial-objective">
            <p>{LESSONS[s.lesson].task}</p>
            {s.lesson === 0 && (
              <ol className="steering-checklist" aria-label="ทิศทางที่ฝึกแล้ว">
                {(['up', 'left', 'down', 'right'] as Direction[]).map((direction, index) => (
                  <li
                    key={direction}
                    className={s.practicedDirections.includes(direction) ? 'done' : ''}
                    aria-current={s.practicedDirections.length === index ? 'step' : undefined}
                  >
                    {s.practicedDirections.includes(direction)
                      ? '✓'
                      : ['W ↑', 'A ←', 'S ↓', 'D →'][index]}{' '}
                    {DIRECTION_LABELS[direction].name}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <button className="text-button" onClick={() => engine.showLesson()}>
            ดูคำอธิบาย
          </button>
        </aside>
      )}
      <main className="game-field" aria-label="สนามเกม" tabIndex={-1}>
        <PhaserBoard engine={engine} />
        {phase === 'countdown' && (
          <div className="countdown-overlay">
            <div className="countdown-card">
              <div className="countdown-number" key={Math.ceil(s.countdown / 1000)}>
                {Math.ceil(s.countdown / 1000) || 1}
              </div>
              <p>{s.notice || 'พร้อมออกเดินทาง'}</p>
              <div
                className="direction-preview"
                role="status"
                data-testid="direction-preview"
                aria-label={'ทิศทางถัดไป ' + directionPreview.name}
              >
                <strong aria-hidden="true">{directionPreview.arrow}</strong>
                <span>ทิศทาง: {directionPreview.name}</span>
              </div>
              <small>เลือกทิศทางด้วยลูกศรหรือ WASD · ห้ามกลับหลังเข้าตัวเอง</small>
              <span className="countdown-map">{currentMap.name}</span>
            </div>
          </div>
        )}
      </main>
      <footer
        className={'game-tray' + (reviewingBag ? ' tutorial-bag-focus' : '')}
        data-reduced-motion={s.settings.reducedMotion}
        aria-label="กระเป๋าอักษร"
      >
        <div className="tray-label">
          <span>กระเป๋าอักษร</span>
          <strong>
            {s.inventory.length} <small>ตัว</small>
          </strong>
        </div>
        <div className="inventory-strip" aria-label="ตัวอักษรที่เก็บได้">
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
            <span className="empty-inventory">เก็บอักษรในสวน แล้วเข้าประตูเพื่อเรียงคำ</span>
          )}
        </div>
        <div className="control-hint">
          <span>
            <kbd>W A S D</kbd> / ลูกศร
          </span>
          <span>
            <kbd>Shift</kbd> / <kbd>Space</kbd> เร่ง · <kbd>P</kbd> พัก
          </span>
        </div>
      </footer>
      {phase === 'lessonReview' && (
        <TutorialReview step={s.lesson} onContinue={() => engine.continueLesson()} />
      )}
      <div className="touch-controls" aria-label="ปุ่มควบคุมบนจอ" hidden={phase === 'lessonReview'}>
        <div className="dpad">
          <button
            aria-label="เลี้ยวขึ้น"
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('up');
            }}
          >
            ↑
          </button>
          <button
            aria-label="เลี้ยวซ้าย"
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('left');
            }}
          >
            ←
          </button>
          <button
            aria-label="เลี้ยวลง"
            onPointerDown={(e) => {
              e.preventDefault();
              engine.turn('down');
            }}
          >
            ↓
          </button>
          <button
            aria-label="เลี้ยวขวา"
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
          เร่ง ↗
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
        <Modal title="ประตูมิติต่างโลก" wide className="challenge-modal">
          <div className="challenge-heading">
            <div>
              <span className="eyebrow">A WORLD OF WORDS</span>
              <p className="subtle">
                {s.tutorial
                  ? 'บทฝึก: เรียง CAT (แมว) แล้วกด Enter หรือส่งคำศัพท์'
                  : 'เรียงคำจากตัวอักษรในกระเป๋าของคุณ'}
              </p>
              {s.tutorial && (
                <button className="text-button" onClick={() => engine.showLesson()}>
                  ดูคำอธิบาย
                </button>
              )}
            </div>
            <Timer remaining={s.challengeRemaining} total={s.settings.portalSeconds * 1000} />
          </div>
          <form onSubmit={spelling}>
            <label className="sr-only" htmlFor="word-input">
              คำศัพท์ภาษาอังกฤษ
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
                  ? 'ยังไม่มีอักษรในกระเป๋า'
                  : s.tutorial
                    ? 'CAT'
                    : 'พิมพ์คำศัพท์ที่นี่'
              }
              aria-describedby="word-input-help"
              value={draft}
              onChange={(e) => {
                const next = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                if (canBuild(next, s.inventory)) setDraft(next);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setDraft('');
                }
              }}
            />
            <p id="word-input-help" className="subtle">
              พิมพ์ได้เฉพาะอักษรที่มีในกระเป๋า ใช้ซ้ำได้ตามจำนวนที่เก็บมา
            </p>
            <div className="challenge-inventory" aria-label="เลือกตัวอักษร">
              {s.inventory.map((letter, i) => {
                currentCounts[letter] = (currentCounts[letter] ?? 0) + 1;
                const selected = currentCounts[letter] <= (used[letter] ?? 0);
                return (
                  <button
                    key={i}
                    className={'letter-tile ' + (selected ? 'selected' : '')}
                    type="button"
                    disabled={selected || draft.length >= 24}
                    onClick={() =>
                      setDraft((d) =>
                        d.length < 24 && canBuild(d + letter, s.inventory) ? d + letter : d,
                      )
                    }
                    aria-label={'เลือก ' + letter}
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
                onClick={() => setDraft((d) => d.slice(0, -1))}
              >
                ⌫ ลบตัวท้าย
              </button>
              <button type="button" className="text-button" onClick={() => setDraft('')}>
                ล้างคำ
              </button>
              <button
                type="button"
                className="text-button hint-button"
                onClick={() => {
                  const hint = engine.hint();
                  if (hint) setDraft(hint);
                }}
              >
                ✦ ช่วยเรียง
              </button>
            </div>
            <p className="form-error" role="status">
              {s.error || '\u00a0'}
            </p>
            <button type="submit" className="button primary full" disabled={!draft}>
              ส่งคำศัพท์ <span>↗</span>
            </button>
          </form>
          <div className="modal-bottom-actions">
            <button className="text-button" onClick={() => engine.pause()}>
              พักก่อน
            </button>
            {!s.tutorial && (
              <button className="text-button" onClick={() => engine.leaveChallenge()}>
                กลับไปเก็บอักษรเพิ่ม →
              </button>
            )}
          </div>
        </Modal>
      )}
      {phase === 'wordResult' && s.result && (
        <Modal title="คำใหม่เบ่งบานแล้ว" className="result-modal">
          <span className="result-flower" aria-hidden="true">
            ✿
          </span>
          <strong className="result-word">{s.result.entry.word}</strong>
          <p className="result-meaning">{s.result.entry.meaningTh}</p>
          <span className="points-pill">+{format(s.result.points)} คะแนน</span>
          <button
            className="text-button centered"
            onClick={() => {
              setSpeechError('');
              audio.speak(s.result!.entry.word, () =>
                setSpeechError('เครื่องนี้ยังอ่านเสียงไม่ได้'),
              );
            }}
          >
            ♪ ฟังการออกเสียง
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
            {s.tutorial ? 'อ่านกติกาก่อนเล่นจริง' : 'กลับไปเดินเล่นต่อ'} →
          </button>
        </Modal>
      )}
      {phase === 'chest' && s.reward && (
        <Modal
          title={
            !s.reward.opened
              ? 'ลองเปิดกล่องเงิน'
              : s.reward.revealed
                ? 'ของขวัญของคุณมาแล้ว!'
                : 'กำลังเปิดกล่องสมบัติ…'
          }
          className={'chest-modal ' + s.reward.kind}
        >
          <span className="eyebrow">
            {CHESTS[s.reward.kind].title} · {CHESTS[s.reward.kind].count} ตัวอักษร
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
                s.reward.revealed ? 'ได้รับ ' + s.reward.letters.join(' ') : 'กำลังสุ่มตัวอักษร'
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
          <p className="subtle">
            {s.tutorial
              ? 'กล่องเงินให้ 2 อักษร บทนี้เตรียม A และ T ให้ เมื่อกดรับจะเพิ่มในกระเป๋าใต้สนาม เกมหยุดรอทุกขั้น ไม่ต้องรีบ'
              : 'เวลาบนสนามหยุดให้แล้ว ค่อย ๆ เปิดได้เลย'}
          </p>
          {!s.reward.opened ? (
            <button className="button primary full" onClick={() => engine.openTutorialChest()}>
              เริ่มเปิดกล่องเงิน
            </button>
          ) : (
            <button
              className="button primary full"
              disabled={!s.reward.revealed}
              onClick={() => engine.claimChest()}
            >
              เก็บใส่กระเป๋า +{CHESTS[s.reward.kind].count} <span>✓</span>
            </button>
          )}
        </Modal>
      )}
      {phase === 'revive' && s.reviveWord && (
        <Modal title="ให้เจ้างูลองอีกครั้งไหม?" className="revive-modal">
          <div className="revive-heading">
            <span className="revive-heart" aria-hidden="true">
              ♡
            </span>
            <Timer remaining={s.reviveRemaining} total={30_000} />
          </div>
          <p className="subtle">
            {s.deathReason} · เหลือหัวใจ {s.hearts} ดวง
          </p>
          <p className="revive-question">
            คำว่า <strong>“{s.reviveWord.meaningTh}”</strong>
            <br />
            ภาษาอังกฤษสะกดอย่างไร?
          </p>
          <span className="spelling-hint">
            {s.reviveWord.word[0]} {'_ '.repeat(s.reviveWord.word.length - 1)}{' '}
            <small>({s.reviveWord.word.length} ตัวอักษร)</small>
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              engine.submitRevival(revivalDraft);
            }}
          >
            <input
              className="text-input revival-input"
              aria-label="คำตอบฟื้นคืนชีพ"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="พิมพ์คำตอบภาษาอังกฤษ"
              value={revivalDraft}
              maxLength={24}
              onChange={(e) => setRevivalDraft(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            />
            <p className="form-error" role="status">
              {s.error || '\u00a0'}
            </p>
            <div className="revive-cost">
              <span>♥ ใช้ 1 หัวใจ</span>
              <span>−100 คะแนน · ต่ำสุด 0</span>
            </div>
            <button className="button primary full" disabled={!revivalDraft}>
              ตอบเพื่อฟื้นคืนชีพ →
            </button>
          </form>
          <button className="text-button centered" onClick={() => engine.pause()}>
            พักก่อน
          </button>
          <button className="text-button centered subdued" onClick={() => engine.endRound()}>
            จบรอบนี้
          </button>
        </Modal>
      )}
      {phase === 'paused' && !leave && (
        <Modal title="พักในสวนสักครู่">
          <div className="modal-illustration">
            <span className="cloud-symbol" aria-hidden="true">
              ☁
            </span>
          </div>
          <p className="modal-description">ทุกอย่างรอคุณอยู่ เวลาและเจ้างูหยุดแล้ว</p>
          <button
            className="button primary full"
            onClick={() => {
              audio.unlock();
              engine.resume();
            }}
          >
            เล่นต่อ →
          </button>
          <button className="button secondary full" onClick={() => setLeave(true)}>
            กลับหน้า Home
          </button>
        </Modal>
      )}
      {leave && (
        <Modal title="กลับบ้านก่อนดีไหม?" onClose={() => setLeave(false)}>
          <p className="modal-description">รอบนี้จะจบลง คะแนนสูงสุดและคำที่พบจะเก็บไว้ให้</p>
          <button className="button primary full" onClick={onHome}>
            บันทึกแล้วกลับหน้า Home
          </button>
          <button className="button secondary full" onClick={() => setLeave(false)}>
            อยู่เล่นต่อ
          </button>
        </Modal>
      )}
      {phase === 'gameOver' && (
        <Modal title="วันนี้สวนเติบโตขึ้นอีกนิด" className="gameover-modal">
          <div className="modal-illustration">
            <SnakeMark large />
          </div>
          <span className="eyebrow">YOUR LITTLE ADVENTURE</span>
          <div className="final-score">
            {format(s.score)}
            <small>คะแนน</small>
          </div>
          <p className="subtle">
            {s.deathReason} · เรียงสำเร็จ {s.words.length} คำ
          </p>
          {s.words.length > 0 && (
            <div className="round-words">
              {s.words.map((word, i) => (
                <span key={i}>{word.entry.word}</span>
              ))}
            </div>
          )}
          <button className="button primary full" onClick={onHome}>
            กลับหน้า Home →
          </button>
        </Modal>
      )}
      {phase === 'tutorialDone' && (
        <Modal title="พร้อมออกผจญภัยแล้ว!" className="result-modal">
          <span className="result-flower">✿</span>
          <p className="modal-description">
            เลี้ยวและเร่ง → เก็บอักษร → เปิดกล่อง → เข้าประตู → เรียงคำ
            <br />
            คุณลองเล่นครบทุกขั้นแล้ว เริ่มผจญภัยกันได้เลย
          </p>
          <div className="mini-chest-guide">
            {kinds.map((kind) => (
              <div key={kind}>
                <ChestArt kind={kind} />
                <span>+{CHESTS[kind].count}</span>
              </div>
            ))}
          </div>
          <div className="soft-note">
            รอบจริงมีหัวใจ 3 ดวง ตอบคำศัพท์ถูกเพื่อฟื้นคืนชีพ โดยหัก 100 คะแนน
          </div>
          <button className="button primary full" onClick={onHome}>
            กลับ Home แล้วเริ่มเล่นกัน →
          </button>
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  const [save, setSave] = useState(loadSave);
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
    <>
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
          คลังหลักยังโหลดไม่ได้ รอบนี้เล่นด้วยชุดคำศัพท์พื้นฐาน{' '}
          <button
            onClick={() => {
              setDictionaryStatus('loading');
              void loadDictionary().then((ok) => setDictionaryStatus(ok ? 'ready' : 'fallback'));
            }}
          >
            ลองโหลดอีกครั้ง
          </button>
        </p>
      )}
      {saveFailed && (
        <p className="app-notice" role="status">
          เบราว์เซอร์ยังบันทึกความคืบหน้าไม่ได้ รอบนี้ยังเล่นต่อได้
        </p>
      )}
      {modal === 'experience' && (
        <Modal title="เคยมาเดินเล่นที่นี่หรือยัง?" onClose={() => setModal(null)} wide>
          <p className="subtle">เลือกทางเข้าที่เหมาะกับคุณ</p>
          <div className="experience-options">
            <button className="experience-card" onClick={() => start(true)}>
              <span className="experience-icon">❧</span>
              <strong>มือใหม่ ขอฝึกก่อน</strong>
              <p>
                เรียนรู้การเดิน เก็บอักษร
                <br />
                และเรียงคำทีละขั้น
              </p>
              <span className="experience-link">เข้าโหมดฝึกสอน →</span>
            </button>
            <button className="experience-card returning" onClick={() => start(false)}>
              <span className="experience-icon">✦</span>
              <strong>เคยเล่นแล้ว พร้อมเลย</strong>
              <p>
                พร้อมหัวใจ 3 ดวง
                <br />
                ไปสำรวจสวนกันต่อ
              </p>
              <span className="experience-link">เริ่มเล่น →</span>
            </button>
          </div>
          {dictionaryStatus === 'loading' && (
            <p className="subtle">เริ่มเล่นได้เลย กำลังเตรียมคลังศัพท์เพิ่มเติม</p>
          )}
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
    </>
  );
}
