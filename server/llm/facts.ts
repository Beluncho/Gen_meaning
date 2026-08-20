import type {
  DeterministicFactCheck,
  FactLedger,
} from './types.ts';

const NUMBER_PATTERN =
  /(?<![\p{L}\d])(?:[$€£₽]\s*)?\d+(?:[.,]\d+)?(?:\s?(?:%|млн|млрд|тыс\.?|тысяч|миллионов|миллиардов))?(?![\p{L}\d])/giu;
const DATE_PATTERN =
  /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}|\d{4}\s*года?)\b/giu;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/giu;
const QUOTE_PATTERN = /«[^»\n]{1,500}»|"[^"\n]{1,500}"/gu;
const ENTITY_PATTERN =
  /\b(?:[A-ZА-ЯЁ][\p{L}\d.-]*(?:\s+[A-ZА-ЯЁ][\p{L}\d.-]*){0,3})\b/gu;

const COMMON_WORDS = new Set([
  'Компания',
  'Глава',
  'Гендиректор',
  'Исследование',
  'Некоторые',
  'Пользователи',
  'Российских',
  'Сотрудники',
  'Стартап',
  'Тайвань',
  'В',
  'На',
  'По',
  'Это',
]);

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeFact(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru-RU');
}

function collect(pattern: RegExp, text: string): string[] {
  return unique([...text.matchAll(pattern)].map((match) => match[0]));
}

function extractEntities(text: string): string[] {
  return unique(
    [...text.matchAll(ENTITY_PATTERN)]
      .filter((match) => {
        const value = match[0].trim();
        const previous = text[match.index - 1] || '';
        return (
          value.length > 1 &&
          !COMMON_WORDS.has(value) &&
          (/[A-Z]/.test(value) || value.includes(' ') || /[A-ZА-ЯЁ]{2,}/.test(value)) &&
          !/[.!?]/.test(previous)
        );
      })
      .map((match) => match[0]),
  );
}

export function extractFactLedger(text: string): FactLedger {
  return {
    numbers: collect(NUMBER_PATTERN, text),
    dates: collect(DATE_PATTERN, text),
    urls: collect(URL_PATTERN, text),
    quotes: collect(QUOTE_PATTERN, text),
    entities: extractEntities(text),
  };
}

function multisetDifference(source: string[], target: string[]): string[] {
  const remaining = new Map<string, number>();
  for (const value of target) {
    const normalized = normalizeFact(value);
    remaining.set(normalized, (remaining.get(normalized) || 0) + 1);
  }

  const missing: string[] = [];
  for (const value of source) {
    const normalized = normalizeFact(value);
    const count = remaining.get(normalized) || 0;
    if (count > 0) {
      remaining.set(normalized, count - 1);
    } else {
      missing.push(value);
    }
  }
  return missing;
}

function differenceByKey(
  source: string[],
  target: string[],
): string[] {
  return multisetDifference(source, target);
}

export function checkDeterministicFacts(
  originalText: string,
  rewrittenText: string,
): DeterministicFactCheck {
  const original = extractFactLedger(originalText);
  const rewritten = extractFactLedger(rewrittenText);
  const fields: (keyof FactLedger)[] = [
    'numbers',
    'dates',
    'urls',
    'quotes',
  ];
  const missing: Partial<FactLedger> = {};
  const added: Partial<FactLedger> = {};

  for (const field of fields) {
    const missingValues = differenceByKey(original[field], rewritten[field]);
    const addedValues = differenceByKey(rewritten[field], original[field]);
    if (missingValues.length) missing[field] = missingValues;
    if (addedValues.length) added[field] = addedValues;
  }

  return {
    passed: Object.keys(missing).length === 0 && Object.keys(added).length === 0,
    missing,
    added,
  };
}
