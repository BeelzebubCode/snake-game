import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { Translator } from '../i18n';

function getReviews(t: Translator) {
  const reviews: Record<number, { title: string; text: string; action: string }> = {
    0: {
      title: t('review.steerTitle'),
      text: t('review.steerText'),
      action: t('review.steerNext'),
    },
    1: {
      title: t('review.boostTitle'),
      text: t('review.boostText'),
      action: t('review.boostNext'),
    },
    2: {
      title: t('review.collectTitle'),
      text: t('review.collectText'),
      action: t('review.collectNext'),
    },
    3: {
      title: t('review.chestTitle'),
      text: t('review.chestText'),
      action: t('review.chestNext'),
    },
    6: {
      title: t('review.brickTitle'),
      text: t('review.brickText'),
      action: t('review.brickNext'),
    },
  };
  return reviews;
}
export default function TutorialReview({
  step,
  onContinue,
}: {
  step: number;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const reviews = getReviews(t);
  const ref = useRef<HTMLElement>(null);
  const review = reviews[step];
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, []);
  if (!review) return null;
  return (
    <section ref={ref} tabIndex={-1} className="tutorial-review" aria-labelledby="review-title">
      <div>
        <span className="eyebrow">{t('review.paused')}</span>
        <h2 id="review-title">{review.title}</h2>
        <p>{review.text}</p>
      </div>
      <button className="button primary" onClick={onContinue}>
        {review.action}
      </button>
    </section>
  );
}
