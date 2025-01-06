/**
 * @file Japanese number file.
 * @author Optimized version
 */

import { Numbers, NUMBERS as NUMB } from '../messages.js';

interface NumberDictionary {
  [key: string]: string;
}

// Basic Japanese numbers with both 音読み and 訓読み options
const ONES: string[] = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const ONES_KANA: string[] = ['れい', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const TENS: string[] = ['', '十', '百', '千'];
const TENS_KANA: string[] = ['', 'じゅう', 'ひゃく', 'せん'];
const LARGE_NUMBERS: string[] = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極'];
const LARGE_NUMBERS_KANA: string[] = ['', 'まん', 'おく', 'ちょう', 'けい', 'がい', 'し', 'じょう', 'こう', 'かん', 'せい', 'さい', 'ごく'];

// Special readings for numbers
const SPECIAL_READINGS: NumberDictionary = {
  // 特殊な読み方（音読み）
  '300': '三百',
  '600': '六百',
  '800': '八百',
  '1000': '千',
  '3000': '三千',
  '8000': '八千',
  // 4と7の特殊な読み方
  '4': 'よん',
  '7': 'なな',
  '40': 'よんじゅう',
  '400': 'よんひゃく',
  '4000': 'よんせん',
  '70': 'ななじゅう',
  '700': 'ななひゃく',
  '7000': 'ななせん',
  // 100, 1000の特殊な読み方
  '100': 'ひゃく',
  // 特殊な読み方（訓読み）
  'hitotsu': '一つ',
  'futatsu': '二つ',
  'mittsu': '三つ',
  'yottsu': '四つ',
  'itsutsu': '五つ',
  'muttsu': '六つ',
  'nanatsu': '七つ',
  'yattsu': '八つ',
  'kokonotsu': '九つ',
  'too': '十'
};

// 助数詞の辞書
const COUNTERS: NumberDictionary = {
  'general': '個',
  'people': '人',
  'time': '回',
  'age': '歳',
  'hour': '時',
  'minute': '分',
  'month': '月',
  'day': '日',
  'floor': '階',
  'books': '冊',
  'small_animals': '匹',
  'long_objects': '本',
  'flat_objects': '枚',
  'machines': '台',
  'buildings': '棟'
};

/**
 * Convert a number to Japanese words with optional reading style.
 * @param num The number to convert.
 * @param style The reading style ('kanji' or 'kana', defaults to 'kanji').
 * @param counter Optional counter suffix.
 * @returns The Japanese reading of the number.
 */
function numberToWords(num: number, style: 'kanji' | 'kana' = 'kanji', counter?: string): string {
  console.log('[numberToWords] Input:', { num, style, counter });
  
  if (num === 0) {
    const result = style === 'kanji' ? ONES[0] : ONES_KANA[0];
    console.log('[numberToWords] Zero case:', result);
    return result;
  }
  
  if (num < 0) {
    const prefix = style === 'kanji' ? 'マイナス' : 'まいなす';
    const result = prefix + numberToWords(Math.abs(num), style);
    console.log('[numberToWords] Negative case:', result);
    return result;
  }
  
  // Check for special readings first
  const specialReading = SPECIAL_READINGS[num.toString()];
  if (specialReading && !counter) {
    console.log('[numberToWords] Special reading:', specialReading);
    return specialReading;
  }

  let result = '';
  let groupCount = 0;
  let tempNum = num;
  
  console.log('[numberToWords] Starting group processing for:', tempNum);
  
  while (tempNum > 0) {
    const group = tempNum % 10000;
    if (group !== 0) {
      const groupText = convertGroup(group, style);
      console.log('[numberToWords] Group processing:', { 
        group, 
        groupText, 
        groupCount,
        currentResult: result 
      });
      
      if (groupCount > 0) {
        result = groupText + (style === 'kanji' ? LARGE_NUMBERS[groupCount] : LARGE_NUMBERS_KANA[groupCount]) + result;
      } else {
        result = groupText + result;
      }
    }
    tempNum = Math.floor(tempNum / 10000);
    groupCount++;
  }
  
  // Add counter if specified
  if (counter && COUNTERS[counter]) {
    console.log('[numberToWords] Adding counter:', counter);
    result += COUNTERS[counter];
  }
  
  console.log('[numberToWords] Final result:', result);
  return result;
}

/**
 * Convert a group of up to 4 digits to Japanese.
 * @param num The number group to convert (0-9999).
 * @param style The reading style ('kanji' or 'kana').
 * @returns The Japanese reading of the number group.
 */
function convertGroup(num: number, style: 'kanji' | 'kana' = 'kanji'): string {
  console.log('[convertGroup] Input:', { num, style });
  
  let result = '';
  let digits = num.toString().split('').map(Number).reverse();
  
  console.log('[convertGroup] Digits:', digits);
  
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] === 0) {
      console.log('[convertGroup] Skipping zero at position:', i);
      continue;
    }
    
    // Special handling for 4 and 7
    if (style === 'kana' && (digits[i] === 4 || digits[i] === 7)) {
      const reading = digits[i] === 4 ? 'よん' : 'なな';
      const suffix = i > 0 ? TENS_KANA[i] : '';
      result = reading + suffix + result;
      console.log('[convertGroup] Special reading for 4/7:', { 
        digit: digits[i], 
        reading, 
        suffix, 
        result 
      });
      continue;
    }
    
    if (digits[i] === 1 && i > 0) {
      result = (style === 'kanji' ? TENS[i] : TENS_KANA[i]) + result;
      console.log('[convertGroup] Single digit case:', result);
    } else {
      const digitReading = style === 'kanji' ? ONES[digits[i]] : ONES_KANA[digits[i]];
      const positionReading = i > 0 ? (style === 'kanji' ? TENS[i] : TENS_KANA[i]) : '';
      result = digitReading + positionReading + result;
      console.log('[convertGroup] Normal case:', { 
        digit: digits[i], 
        digitReading, 
        positionReading, 
        result 
      });
    }
  }
  
  console.log('[convertGroup] Final result:', result);
  return result;
}

/**
 * Convert a number to Japanese ordinal form.
 * @param num The number to convert.
 * @param plural A flag indicating plural (not used in Japanese).
 * @returns The Japanese ordinal form of the number.
 */
function numberToOrdinal(num: number, _plural: boolean): string {
  // 先获取数字的基本读法，总是使用假名形式
  const baseReading = numberToWords(num, 'kana');
  // 添加序数后缀
  return baseReading + '番目';
}

/**
 * Convert a number to Japanese counter form.
 * @param num The number to convert.
 * @param counter The type of counter to use.
 * @param style The reading style ('kanji' or 'kana').
 * @returns The Japanese counter form of the number.
 */
function numberWithCounter(num: number, counter: string, style: 'kanji' | 'kana' = 'kanji'): string {
  return numberToWords(num, style, counter);
}

/**
 * Get the appropriate counter for a given category.
 * @param category The category of items being counted.
 * @returns The appropriate counter or the general counter if not found.
 */
function getCounter(category: string): string {
  return COUNTERS[category] || COUNTERS['general'];
}

// Export the Japanese number functions
export const NUMBERS: Numbers = {
  ...NUMB(),
  numberToWords: (num: number, style?: string) => {
    console.log('[NUMBERS.numberToWords] Called with:', { num, style });
    try {
      // 如果没有指定 style，默认使用 kana 形式
      const actualStyle = style || 'kana';
      const result = numberToWords(num, actualStyle as 'kanji' | 'kana');
      console.log('[NUMBERS.numberToWords] Result:', result);
      return result;
    } catch (error) {
      console.error('[NUMBERS.numberToWords] Error:', error);
      throw error;
    }
  },
  numberToOrdinal: (num: number, plural: boolean) => {
    console.log('[NUMBERS.numberToOrdinal] Called with:', { num, plural });
    try {
      const result = numberToOrdinal(num, plural);
      console.log('[NUMBERS.numberToOrdinal] Result:', result);
      return result;
    } catch (error) {
      console.error('[NUMBERS.numberToOrdinal] Error:', error);
      throw error;
    }
  },
  wordOrdinal: (num: number) => {
    console.log('[NUMBERS.wordOrdinal] Called with:', num);
    try {
      const result = numberToOrdinal(num, false);
      console.log('[NUMBERS.wordOrdinal] Result:', result);
      return result;
    } catch (error) {
      console.error('[NUMBERS.wordOrdinal] Error:', error);
      return num.toString() + '番目';
    }
  },
  numericOrdinal: (num: number) => {
    console.log('[NUMBERS.numericOrdinal] Called with:', num);
    try {
      const result = num.toString() + '番';
      console.log('[NUMBERS.numericOrdinal] Result:', result);
      return result;
    } catch (error) {
      console.error('[NUMBERS.numericOrdinal] Error:', error);
      return num.toString() + '番';
    }
  },
  numberWithCounter,
  getCounter,
  zero: '零',
  ones: ONES,
  tens: TENS,
  large: LARGE_NUMBERS,
  numSep: '',
  vulgarSep: '分の',
  special: {
    counters: Object.entries(COUNTERS).map(([key, value]) => `${key}:${value}`),
    readings: Object.entries(SPECIAL_READINGS).map(([key, value]) => `${key}:${value}`),
    ordinals: ['零番目', '一番目', '二番目', '三番目', 'よん番目', '五番目', '六番目', 'なな番目', '八番目', '九番目'],
    smallOrdinals: ['零番目', '一番目', '二番目', '三番目', 'よん番目', '五番目', '六番目', 'なな番目', '八番目', '九番目'],
    fractions: ['よん分の一', 'よん分の二', 'よん分の三', '二分の一', '三分の一', '三分の二']
  }
}; 