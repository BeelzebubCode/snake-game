import { useI18n } from '../i18n';
import type { ChestKind } from '../game/types';
import { CHESTS } from '../game/types';
export function SnakeMark({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={large ? 'snake-mark large' : 'snake-mark'}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="22" fill="#172a30" />
      <path
        d="M18 42h21a9 9 0 0 0 0-18H27"
        fill="none"
        stroke="var(--snake-head)"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <ellipse cx="25" cy="24" rx="13" ry="10" fill="var(--snake-head)" />
      <ellipse cx="21" cy="20" rx="3" ry="3.5" fill="#fff" />
      <ellipse cx="29" cy="20" rx="3" ry="3.5" fill="#fff" />
      <circle cx="21" cy="20" r="1.3" fill="#34472f" />
      <circle cx="29" cy="20" r="1.3" fill="#34472f" />
      <path
        d="M22 27q3 3 6 0"
        fill="none"
        stroke="#34472f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="17" cy="26" rx="2.5" ry="1.5" fill="#e2afa2" />
    </svg>
  );
}
export function ChestArt({ kind, open = false }: { kind: ChestKind; open?: boolean }) {
  const color = CHESTS[kind].color;
  return (
    <svg className={'chest-art ' + (open ? 'opened' : '')} viewBox="0 0 100 90" aria-hidden="true">
      <ellipse cx="50" cy="77" rx="37" ry="6" fill="#354832" opacity=".1" />
      {open && (
        <g className="chest-stars" fill="#e6bd66">
          <path d="m24 15 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path d="m75 5 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <circle cx="50" cy="9" r="3" />
        </g>
      )}
      <rect x="15" y="38" width="70" height="37" rx="9" fill={color} />
      <rect x="15" y="57" width="70" height="18" rx="8" fill="#334333" opacity=".1" />
      <g
        className="chest-lid"
        style={{
          transformOrigin: '50px 39px',
          transform: open ? 'translateY(-16px) rotate(-8deg)' : undefined,
        }}
      >
        <path d="M15 39V28a12 12 0 0 1 12-12h46a12 12 0 0 1 12 12v11z" fill={color} />
        <path d="M16 39h68" stroke="#fff8de" strokeWidth="4" />
        <path d="M31 17v21m38-21v21" stroke="#fff8de" strokeOpacity=".4" strokeWidth="7" />
      </g>
      <rect x="43" y="34" width="14" height="20" rx="5" fill="#fff4d2" />
      <circle cx="50" cy="41" r="2.2" fill="#8b7751" />
      <path d="M50 43v4" stroke="#8b7751" strokeWidth="2" />
    </svg>
  );
}
export function GardenArt() {
  const { t } = useI18n();
  return (
    <svg className="garden-art" viewBox="0 0 720 550" role="img" aria-label={t('art.garden')}>
      <defs>
        <pattern id="home-grid" width="37" height="30" patternUnits="userSpaceOnUse">
          <path d="M37 0H0V30" fill="none" stroke="#375b67" strokeOpacity=".2" />
        </pattern>
        <linearGradient id="garden-floor" x2="0" y2="1">
          <stop stopColor="#192436" />
          <stop offset="1" stopColor="#111a2b" />
        </linearGradient>
      </defs>
      <ellipse cx="367" cy="454" rx="285" ry="42" fill="#8a9d6b" opacity=".1" />
      <path d="m72 203 348-91 242 176-355 157L72 280z" fill="#162433" />
      <path
        d="m72 203 348-91 242 176-355 132L72 258z"
        fill="url(#garden-floor)"
        stroke="#2d5f61"
        strokeWidth="3"
      />
      <path d="m72 203 348-91 242 176-355 132L72 258z" fill="url(#home-grid)" />
      <g className="art-cloud" fill="#c7e7f6">
        <ellipse cx="183" cy="91" rx="55" ry="18" />
        <circle cx="173" cy="77" r="23" />
        <circle cx="204" cy="86" r="19" />
      </g>
      <g fill="#794add">
        <path d="M471 216v-92a45 45 0 0 1 90 0v72z" stroke="#aa79ff" strokeWidth="9" />
        <path d="M483 209v-83a33 33 0 0 1 66 0v72z" fill="#29204c" />
        <path d="m512 134 4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#dbbeff" />
        <circle cx="531" cy="183" r="4" fill="#aa79ff" />
      </g>
      <g stroke="#145c58" strokeWidth="8" strokeLinecap="round">
        <path d="M133 235v-50M605 309v-58M353 145v-39" />
      </g>
      <g fill="#1b887d">
        <ellipse cx="120" cy="195" rx="13" ry="26" transform="rotate(-35 120 195)" />
        <ellipse cx="147" cy="184" rx="13" ry="27" transform="rotate(35 147 184)" />
        <ellipse cx="590" cy="272" rx="14" ry="28" transform="rotate(-35 590 272)" />
        <ellipse cx="617" cy="259" rx="13" ry="26" transform="rotate(35 617 259)" />
        <ellipse cx="343" cy="114" rx="10" ry="19" transform="rotate(-35 343 114)" />
        <ellipse cx="366" cy="108" rx="10" ry="19" transform="rotate(35 366 108)" />
      </g>
      <g className="art-snake">
        <path
          d="M241 334c-58-15-83-46-41-65s94 28 113 6-63-68-16-88"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="45"
          strokeLinecap="round"
          opacity=".16"
          transform="translate(0 12)"
        />
        <path
          d="M241 334c-58-15-83-46-41-65s94 28 113 6-63-68-16-88"
          fill="none"
          stroke="var(--snake-head)"
          strokeWidth="43"
          strokeLinecap="round"
        />

        <ellipse
          cx="307"
          cy="185"
          rx="38"
          ry="29"
          fill="var(--snake-head)"
          transform="rotate(-15 307 185)"
        />
        <ellipse cx="301" cy="169" rx="9" ry="10" fill="#c7e7f6" />
        <ellipse cx="325" cy="174" rx="9" ry="10" fill="#c7e7f6" />
        <circle cx="304" cy="168" r="3.5" fill="#3d5030" />
        <circle cx="328" cy="173" r="3.5" fill="#3d5030" />
        <path
          d="M309 190q8 7 16 0"
          stroke="#536c3f"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="294" cy="192" rx="7" ry="4" fill="#ff6a9c" />
      </g>
      <g className="art-letter float-one" transform="translate(395 208) rotate(8)">
        <rect width="50" height="57" rx="12" fill="#d5af8b" />
        <rect width="50" height="50" rx="12" fill="#f1c40f" />
        <text x="25" y="36" textAnchor="middle" fill="#846042" fontSize="30" fontWeight="700">
          A
        </text>
      </g>
      <g className="art-letter float-two" transform="translate(463 317) rotate(-10)">
        <rect width="46" height="53" rx="12" fill="#b8a3c8" />
        <rect width="46" height="46" rx="12" fill="#be8bff" />
        <text x="23" y="34" textAnchor="middle" fill="#77568a" fontSize="28" fontWeight="700">
          B
        </text>
      </g>
      <g transform="translate(357 321)">
        <rect width="63" height="45" rx="10" fill="#9eaed2" />
        <path d="M0 18h63" stroke="#f9f4dc" strokeWidth="4" />
        <rect x="26" y="12" width="12" height="17" rx="4" fill="#f9f4dc" />
        <circle cx="32" cy="18" r="2" fill="#9b976f" />
      </g>
      <g fill="#e8679d">
        <circle cx="177" cy="355" r="8" />
        <circle cx="190" cy="349" r="8" />
        <circle cx="189" cy="362" r="8" />
        <circle cx="554" cy="287" r="7" />
        <circle cx="565" cy="281" r="7" />
        <circle cx="565" cy="293" r="7" />
      </g>
      <g fill="#d8b06d">
        <circle cx="186" cy="356" r="5" />
        <circle cx="561" cy="287" r="4" />
      </g>
      <g fill="#c7b8d7">
        <path d="m570 70 3 10 10 3-10 3-3 10-3-10-10-3 10-3z" />
        <path d="m240 121 2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
      </g>
    </svg>
  );
}
