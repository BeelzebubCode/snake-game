import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SnakeMark } from './Art';
import { useI18n } from '../i18n';
import { audio } from '../services/audio';
import type { Word } from '../game/types';
import type { SaveData } from '../services/storage';

const PER_PAGE = 5;
const SEALS = [5, 10, 25, 50, 100];

interface Entry {
  entry: Word;
  no: number;
}
interface Flip {
  dir: 1 | -1;
  from: number;
  to: number;
}
function useNarrow() {
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 820px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 820px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return narrow;
}
const prefersReducedMotion = () => document.documentElement.classList.contains('reduce-motion');

/** Word Journal: a two-page book with a cover that swings open and pages that turn. */
export default function JournalBook({ save, onClose }: { save: SaveData; onClose: () => void }) {
  const { t } = useI18n();
  const narrow = useNarrow();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [covered, setCovered] = useState(() => !prefersReducedMotion());
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    audio.play('page');
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.close();
      previous?.focus?.();
    };
  }, []);
  const needle = search.trim().toLowerCase();
  const entries: Entry[] = save.learned
    .map((entry, i) => ({ entry, no: i + 1 }))
    .filter(
      ({ entry }) => !needle || (entry.word + ' ' + entry.meaningTh).toLowerCase().includes(needle),
    );
  const entryPages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const total = 1 + entryPages;
  const step = narrow ? 1 : 2;
  const lastCursor = narrow ? total - 1 : Math.floor((total - 1) / 2) * 2;
  const here = Math.min(narrow ? cursor : cursor - (cursor % 2), lastCursor);
  const turn = (dir: 1 | -1) => {
    const to = Math.max(0, Math.min(lastCursor, here + dir * step));
    if (to === here || flip || covered) return;
    audio.play('page');
    if (prefersReducedMotion()) setCursor(to);
    else setFlip({ dir, from: here, to });
  };
  // Listen on the window: a disabled arrow button drops focus out of the dialog, and the arrow
  // keys should keep turning pages anyway.
  const turnRef = useRef(turn);
  turnRef.current = turn;
  useEffect(() => {
    const keys = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowRight') turnRef.current(1);
      else if (event.key === 'ArrowLeft') turnRef.current(-1);
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, []);
  const changeSearch = (value: string) => {
    setSearch(value);
    setCursor(0);
    setFlip(null);
  };
  const page = (index: number, side: 'left' | 'right', ghost = false): ReactNode => {
    let body: ReactNode;
    if (index === 0)
      body = (
        <IntroPage
          latest={save.learned.at(-1)}
          count={save.learned.length}
          search={search}
          onSearch={changeSearch}
          ghost={ghost}
        />
      );
    else if (index === 1 && entries.length === 0)
      body = (
        <div className="journal-empty">
          <span aria-hidden="true">❀</span>
          <h3>{save.learned.length ? t('journal.noResults') : t('journal.emptyTitle')}</h3>
          <p>
            {t('journal.emptyHint')} <br /> {t('journal.saveHint')}
          </p>
        </div>
      );
    else {
      const items = entries.slice((index - 1) * PER_PAGE, index * PER_PAGE);
      body = (
        <ul className="journal-entries">
          {items.map(({ entry, no }) => (
            <li className={'journal-entry lv-' + entry.level} key={entry.word}>
              <span className="entry-seal" title={entry.level}>
                {entry.level}
              </span>
              <div className="entry-text">
                <strong>{entry.word}</strong>
                <p lang="th">{entry.meaningTh}</p>
              </div>
              <span className="entry-no">{t('journal.entryNo', { n: no })}</span>
              <button
                className="journal-speak"
                data-silent
                tabIndex={ghost ? -1 : undefined}
                aria-label={t('common.listenPrefix') + entry.word}
                onClick={() => audio.speak(entry.word)}
              >
                ♪
              </button>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className={'page side-' + side} aria-hidden={ghost || undefined}>
        {body}
        {index < total && <span className="page-number">{index + 1}</span>}
      </div>
    );
  };
  // While a page turns, the pages underneath already show the destination and the moving sheet
  // carries the old page on its front and the new page on its back.
  const base = flip ? flip.to : here;
  const leftIndex = flip ? (flip.dir > 0 ? flip.from : flip.to) : here;
  const rightIndex = flip ? (flip.dir > 0 ? flip.to + 1 : flip.from + 1) : here + 1;
  const finishFlip = () => {
    if (!flip) return;
    setCursor(flip.to);
    setFlip(null);
  };
  const pageLabel = narrow
    ? t('journal.pageOne', { page: here + 1, total })
    : t('journal.pageTwo', { from: here + 1, to: Math.min(total, here + 2), total });
  return (
    <dialog
      ref={ref}
      className="journal-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={'book' + (narrow ? ' single' : '') + (covered ? ' opening' : '')}>
        <h2 id={titleId} className="sr-only">
          {t('journal.title')}
        </h2>
        <button className="book-close" aria-label={t('common.close')} onClick={onClose}>
          ×
        </button>
        <div className="book-pages">
          {narrow ? (
            <div className="slot slot-main">{page(base, 'right')}</div>
          ) : (
            <>
              <div className="slot slot-left">{page(leftIndex, 'left')}</div>
              <div className="slot slot-right">{page(rightIndex, 'right')}</div>
            </>
          )}
          {!narrow && <div className="book-spine" aria-hidden="true" />}
          {!narrow && <span className="book-ribbon" aria-hidden="true" />}
          {flip && (
            <div
              className={'sheet ' + (flip.dir > 0 ? 'next' : 'prev') + (narrow ? ' single' : '')}
              onAnimationEnd={finishFlip}
              aria-hidden="true"
            >
              <div className="face front">
                {narrow
                  ? page(flip.from, 'right', true)
                  : flip.dir > 0
                    ? page(flip.from + 1, 'right', true)
                    : page(flip.from, 'left', true)}
              </div>
              <div className="face back">
                {narrow
                  ? null
                  : flip.dir > 0
                    ? page(flip.to, 'left', true)
                    : page(flip.to + 1, 'right', true)}
              </div>
            </div>
          )}
          {covered && (
            <div
              className="cover"
              aria-hidden="true"
              onAnimationEnd={(event) => {
                if (event.animationName === 'cover-open') setCovered(false);
              }}
            >
              <div className="cover-face front">
                <SnakeMark large />
                <strong>{t('journal.title')}</strong>
                <span>{t('journal.count', { count: save.learned.length })}</span>
              </div>
              <div className="cover-face back">{narrow ? null : page(0, 'left', true)}</div>
            </div>
          )}
        </div>
        <nav className="book-nav" aria-label={t('journal.title')}>
          <button
            data-silent
            className="book-turn"
            aria-label={t('journal.prev')}
            disabled={here <= 0 || covered}
            onClick={() => turn(-1)}
          >
            ‹
          </button>
          <span className="book-indicator" aria-live="polite">
            {pageLabel}
          </span>
          <button
            data-silent
            className="book-turn"
            aria-label={t('journal.next')}
            disabled={here >= lastCursor || covered}
            onClick={() => turn(1)}
          >
            ›
          </button>
        </nav>
      </div>
    </dialog>
  );
}
function IntroPage({
  latest,
  count,
  search,
  onSearch,
  ghost,
}: {
  latest?: Word;
  count: number;
  search: string;
  onSearch: (value: string) => void;
  ghost: boolean;
}) {
  const { t } = useI18n();
  const next = SEALS.find((seal) => seal > count);
  return (
    <div className="journal-intro">
      <div className="journal-heading">
        <SnakeMark />
        <h3>{t('journal.title')}</h3>
      </div>
      <p className="journal-count">{t('journal.count', { count })}</p>
      <input
        className="journal-search"
        placeholder={t('journal.searchPlaceholder')}
        aria-label={t('journal.search')}
        value={search}
        readOnly={ghost}
        tabIndex={ghost ? -1 : undefined}
        onChange={(event) => onSearch(event.target.value)}
      />
      <div className="journal-seals" aria-label={t('journal.seals')}>
        <span className="journal-seals-title">{t('journal.seals')}</span>
        <div>
          {SEALS.map((seal) => (
            <span
              key={seal}
              className={'seal' + (count >= seal ? ' lit' : '')}
              title={t('journal.sealAria', { n: seal })}
            >
              {seal}
            </span>
          ))}
        </div>
        <small>
          {next ? t('journal.nextSeal', { remaining: next - count }) : t('journal.allSeals')}
        </small>
      </div>
      {latest && (
        <div className={'journal-latest lv-' + latest.level}>
          <span>{t('journal.latest')}</span>
          <i className="entry-seal">{latest.level}</i>
          <strong>{latest.word}</strong>
          <span className="latest-meaning" lang="th">
            {latest.meaningTh}
          </span>
        </div>
      )}
    </div>
  );
}
