import { translator } from '../i18n/messages';
import type { Language } from './types';
export function getLessons(language: Language) {
  const t = translator(language);
  return [
    {
      title: t('lesson.steer.title'),
      summary: t('lesson.steer.summary'),
      details: [t('lesson.steer.controls'), t('lesson.steer.mobile')],
      task: t('lesson.steer.task'),
      action: t('lesson.steer.action'),
      tip: t('lesson.steer.tip'),
    },
    {
      title: t('lesson.boost.title'),
      summary: t('lesson.boost.summary'),
      details: [t('lesson.boost.controls'), t('lesson.boost.mobile')],
      task: t('lesson.boost.task'),
      action: t('lesson.boost.action'),
      tip: t('lesson.boost.tip'),
    },
    {
      title: t('lesson.collect.title'),
      summary: t('lesson.collect.summary'),
      details: [t('lesson.collect.explain'), t('lesson.collect.spawns')],
      task: t('lesson.collect.task'),
      action: t('lesson.collect.action'),
      tip: t('lesson.collect.tip'),
    },
    {
      title: t('lesson.chest.title'),
      summary: t('lesson.chest.summary'),
      details: [t('lesson.chest.tiers'), t('lesson.chest.steps')],
      task: t('lesson.chest.task'),
      action: t('lesson.chest.action'),
      tip: t('lesson.chest.tip'),
    },
    {
      title: t('lesson.portal.title'),
      summary: t('lesson.portal.summary'),
      details: [t('lesson.portal.explain'), t('lesson.portal.clean')],
      task: t('lesson.portal.task'),
      action: t('lesson.portal.action'),
      tip: t('lesson.portal.tip'),
    },
    {
      title: t('lesson.word.title'),
      summary: t('lesson.word.summary'),
      details: [t('lesson.word.submit'), t('lesson.word.tools'), t('lesson.word.timer')],
      task: t('lesson.word.task'),
      action: t('lesson.word.action'),
      tip: t('lesson.word.tip'),
    },
    {
      title: t('lesson.hearts.title'),
      summary: t('lesson.hearts.summary'),
      details: [t('lesson.hearts.pause'), t('lesson.hearts.revive'), t('lesson.hearts.retry')],
      task: t('lesson.hearts.task'),
      action: t('lesson.hearts.action'),
      tip: t('lesson.hearts.tip'),
    },
  ] as const;
}
