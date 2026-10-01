import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Modal from './Modal';
import { CustomSelect } from './CustomSelect';
import { LanguageProvider, translator } from '../i18n';
import type { Translator } from '../i18n';
import { MAPS, MAP_SCORE_STEP, SKINS, hex } from '../game/appearance';
import type { Settings, SkinId } from '../game/types';
const format = (value: number) => value.toLocaleString('en-US');
function getSections(t: Translator) {
  return [
    {
      id: 'play',
      name: t('settings.gameplay'),
      icon: '▷',
      description: t('settings.gameplayDescription'),
    },
    {
      id: 'snake',
      name: t('settings.snake'),
      icon: '〰',
      description: t('settings.snakeDescription'),
    },
    {
      id: 'world',
      name: t('settings.maps'),
      icon: '▧',
      description: t('settings.mapsDescription'),
    },
    {
      id: 'effects',
      name: t('settings.audio'),
      icon: '♪',
      description: t('settings.audioDescription'),
    },
  ] as const;
}
type Section = ReturnType<typeof getSections>[number]['id'];
export default function SettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const t = translator(draft.language);
  const sections = getSections(t);
  const [active, setActive] = useState<Section>('play');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const content = useRef<HTMLDivElement>(null);
  const changed = JSON.stringify(settings) !== JSON.stringify(draft);
  const selectSection = (id: Section) => {
    setActive(id);
    content.current?.scrollTo(0, 0);
  };
  function navigate(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === 'ArrowDown') next = (index + 1) % sections.length;
    else if (event.key === 'ArrowUp') next = (index + sections.length - 1) % sections.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else return;
    event.preventDefault();
    selectSection(sections[next].id);
    tabs.current[next]?.focus();
  }
  return (
    <LanguageProvider language={draft.language} syncDocument={false}>
      <Modal title={t('common.settings')} onClose={onClose} className="settings-modal" wide>
        <div className="settings-workspace">
          <aside className="settings-sidebar">
            <span className="settings-nav-title">{t('settings.navigationTitle')}</span>
            <div role="tablist" aria-label={t('settings.categories')} aria-orientation="vertical">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  id={'settings-tab-' + section.id}
                  aria-controls={'settings-panel-' + section.id}
                  aria-selected={active === section.id}
                  tabIndex={active === section.id ? 0 : -1}
                  ref={(node) => {
                    tabs.current[index] = node;
                  }}
                  onKeyDown={(event) => navigate(event, index)}
                  onClick={() => selectSection(section.id)}
                >
                  <span aria-hidden="true">{section.icon}</span>
                  <span>{section.name}</span>
                </button>
              ))}
            </div>
            <p className="settings-sidebar-note">
              LEXISNAKE <span>V2</span>
            </p>
          </aside>
          <div className="settings-content" ref={content}>
            {active === 'snake' && (
              <section
                role="tabpanel"
                id="settings-panel-snake"
                aria-labelledby="settings-tab-snake"
                tabIndex={0}
              >
                <div className="settings-section-heading">
                  <span>
                    {t('settings.breadcrumb')} {sections[1].name}
                  </span>
                  <h3>{sections[1].name}</h3>
                  <p>{sections[1].description}</p>
                </div>
                <div className="settings-list">
                  <fieldset className="appearance-options">
                    <legend>{t('settings.skin')}</legend>
                    <div className="skin-options">
                      {(Object.keys(SKINS) as SkinId[]).map((id) => (
                        <button
                          type="button"
                          key={id}
                          className={'skin-option ' + (draft.skin === id ? 'active' : '')}
                          aria-pressed={draft.skin === id}
                          onClick={() => setDraft({ ...draft, skin: id })}
                        >
                          <span
                            className="skin-preview"
                            style={{
                              background:
                                'linear-gradient(90deg,' +
                                hex(SKINS[id].tail) +
                                ',' +
                                hex(SKINS[id].head) +
                                ')',
                            }}
                          >
                            <i />
                            <i />
                          </span>
                          <span>{SKINS[id].name}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    {' '}
                    {t('settings.snakeStyle')}
                    <CustomSelect
                      value={draft.snakeStyle}
                      onChange={(val) => setDraft({ ...draft, snakeStyle: val as Settings['snakeStyle'] })}
                      options={[
                        { value: 'smooth', label: t('settings.smooth') },
                        { value: 'classic', label: t('settings.classic') },
                      ]}
                    />
                  </label>
                </div>
              </section>
            )}
            {active === 'world' && (
              <section
                role="tabpanel"
                id="settings-panel-world"
                aria-labelledby="settings-tab-world"
                tabIndex={0}
              >
                <div className="settings-section-heading">
                  <span>
                    {t('settings.breadcrumb')} {sections[2].name}
                  </span>
                  <h3>{sections[2].name}</h3>
                  <p>{sections[2].description}</p>
                </div>
                <div className="settings-list">
                  <label>
                    {' '}
                    {t('settings.map')}
                    <CustomSelect
                      value={draft.map}
                      onChange={(val) => setDraft({ ...draft, map: val as Settings['map'] })}
                      options={[
                        { value: 'auto', label: t('settings.autoMap') },
                        { value: 'random', label: t('settings.randomMap') },
                        ...MAPS.map((map) => ({
                          value: map.id,
                          label: `${map.name} · ${t(map.description)}`
                        }))
                      ]}
                    />
                  </label>
                  <div className="map-options" aria-label={t('settings.mapPreviews')}>
                    {MAPS.map((map, i) => (
                      <button
                        type="button"
                        key={map.id}
                        className={'map-preview ' + (draft.map === map.id ? 'active' : '')}
                        aria-pressed={draft.map === map.id}
                        onClick={() => setDraft({ ...draft, map: map.id as Settings['map'] })}
                        style={
                          {
                            background: hex(map.background),
                            '--map-preview-accent': hex(map.accent),
                          } as CSSProperties
                        }
                      >
                        <i />
                        <strong>{map.name}</strong>
                        <small>
                          {format(i * MAP_SCORE_STEP)} {t('common.score')}
                        </small>
                      </button>
                    ))}
                  </div>
                  <label className="check-row">
                    <span>{t('settings.grid')}</span>
                    <input
                      type="checkbox"
                      checked={draft.showGrid}
                      onChange={(e) => setDraft({ ...draft, showGrid: e.target.checked })}
                    />
                  </label>
                </div>
              </section>
            )}
            {active === 'play' && (
              <section
                role="tabpanel"
                id="settings-panel-play"
                aria-labelledby="settings-tab-play"
                tabIndex={0}
              >
                <div className="settings-section-heading">
                  <span>
                    {t('settings.breadcrumb')} {sections[0].name}
                  </span>
                  <h3>{sections[0].name}</h3>
                  <p>{sections[0].description}</p>
                </div>
                <div className="settings-list">
                  <label>
                    {t('settings.language')}
                    <CustomSelect
                      value={draft.language}
                      onChange={(val) => setDraft({ ...draft, language: val as Settings['language'] })}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'th', label: 'ไทย (Thai)' },
                      ]}
                    />
                    <small>{t('settings.languageHint')}</small>
                  </label>

                  <label>
                    {' '}
                    {t('settings.speed')}
                    <CustomSelect
                      value={draft.speed}
                      onChange={(val) => setDraft({ ...draft, speed: val as Settings['speed'] })}
                      options={[
                        { value: 'slow', label: t('settings.slow') },
                        { value: 'normal', label: t('settings.normal') },
                        { value: 'fast', label: t('settings.fast') },
                        { value: 'expert', label: t('settings.expert') },
                      ]}
                    />
                  </label>
                  <label>
                    {' '}
                    {t('settings.portalTimer')}
                    <CustomSelect
                      value={draft.portalSeconds}
                      onChange={(val) => setDraft({ ...draft, portalSeconds: Number(val) })}
                      options={[
                        { value: 15, label: t('settings.seconds15') },
                        { value: 30, label: t('settings.seconds30') },
                        { value: 45, label: t('settings.seconds45') },
                        { value: 60, label: t('settings.minute1') },
                        { value: 90, label: t('settings.minuteHalf') },
                        { value: 120, label: t('settings.minutes2') },
                      ]}
                    />
                  </label>
                  <label>
                    {' '}
                    {t('settings.wordLevel')}{' '}
                    <CustomSelect
                      value={draft.level}
                      onChange={(val) => setDraft({ ...draft, level: val as Settings['level'] })}
                      options={[
                        { value: 'all', label: t('settings.allLevels') },
                        { value: 'easy', label: t('settings.easy') },
                        { value: 'medium', label: t('settings.medium') },
                        { value: 'hard', label: t('settings.hard') },
                        ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => ({ value: level, label: level }))
                      ]}
                    />
                    <small>{t('settings.levelNote')}</small>
                  </label>
                </div>
              </section>
            )}
            {active === 'effects' && (
              <section
                role="tabpanel"
                id="settings-panel-effects"
                aria-labelledby="settings-tab-effects"
                tabIndex={0}
              >
                <div className="settings-section-heading">
                  <span>
                    {t('settings.breadcrumb')} {sections[3].name}
                  </span>
                  <h3>{sections[3].name}</h3>
                  <p>{sections[3].description}</p>
                </div>
                <div className="settings-list">
                  <label className="check-row">
                    <span>{t('settings.sound')}</span>
                    <input
                      type="checkbox"
                      checked={draft.sound}
                      onChange={(e) => setDraft({ ...draft, sound: e.target.checked })}
                    />
                  </label>
                  <label className="check-row">
                    <span>
                      {' '}
                      {t('settings.reducedMotion')}
                      <small>{t('settings.reducedMotionHint')}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.reducedMotion}
                      onChange={(e) => setDraft({ ...draft, reducedMotion: e.target.checked })}
                    />
                  </label>
                </div>
              </section>
            )}
          </div>
        </div>
        <footer className="settings-footer">
          <p role="status">{changed ? t('settings.unsaved') : t('settings.savedHint')}</p>
          <div>
            <button className="button secondary" onClick={onClose}>
              {' '}
              {t('common.cancel')}{' '}
            </button>
            <button className="button primary" onClick={() => onSave(draft)}>
              {' '}
              {t('settings.save')} <span>✓</span>
            </button>
          </div>
        </footer>
      </Modal>
    </LanguageProvider>
  );
}
