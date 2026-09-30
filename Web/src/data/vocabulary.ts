import type { Level, Word, VocabularyFilter } from '../game/types';

// A small, reviewed set supplies clear revival prompts and works when the larger dictionary cannot load.
const starterPairs = [
  ['CAT', 'แมว'],
  ['DOG', 'สุนัข'],
  ['SUN', 'ดวงอาทิตย์'],
  ['SKY', 'ท้องฟ้า'],
  ['TREE', 'ต้นไม้'],
  ['BOOK', 'หนังสือ'],
  ['FISH', 'ปลา'],
  ['BIRD', 'นก'],
  ['MILK', 'นม'],
  ['APPLE', 'แอปเปิล'],
  ['HOUSE', 'บ้าน'],
  ['WATER', 'น้ำ'],
  ['MOON', 'ดวงจันทร์'],
  ['RAIN', 'ฝน'],
  ['FLOWER', 'ดอกไม้'],
  ['GARDEN', 'สวน'],
  ['HAPPY', 'มีความสุข'],
  ['GREEN', 'สีเขียว'],
  ['RED', 'สีแดง'],
  ['BLUE', 'สีน้ำเงิน'],
  ['EGG', 'ไข่'],
  ['CUP', 'ถ้วย'],
  ['BED', 'เตียง'],
  ['PEN', 'ปากกา'],
  ['BAG', 'กระเป๋า'],
  ['HAT', 'หมวก'],
  ['CAR', 'รถยนต์'],
  ['BUS', 'รถโดยสาร'],
  ['BOX', 'กล่อง'],
  ['KEY', 'กุญแจ'],
  ['SEA', 'ทะเล'],
  ['TEA', 'ชา'],
  ['ICE', 'น้ำแข็ง'],
  ['MAP', 'แผนที่'],
  ['ANT', 'มด'],
  ['BEE', 'ผึ้ง'],
  ['FOX', 'สุนัขจิ้งจอก'],
  ['PIG', 'หมู'],
  ['COW', 'วัว'],
  ['HEN', 'แม่ไก่'],
  ['DUCK', 'เป็ด'],
  ['FROG', 'กบ'],
  ['BEAR', 'หมี'],
  ['LION', 'สิงโต'],
  ['RABBIT', 'กระต่าย'],
  ['DOOR', 'ประตู'],
  ['CAKE', 'เค้ก'],
  ['RICE', 'ข้าว'],
  ['SALT', 'เกลือ'],
  ['SOAP', 'สบู่'],
  ['SHOE', 'รองเท้า'],
  ['SOCK', 'ถุงเท้า'],
  ['HAND', 'มือ'],
  ['NOSE', 'จมูก'],
  ['EYE', 'ตา'],
  ['EAR', 'หู'],
  ['LEG', 'ขา'],
  ['ARM', 'แขน'],
  ['HAIR', 'ผม'],
  ['HEAD', 'ศีรษะ'],
  ['STAR', 'ดวงดาว'],
  ['BALL', 'ลูกบอล'],
  ['BOAT', 'เรือ'],
  ['BIKE', 'จักรยาน'],
  ['TRAIN', 'รถไฟ'],
  ['CLOUD', 'เมฆ'],
  ['GRASS', 'หญ้า'],
  ['LEAF', 'ใบไม้'],
  ['ROSE', 'ดอกกุหลาบ'],
  ['STONE', 'ก้อนหิน'],
  ['BREAD', 'ขนมปัง'],
  ['FRUIT', 'ผลไม้'],
  ['JUICE', 'น้ำผลไม้'],
  ['SOUP', 'ซุป'],
  ['SUGAR', 'น้ำตาล'],
  ['SNAKE', 'งู'],
  ['SMILE', 'รอยยิ้ม'],
  ['SMALL', 'เล็ก'],
  ['BIG', 'ใหญ่'],
  ['JOY', 'ความสุข'],
] as const;
export const STARTER_WORDS: Word[] = starterPairs.map(([word, meaningTh]) => ({
  word,
  meaningTh,
  level: 'A1',
}));
export const REVIVAL_WORDS = STARTER_WORDS.filter(
  (entry) => entry.word.length >= 3 && entry.word.length <= 5,
);
export const normalizeWord = (text: string) => text.trim().toUpperCase();
export function canBuild(word: string, letters: string[]): boolean {
  const counts = new Map<string, number>();
  letters.forEach((letter) => counts.set(letter, (counts.get(letter) ?? 0) + 1));
  for (const letter of word) {
    const count = counts.get(letter) ?? 0;
    if (!count) return false;
    counts.set(letter, count - 1);
  }
  return true;
}
export function scoreWord(entry: Word): number {
  const perLetter: Record<Level, number> = { A1: 100, A2: 150, B1: 200, B2: 300, C1: 450, C2: 600 };
  return entry.word.length * (perLetter[entry.level] + 50);
}
export function matchesLevel(level: Level, filter: VocabularyFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'easy') return ['A1', 'A2'].includes(level);
  if (filter === 'medium') return ['B1', 'B2'].includes(level);
  if (filter === 'hard') return ['C1', 'C2'].includes(level);
  return level === filter;
}
export class Vocabulary {
  entries = new Map<string, Word>(STARTER_WORDS.map((entry) => [entry.word, entry]));
  find(word: string) {
    return this.entries.get(normalizeWord(word));
  }
  hint(letters: string[], level: VocabularyFilter): Word | undefined {
    return [...this.entries.values()].find(
      (entry) => matchesLevel(entry.level, level) && canBuild(entry.word, letters),
    );
  }
  add(entries: Word[]) {
    for (const entry of entries) {
      if (
        /^[A-Z]{2,24}$/.test(entry.word) &&
        typeof entry.meaningTh === 'string' &&
        ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(entry.level)
      )
        this.entries.set(entry.word, entry);
    }
    // Prefer concise, checked glosses for the beginner and revival words.
    for (const entry of STARTER_WORDS) this.entries.set(entry.word, entry);
  }
}
export const vocabulary = new Vocabulary();
let dictionaryRequest: Promise<boolean> | undefined;
export function loadDictionary(): Promise<boolean> {
  return (dictionaryRequest ??= fetch(import.meta.env.BASE_URL + 'data/vocabulary.json')
    .then(async (response) => {
      if (!response.ok) throw new Error('Dictionary unavailable');
      const entries: Word[] = await response.json();
      if (!Array.isArray(entries)) throw new Error('Invalid dictionary');
      vocabulary.add(entries);
      return true;
    })
    .catch(() => {
      dictionaryRequest = undefined;
      return false;
    }));
}
