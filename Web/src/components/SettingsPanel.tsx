import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Modal from './Modal';
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
                    {t('settings.snakeStyle')}{' '}
                    <select
                      value={draft.snakeStyle}
                      onChange={(e) =>
                        setDraft({ ...draft, snakeStyle: e.target.value as Settings['snakeStyle'] })
                      }
                    >
                      <option value="smooth">{t('settings.smooth')}</option>
                      <option value="classic">{t('settings.classic')}</option>
                    </select>
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
                    {t('settings.map')}{' '}
                    <select
                      value={draft.map}
                      onChange={(e) =>
                        setDraft({ ...draft, map: e.target.value as Settings['map'] })
                      }
                    >
                      <option value="auto">{t('settings.autoMap')}</option>
                      {MAPS.map((map) => (
                        <option key={map.id} value={map.id}>
                          {map.name} · {t(map.description)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="map-options" aria-label={t('settings.mapPreviews')}>
                    {MAPS.map((map, i) => (
                      <div
                        key={map.id}
                        className="map-preview"
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
                      </div>
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
                    <select
                      value={draft.language}
                      onChange={(e) =>
                        setDraft({ ...draft, language: e.target.value as Settings['language'] })
                      }
                    >
                      <option value="en">English</option>
                      <option value="th">ไทย (Thai)</option>
                    </select>
                    <small>{t('settings.languageHint')}</small>
                  </label>

                  <label>
                    {' '}
                    {t('settings.speed')}{' '}
                    <select
                      value={draft.speed}
                      onChange={(e) =>
                        setDraft({ ...draft, speed: e.target.value as Settings['speed'] })
                      }
                    >
                      <option value="slow">{t('settings.slow')}</option>
                      <option value="normal">{t('settings.normal')}</option>
                      <option value="fast">{t('settings.fast')}</option>
                      <option value="expert">{t('settings.expert')}</option>
                    </select>
                  </label>
                  <label>
                    {' '}
                    {t('settings.portalTimer')}{' '}
                    <select
                      value={draft.portalSeconds}
                      onChange={(e) =>
                        setDraft({ ...draft, portalSeconds: Number(e.target.value) })
                      }
                    >
                      <option value={15}>{t('settings.seconds15')}</option>
                      <option value={30}>{t('settings.seconds30')}</option>
                      <option value={45}>{t('settings.seconds45')}</option>
                      <option value={60}>{t('settings.minute1')}</option>
                      <option value={90}>{t('settings.minuteHalf')}</option>
                      <option value={120}>{t('settings.minutes2')}</option>
                    </select>
                  </label>
                  <label>
                    {' '}
                    {t('settings.wordLevel')}{' '}
                    <select
                      value={draft.level}
                      onChange={(e) =>
                        setDraft({ ...draft, level: e.target.value as Settings['level'] })
                      }
                    >
                      <option value="all">{t('settings.allLevels')}</option>
                      <option value="easy">{t('settings.easy')}</option>
                      <option value="medium">{t('settings.medium')}</option>
                      <option value="hard">{t('settings.hard')}</option>
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                        <option key={level}>{level}</option>
                      ))}
                    </select>
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
