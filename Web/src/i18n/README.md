# English / Thai UI

## Structure

- `en.ts` owns the English copy and the `MessageKey` union. Use familiar game terms: Inventory, Loot Chests, Revive, Resume, Game Over.
- `th.ts` implements `Record<MessageKey, string>` so TypeScript checks missing or unexpected keys.
- `messages.ts` is the shared, framework-independent translator used by game rules and tutorial data. Named parameters keep each sentence together. `Intl.PluralRules` selects optional `.one` / `.other` variants, falling back to the base key.
- `index.tsx` exposes `LanguageProvider` and `useI18n()` for React, synchronizing the document language, title, and description.

Both catalogs ship with the app. Switching between two small catalogs needs no network request or extra dependency. Keep gameplay values separate from translated labels: saved language codes are `en` / `th`, while map IDs, skin IDs, and gameplay rules stay stable.

## Adding text

1. Add a semantic key and complete English sentence to `en.ts`.
2. Add its Thai translation with the same named parameters to `th.ts`.
3. Use `t('key', { count, ... })` in UI or the engine's translator for game messages. Translate visible text, accessible labels, tutorial illustrations, and canvas labels.
4. Add a plural variant only when the wording changes with the count. Pass numeric `count` to select it.
5. Run `npm run verify`; inspect both languages on desktop and mobile when changing layout.

Keep English words, Thai dictionary meanings, and proper names (LexiSnake, skins, maps) separate from interface translations. Thai meanings use `lang="th"` when shown in the English UI. The speech service continues pronouncing English vocabulary.

## Settings and existing saves

`settings.language` defaults to `en`. Loading an older V2 save adds this default without resetting progress; unsupported language values also fall back to English.

Settings uses a draft and its own language provider. Changing Language previews the popup. Apply Settings persists the choice and updates the app; Cancel or Close discards the draft. No page reload is needed.

## Input feedback

`missingLetters()` counts inventory copies without consuming them. Typing and paste use the same validation, preserve the last valid draft, and show which copies are missing. A valid edit clears feedback and stale dictionary errors. An empty inventory makes the field read-only and displays a collect-letters message. The feedback region uses `aria-live="polite"` and is linked to the input.

## Checks

Unit tests validate catalog keys, parameter parity, English copy, plural forms, engine messages, and save migration. Browser tests cover both languages, the full tutorial, language preview/cancel/apply/reload, preserved progress, missing-letter feedback, revive, pause, game over, and mobile settings.
