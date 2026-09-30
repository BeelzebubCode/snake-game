import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../game/types';
import { translator } from './messages';
import type { Translator } from './messages';
export { catalogs, translate, translator } from './messages';
export type { MessageKey, Params, Translator } from './messages';
const LanguageContext = createContext<{ language: Language; t: Translator }>({
  language: 'en',
  t: translator('en'),
});
export function LanguageProvider({
  language,
  children,
  syncDocument = true,
}: {
  language: Language;
  children: ReactNode;
  syncDocument?: boolean;
}) {
  const value = useMemo(() => ({ language, t: translator(language) }), [language]);
  useEffect(() => {
    if (!syncDocument) return;
    document.documentElement.lang = language;
    document.title = value.t('app.title');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', value.t('app.description'));
  }, [language, syncDocument, value]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useI18n = () => useContext(LanguageContext);
