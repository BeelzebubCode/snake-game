import Modal from './Modal';
import { ChestArt } from './Art';
import { CHESTS } from '../game/types';
import type { ChestKind } from '../game/types';
import { getLessons } from '../game/tutorial';
import { useI18n } from '../i18n';

function LessonPicture({ step }: { step: number }) {
  const { t } = useI18n();
  if (step === 3)
    return (
      <div className="lesson-chests" role="img" aria-label={t('tutorial.chestPicture')}>
        {(Object.keys(CHESTS) as ChestKind[]).map((kind) => (
          <div key={kind}>
            <ChestArt kind={kind} />
            <strong>{t(CHESTS[kind].title)}</strong>
            <span>
              +{CHESTS[kind].count} {t('common.letters')}
            </span>
          </div>
        ))}
      </div>
    );
  return (
    <svg
      className="lesson-picture"
      viewBox="0 0 560 180"
      role="img"
      aria-label={
        [
          t('tutorial.controlsPicture'),
          t('tutorial.boostPicture'),
          t('tutorial.collectPicture'),
          '',
          t('tutorial.portalPicture'),
          t('tutorial.wordPicture'),
          t('tutorial.revivePicture'),
        ][step]
      }
    >
      <defs>
        <pattern id="lesson-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#24394b" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="560" height="180" rx="16" fill="#101b29" />
      <rect width="560" height="180" rx="16" fill="url(#lesson-grid)" opacity=".55" />
      {step <= 4 && (
        <g>
          <path
            d={step === 0 ? 'M64 125H152V73' : 'M64 100H202'}
            stroke="#00b4d8"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={step === 0 ? 'M112 125H152V73' : 'M122 100H202'}
            stroke="#2ee6a0"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={step === 0 ? 152 : 204} cy={step === 0 ? 69 : 100} r="18" fill="#2ee6a0" />
          {[0, 1].map((i) => (
            <g key={i}>
              <circle
                cx={step === 0 ? 145 + i * 14 : 211}
                cy={step === 0 ? 62 : 92 + i * 16}
                r="5"
                fill="#fff"
              />
              <circle
                cx={step === 0 ? 145 + i * 14 : 213}
                cy={step === 0 ? 60 : 92 + i * 16}
                r="2.5"
                fill="#102232"
              />
            </g>
          ))}
        </g>
      )}
      {step === 0 && (
        <g fill="#1f3449" stroke="#3d5a70">
          {[
            [365, 25, '↑'],
            [309, 82, '←'],
            [365, 82, '↓'],
            [421, 82, '→'],
          ].map(([x, y, key]) => (
            <g key={String(key)}>
              <rect x={x} y={y} width="48" height="46" rx="8" />
              <text
                x={Number(x) + 24}
                y={Number(y) + 30}
                textAnchor="middle"
                stroke="none"
                fill="#8bf5d3"
                fontSize="26"
              >
                {key}
              </text>
            </g>
          ))}
          <text x="389" y="154" textAnchor="middle" stroke="none" fill="#b5c8dc" fontSize="14">
            W A S D
          </text>
        </g>
      )}
      {step === 1 && (
        <g>
          <path
            d="M34 70H102M25 90H50M35 129H91"
            stroke="#50b4df"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="320" y="53" width="157" height="66" rx="12" fill="#223a4c" stroke="#5a8ca0" />
          <text x="399" y="95" textAnchor="middle" fill="#e6fff6" fontSize="28" fontWeight="700">
            ⇧ Shift
          </text>
          <text x="399" y="146" textAnchor="middle" fill="#2ee6a0" fontSize="16">
            × 1.7
          </text>
        </g>
      )}
      {step === 2 && (
        <g>
          <rect x="260" y="77" width="44" height="44" rx="10" fill="#f1c40f" />
          <text x="282" y="108" textAnchor="middle" fill="#19202a" fontSize="27" fontWeight="700">
            C
          </text>
          <path d="M329 100H377m-10-8 10 8-10 8" stroke="#2ee6a0" strokeWidth="3" fill="none" />
          <rect x="400" y="58" width="101" height="87" rx="15" fill="#1c3544" stroke="#3b796d" />
          <text x="450" y="102" textAnchor="middle" fill="#f1c40f" fontSize="28" fontWeight="700">
            C
          </text>
          <text x="450" y="132" textAnchor="middle" fill="#b6d2dd" fontSize="13">
            {' '}
            {t('tutorial.bagPicture')}{' '}
          </text>
        </g>
      )}
      {step === 4 && (
        <g>
          <path d="M275 100H326m-10-9 10 9-10 9" fill="none" stroke="#2ee6a0" strokeWidth="3" />
          <path
            d="M366 142V66a45 45 0 0 1 90 0v76Z"
            fill="#103f36"
            stroke="#2ee6a0"
            strokeWidth="5"
          />
          <path d="M380 142V67a31 31 0 0 1 62 0v75Z" fill="#1a8062" />
          <text x="411" y="108" textAnchor="middle" fontSize="37" fill="#baffdd">
            ✧
          </text>
        </g>
      )}
      {step === 5 && (
        <g>
          {['C', 'A', 'T'].map((letter, i) => (
            <g key={letter}>
              <rect
                x={93 + i * 67}
                y="59"
                width="55"
                height="62"
                rx="11"
                fill={['#f1c40f', '#b778ff', '#2ee6a0'][i]}
              />
              <text
                x={120 + i * 67}
                y="101"
                textAnchor="middle"
                fill="#142330"
                fontSize="30"
                fontWeight="700"
              >
                {letter}
              </text>
            </g>
          ))}
          <path d="M318 90H353m-10-8 10 8-10 8" fill="none" stroke="#6fdebb" strokeWidth="3" />
          <rect x="376" y="61" width="108" height="58" rx="11" fill="#203e46" stroke="#2ee6a0" />
          <text x="430" y="98" textAnchor="middle" fill="#e5fff7" fontSize="20">
            Enter ↵
          </text>
        </g>
      )}
      {step === 6 && (
        <g>
          <text x="168" y="103" fill="#ff7187" fontSize="46" textAnchor="middle">
            ♥ ♥ ♥
          </text>
          <text x="168" y="136" fill="#b6cadd" fontSize="14" textAnchor="middle">
            {' '}
            {t('tutorial.heartsPicture')}{' '}
          </text>
          <rect x="327" y="55" width="65" height="67" rx="10" fill="#20394a" stroke="#59758c" />
          <text x="359" y="99" fill="#dffff3" fontSize="30" textAnchor="middle">
            P
          </text>
          <text x="427" y="98" fill="#b6cadd" fontSize="18">
            / Esc
          </text>
        </g>
      )}
    </svg>
  );
}
export default function TutorialLesson({
  step,
  notice,
  onContinue,
  onHome,
}: {
  step: number;
  notice: string;
  onContinue: () => void;
  onHome: () => void;
}) {
  const { t, language } = useI18n();
  const LESSONS = getLessons(language);
  const lesson = LESSONS[step];
  return (
    <Modal title={lesson.title} onClose={onContinue} wide className="tutorial-modal">
      <div
        className="lesson-progress"
        aria-label={t('tutorial.step', { current: step + 1, total: LESSONS.length })}
      >
        <span>
          {' '}
          {t('tutorial.lessonLabel')} {step + 1} / {LESSONS.length}
        </span>
        <div>
          {LESSONS.map((_, i) => (
            <i key={i} className={i <= step ? 'complete' : ''} />
          ))}
        </div>
      </div>
      <LessonPicture step={step} />
      <h3 className="lesson-summary">{lesson.summary}</h3>
      <ul className="lesson-details">
        {lesson.details.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div className="soft-note">{notice || lesson.tip}</div>
      <p className="lesson-paused">{t('tutorial.readAtPace')}</p>
      <button className="button primary full" autoFocus onClick={onContinue}>
        {lesson.action} <span>→</span>
      </button>
      <button className="text-button centered" onClick={onHome}>
        {' '}
        {t('common.home')}{' '}
      </button>
    </Modal>
  );
}
