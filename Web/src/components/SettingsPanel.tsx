import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Modal from './Modal';
import { MAPS, MAP_SCORE_STEP, SKINS, hex } from '../game/appearance';
import type { Settings, SkinId } from '../game/types';
const format = (value: number) => value.toLocaleString('en-US');
const sections = [
  {
    id: 'play',
    name: 'การเล่น',
    icon: '▷',
    description: 'ปรับจังหวะเกม เวลาในประตู และชุดคำศัพท์',
  },
  {
    id: 'snake',
    name: 'ตัวงู',
    icon: '〰',
    description: 'เลือกสีและรูปแบบของเจ้างูให้เป็นสไตล์คุณ',
  },
  {
    id: 'world',
    name: 'แมพและสนาม',
    icon: '▧',
    description: 'เลือกโลกที่อยากสำรวจและเส้นตารางบนสนาม',
  },
  {
    id: 'effects',
    name: 'เสียงและเอฟเฟกต์',
    icon: '♪',
    description: 'ปรับเสียงและการเคลื่อนไหวให้เล่นได้สบายขึ้น',
  },
] as const;
type Section = (typeof sections)[number]['id'];
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
    <Modal title="ตั้งค่า" onClose={onClose} className="settings-modal" wide>
      <div className="settings-workspace">
        <aside className="settings-sidebar">
          <span className="settings-nav-title">ตั้งค่าเกม</span>
          <div role="tablist" aria-label="หมวดการตั้งค่า" aria-orientation="vertical">
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
                <span>ตั้งค่า / {sections[1].name}</span>
                <h3>{sections[1].name}</h3>
                <p>{sections[1].description}</p>
              </div>
              <div className="settings-list">
                <fieldset className="appearance-options">
                  <legend>สีงู</legend>
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
                  รูปแบบตัวงู
                  <select
                    value={draft.snakeStyle}
                    onChange={(e) =>
                      setDraft({ ...draft, snakeStyle: e.target.value as Settings['snakeStyle'] })
                    }
                  >
                    <option value="smooth">เรียบลื่น · ไม่มีลาย</option>
                    <option value="classic">คลาสสิก · แบบ Python</option>
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
                <span>ตั้งค่า / {sections[2].name}</span>
                <h3>{sections[2].name}</h3>
                <p>{sections[2].description}</p>
              </div>
              <div className="settings-list">
                <label>
                  แมพพื้นหลัง
                  <select
                    value={draft.map}
                    onChange={(e) => setDraft({ ...draft, map: e.target.value as Settings['map'] })}
                  >
                    <option value="auto">ผจญภัย · เปลี่ยนทุก 1,500 คะแนน</option>
                    {MAPS.map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.name} · {map.description}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="map-options" aria-label="แมพทั้งสี่">
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
                      <small>{format(i * MAP_SCORE_STEP)} คะแนน</small>
                    </div>
                  ))}
                </div>
                <label className="check-row">
                  <span>แสดงเส้นตาราง</span>
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
                <span>ตั้งค่า / {sections[0].name}</span>
                <h3>{sections[0].name}</h3>
                <p>{sections[0].description}</p>
              </div>
              <div className="settings-list">
                <label>
                  ความเร็วเจ้างู
                  <select
                    value={draft.speed}
                    onChange={(e) =>
                      setDraft({ ...draft, speed: e.target.value as Settings['speed'] })
                    }
                  >
                    <option value="slow">ช้า · ค่อย ๆ สำรวจ</option>
                    <option value="normal">ปกติ · กำลังพอดี</option>
                    <option value="fast">เร็ว · ท้าทายขึ้น</option>
                    <option value="expert">เร็วมาก · แบบ Python</option>
                  </select>
                </label>
                <label>
                  เวลาในประตูมิติต่างโลก
                  <select
                    value={draft.portalSeconds}
                    onChange={(e) => setDraft({ ...draft, portalSeconds: Number(e.target.value) })}
                  >
                    <option value={15}>15 วินาที</option>
                    <option value={30}>30 วินาที</option>
                    <option value={45}>45 วินาที</option>
                    <option value={60}>1 นาที</option>
                    <option value={90}>1 นาที 30 วินาที</option>
                    <option value={120}>2 นาที</option>
                  </select>
                </label>
                <label>
                  ชุดระดับคำศัพท์
                  <select
                    value={draft.level}
                    onChange={(e) =>
                      setDraft({ ...draft, level: e.target.value as Settings['level'] })
                    }
                  >
                    <option value="all">ทุกระดับ</option>
                    <option value="easy">ง่าย (A1–A2)</option>
                    <option value="medium">ปานกลาง (B1–B2)</option>
                    <option value="hard">ยาก (C1–C2)</option>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                  <small>ใช้การจัดระดับจากคลังเดิม ซึ่งบางคำยังต้องตรวจทาน</small>
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
                <span>ตั้งค่า / {sections[3].name}</span>
                <h3>{sections[3].name}</h3>
                <p>{sections[3].description}</p>
              </div>
              <div className="settings-list">
                <label className="check-row">
                  <span>เสียงเอฟเฟกต์และเสียงอ่าน</span>
                  <input
                    type="checkbox"
                    checked={draft.sound}
                    onChange={(e) => setDraft({ ...draft, sound: e.target.checked })}
                  />
                </label>
                <label className="check-row">
                  <span>
                    ลดการเคลื่อนไหว<small>เปิดกล่องได้ทันที และลดเอฟเฟกต์</small>
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
        <p role="status">
          {changed ? 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก' : 'การตั้งค่าจะใช้ในรอบถัดไป'}
        </p>
        <div>
          <button className="button secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="button primary" onClick={() => onSave(draft)}>
            บันทึกการตั้งค่า <span>✓</span>
          </button>
        </div>
      </footer>
    </Modal>
  );
}
