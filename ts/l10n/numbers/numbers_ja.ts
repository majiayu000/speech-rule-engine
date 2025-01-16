/**
 * @file Japanese number file.
 * @author Enhanced version with better context support
 */

import { Numbers, NUMBERS as NUMB } from '../messages.js';
import { Grammar } from '../../rule_engine/grammar.js';

interface NumberDictionary {
  [key: string]: string;
}

interface NumberContext {
  type?: 'date' | 'time' | 'phone' | 'price' | 'counter' | 'age' | 'general';
  counter?: keyof typeof COUNTERS;
  style?: 'formal' | 'casual';
}

// 基本数字 - 音読み
const ONES: string[] = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const ONES_KUNYOMI: string[] = ['ゼロ', 'ひと', 'ふた', 'み', 'よ', 'いつ', 'む', 'なな', 'や', 'ここの'];
const TENS: string[] = ['', '十', '百', '千'];
const LARGE_NUMBERS: string[] = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極'];

// 助数词表
const COUNTERS = {
  general: '個',
  cylindrical: '本',
  flat: '枚',
  machine: '台',
  people: '人',
  age: '歳',
  time: '時',
  minute: '分',
  second: '秒',
  year: '年',
  month: '月',
  day: '日',
  floor: '階',
  frequency: '回',
  books: '冊',
  small_animals: '匹',
  long_objects: '本',
  vehicles: '台'
} as const;

// 特殊读法
const SPECIAL_READINGS: NumberDictionary = {
  // 基本特殊读法
  '0': 'れい',
  '4': 'よん',
  '7': 'なな',
  '9': 'きゅう',
  // 十位数特殊读法
  '40': 'よんじゅう',
  '70': 'ななじゅう',
  '90': 'きゅうじゅう',
  // 百位数特殊读法
  '300': '三百',
  '400': 'よんひゃく',
  '600': '六百',
  '700': 'ななひゃく',
  '800': '八百',
  '900': 'きゅうひゃく',
  // 千位数特殊读法
  '1000': '千',
  '3000': '三千',
  '4000': 'よんせん',
  '7000': 'ななせん',
  '8000': '八千',
  // 年号特殊读法
  '2024年': '二千二十四年',
  // 时间特殊读法
  '時': 'じ',
  '分': 'ふん',
  '秒': 'びょう',
  // 金额特殊读法
  '円': 'えん',
  '銭': 'せん'
};

// 序数表
const SPECIAL_ORDINALS: NumberDictionary = {
  '1': '一番目',
  '2': '二番目',
  '3': '三番目',
  '4': 'よん番目',
  '5': '五番目',
  '6': '六番目',
  '7': 'なな番目',
  '8': '八番目',
  '9': '九番目',
  '10': '十番目'
};

/**
 * 处理分数
 * @param numerator 分子
 * @param denominator 分母
 * @returns 分数的日语读法
 */
function processFraction(numerator: number, denominator: number): string {
  // 特殊分数处理
  if (numerator === 1) {
    if (denominator === 2) return '二分の一';
    if (denominator === 3) return '三分の一';
    if (denominator === 4) return '四分の一';
  }
  
  return `${numberToWords(numerator)}分の${numberToWords(denominator)}`;
}

/**
 * 获取数字的训读み
 * @param num 数字
 * @returns 训读み形式
 */
function getKunyomi(num: number): string {
  if (num < 10) {
    return ONES_KUNYOMI[num];
  }
  return numberToWords(num); // 大于9的数字使用音读み
}

/**
 * 处理时间表达
 * @param hour 小时
 * @param minute 分钟
 * @returns 时间的日语表达
 */
function processTime(hour: number, minute: number): string {
  let result = '';
  
  // 处理小时
  if (hour === 0) {
    result = '零時';
  } else if (hour === 1) {
    result = '一時';
  } else {
    result = numberToWords(hour) + '時';
  }
  
  // 处理分钟
  if (minute > 0) {
    if (minute === 30) {
      result += '半';
    } else {
      result += numberToWords(minute) + '分';
    }
  }
  
  return result;
}

/**
 * 处理日期表达
 * @param year 年
 * @param month 月
 * @param day 日
 * @returns 日期的日语表达
 */
function processDate(year: number, month: number, day: number): string {
  let result = '';
  
  // 处理年
  if (year) {
    result = numberToWords(year) + '年';
  }
  
  // 处理月
  if (month) {
    result += numberToWords(month) + '月';
  }
  
  // 处理日
  if (day) {
    result += numberToWords(day) + '日';
  }
  
  return result;
}

/**
 * 转换数字为日语表达
 * @param num 要转换的数字
 * @param context 上下文信息
 * @returns 数字的日语读法
 */
function numberToWords(num: number, context?: NumberContext): string {
  // 处理0
  if (num === 0) return context?.style === 'formal' ? '零' : 'れい';
  
  // 处理大数
  if (num >= Math.pow(10, 36)) return num.toString();
  
  // 检查特殊读法
  const specialKey = num.toString() + (context?.counter || '');
  if (SPECIAL_READINGS[specialKey]) {
    return SPECIAL_READINGS[specialKey];
  }
  
  // 根据上下文选择处理方式
  switch (context?.type) {
    case 'time':
      const hour = Math.floor(num / 100);
      const minute = num % 100;
      return processTime(hour, minute);
      
    case 'date':
      const year = Math.floor(num / 10000);
      const month = Math.floor((num % 10000) / 100);
      const day = num % 100;
      return processDate(year, month, day);
      
    case 'age':
      return processNumber(num) + COUNTERS.age;
      
    case 'counter':
      if (context.counter && context.counter in COUNTERS) {
        return processNumber(num) + COUNTERS[context.counter];
      }
      return processNumber(num) + COUNTERS.general;
  }
  
  return processNumber(num);
}

/**
 * 处理数字转换的核心逻辑
 * @param num 要转换的数字
 * @returns 数字的日语读法
 */
function processNumber(num: number): string {
  let str = '';
  let temp = num;
  
  // 处理大数
  for (let i = LARGE_NUMBERS.length - 1; i >= 0; i--) {
    const div = Math.pow(10000, i);
    if (temp >= div) {
      const count = Math.floor(temp / div);
      if (count > 1 || i === 0) {
        str += processSmallNumber(count);
      }
      str += LARGE_NUMBERS[i];
      temp = temp % div;
    }
  }
  
  if (temp > 0) {
    str += processSmallNumber(temp);
  }
  
  return str || NUMBERS.zero;
}

/**
 * 处理小于10000的数字
 * @param num 要转换的数字
 * @returns 数字的日语读法
 */
function processSmallNumber(num: number): string {
  let str = '';
  let temp = num;
  
  // 处理千位
  if (temp >= 1000) {
    const thousands = Math.floor(temp / 1000);
    if (thousands > 1) str += ONES[thousands];
    str += TENS[3];
    temp = temp % 1000;
  }
  
  // 处理百位
  if (temp >= 100) {
    const hundreds = Math.floor(temp / 100);
    if (hundreds > 1) str += ONES[hundreds];
    str += TENS[2];
    temp = temp % 100;
  }
  
  // 处理十位
  if (temp >= 10) {
    const tens = Math.floor(temp / 10);
    if (tens > 1) str += ONES[tens];
    str += TENS[1];
    temp = temp % 10;
  }
  
  // 处理个位
  if (temp > 0) {
    str += ONES[temp];
  }
  
  return str;
}

export const NUMBERS: Numbers = NUMB({
  numberToWords,
  
  numberToOrdinal: (num: number, _plural: boolean) => {
    const context = Grammar.getInstance().getParameter('context');
    
    // 分数上下文
    if (context === 'fraction') {
      const parts = num.toString().split('/');
      if (parts.length === 2) {
        return processFraction(parseInt(parts[0]), parseInt(parts[1]));
      }
      return NUMBERS.numberToWords(num);
    }
    
    // 特殊序数
    if (SPECIAL_ORDINALS[num]) {
      return SPECIAL_ORDINALS[num];
    }
    
    // 一般序数
    return NUMBERS.numberToWords(num) + '番目';
  },
  
  wordOrdinal: (num: number) => {
    const context = Grammar.getInstance().getParameter('context');
    
    if (context === 'fraction') {
      return NUMBERS.numberToWords(num);
    }
    
    if (SPECIAL_ORDINALS[num]) {
      return SPECIAL_ORDINALS[num];
    }
    
    return NUMBERS.numberToWords(num) + '番目';
  },
  
  numericOrdinal: (num: number) => {
    const context = Grammar.getInstance().getParameter('context');
    
    if (context === 'fraction') {
      return num.toString();
    }
    
    return num.toString() + '番';
  },
  
  zero: '零',
  ones: ONES,
  tens: TENS,
  large: LARGE_NUMBERS,
  numSep: '',
  vulgarSep: '分の',
  special: {
    ordinals: Object.values(SPECIAL_ORDINALS),
    counters: Object.values(COUNTERS),
    readings: Object.entries(SPECIAL_READINGS).map(([key, value]) => `${key}:${value}`)
  }
}); 