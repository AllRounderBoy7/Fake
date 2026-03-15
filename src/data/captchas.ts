import { CaptchaTask, CaptchaType } from '../types';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ══════════════════════════════════════════════════════════════
//  EASY CAPTCHA SYSTEM — NO TIMER, SIMPLE TASKS
// ══════════════════════════════════════════════════════════════

const EASY_WORDS = [
  'APPLE', 'BANANA', 'ORANGE', 'MANGO', 'GRAPES',
  'DOG', 'CAT', 'BIRD', 'FISH', 'LION',
  'RED', 'BLUE', 'GREEN', 'YELLOW', 'PINK',
  'SUN', 'MOON', 'STAR', 'RAIN', 'SNOW',
  'BOOK', 'PEN', 'DESK', 'CHAIR', 'TABLE',
  'WATER', 'JUICE', 'MILK', 'TEA', 'COFFEE',
];

const SIMPLE_MATH = [
  { display: '2 + 3 = ?', answer: '5' },
  { display: '5 + 4 = ?', answer: '9' },
  { display: '7 + 2 = ?', answer: '9' },
  { display: '6 + 3 = ?', answer: '9' },
  { display: '8 + 1 = ?', answer: '9' },
  { display: '4 + 5 = ?', answer: '9' },
  { display: '3 + 6 = ?', answer: '9' },
  { display: '10 - 3 = ?', answer: '7' },
  { display: '9 - 4 = ?', answer: '5' },
  { display: '8 - 2 = ?', answer: '6' },
  { display: '7 - 5 = ?', answer: '2' },
  { display: '6 - 1 = ?', answer: '5' },
  { display: '2 × 3 = ?', answer: '6' },
  { display: '4 × 2 = ?', answer: '8' },
  { display: '5 × 2 = ?', answer: '10' },
  { display: '3 × 3 = ?', answer: '9' },
  { display: '2 × 4 = ?', answer: '8' },
  { display: '6 ÷ 2 = ?', answer: '3' },
  { display: '8 ÷ 4 = ?', answer: '2' },
  { display: '10 ÷ 5 = ?', answer: '2' },
  { display: '9 ÷ 3 = ?', answer: '3' },
  { display: '12 ÷ 4 = ?', answer: '3' },
];

const EMOJI_SETS = [
  { emoji: '⭐', count: 3 },
  { emoji: '⭐', count: 4 },
  { emoji: '⭐', count: 5 },
  { emoji: '🔴', count: 3 },
  { emoji: '🔴', count: 4 },
  { emoji: '🔴', count: 5 },
  { emoji: '💎', count: 3 },
  { emoji: '💎', count: 4 },
  { emoji: '🍎', count: 3 },
  { emoji: '🍎', count: 4 },
  { emoji: '🍎', count: 5 },
  { emoji: '🎯', count: 3 },
  { emoji: '🎯', count: 4 },
];

const SIMPLE_SEQUENCE = [
  { display: '1, 2, 3, ___', answer: '4' },
  { display: '2, 4, 6, ___', answer: '8' },
  { display: '5, 10, 15, ___', answer: '20' },
  { display: '3, 6, 9, ___', answer: '12' },
  { display: '10, 20, 30, ___', answer: '40' },
  { display: '1, 3, 5, ___', answer: '7' },
  { display: '2, 5, 8, ___', answer: '11' },
  { display: '4, 8, 12, ___', answer: '16' },
];

const SIMPLE_MISSING = [
  { display: '_ + 2 = 5', answer: '3' },
  { display: '_ + 3 = 7', answer: '4' },
  { display: '_ + 4 = 9', answer: '5' },
  { display: '10 - _ = 6', answer: '4' },
  { display: '8 - _ = 3', answer: '5' },
  { display: '_ × 2 = 6', answer: '3' },
  { display: '_ × 3 = 9', answer: '3' },
  { display: '_ × 4 = 8', answer: '2' },
];

export function generateCaptcha(): CaptchaTask {
  // EASY CAPTCHA TYPES ONLY
  const easyTypes: CaptchaType[] = [
    'word', 'math_add', 'emoji_count',
  ];
  const type = pick(easyTypes);
  const id = Date.now() + Math.random();

  switch (type) {
    case 'word': {
      const word = pick(EASY_WORDS);
      return {
        id,
        text: word,
        reward: 20,
        type,
        timeLimit: 9999, // No time limit
        difficulty: 'easy',
        hint: 'Type the word shown above',
      };
    }

    case 'math_add': {
      const m = pick(SIMPLE_MATH);
      return {
        id,
        text: m.display,
        reward: 20,
        type,
        timeLimit: 9999,
        difficulty: 'easy',
        hint: 'Solve this simple math',
      };
    }

    case 'emoji_count': {
      const e = pick(EMOJI_SETS);
      return {
        id,
        text: e.emoji.repeat(e.count),
        reward: 20,
        type,
        timeLimit: 9999,
        difficulty: 'easy',
        hint: 'Count the emojis',
      };
    }

    case 'sequence': {
      const s = pick(SIMPLE_SEQUENCE);
      return {
        id,
        text: s.display,
        reward: 20,
        type,
        timeLimit: 9999,
        difficulty: 'easy',
        hint: 'Find the next number in the pattern',
      };
    }

    case 'missing_number': {
      const m = pick(SIMPLE_MISSING);
      return {
        id,
        text: m.display,
        reward: 20,
        type,
        timeLimit: 9999,
        difficulty: 'easy',
        hint: 'Find the missing number',
      };
    }

    default: {
      const word = pick(EASY_WORDS);
      return {
        id,
        text: word,
        reward: 20,
        type: 'word',
        timeLimit: 9999,
        difficulty: 'easy',
        hint: 'Type the word shown above',
      };
    }
  }
}

export function solveCaptcha(task: CaptchaTask, answer: string): boolean {
  const a = answer.trim();

  switch (task.type) {
    case 'word':
      return a.toUpperCase() === task.text.toUpperCase();

    case 'math_add':
    case 'math_sub':
    case 'math_mul':
    case 'math_div': {
      const found = SIMPLE_MATH.find(m => m.display === task.text);
      return found ? a === found.answer : false;
    }

    case 'emoji_count': {
      const found = EMOJI_SETS.find(e => e.emoji.repeat(e.count) === task.text);
      return found ? a === String(found.count) : false;
    }

    case 'sequence': {
      const found = SIMPLE_SEQUENCE.find(s => s.display === task.text);
      return found ? a === found.answer : false;
    }

    case 'missing_number': {
      const found = SIMPLE_MISSING.find(m => m.display === task.text);
      return found ? a === found.answer : false;
    }

    default:
      return a.toUpperCase() === task.text.toUpperCase();
  }
}
