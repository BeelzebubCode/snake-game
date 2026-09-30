import type { Language } from '../game/types';
import { en } from './en';
import type { MessageKey } from './en';
import { th } from './th';
export type { MessageKey } from './en';
export type Params = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: Params) => string;
export const catalogs = { en, th };
const pluralRules = { en: new Intl.PluralRules('en'), th: new Intl.PluralRules('th') };
export function translate(language: Language, key: MessageKey, params: Params = {}): string {
  const catalog: Record<string, string> = catalogs[language];
  const pluralKey =
    typeof params.count === 'number' ? `${key}.${pluralRules[language].select(params.count)}` : key;
  const message = catalog[pluralKey] ?? catalog[key];
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
export const translator =
  (language: Language): Translator =>
  (key, params) =>
    translate(language, key, params);
