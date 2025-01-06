/**
 * @file Japanese message file.
 * @author Optimized version
 */

import { Grammar } from '../../rule_engine/grammar.js';
import { createLocale, Locale } from '../locale.js';
import { nestingToString } from '../locale_util.js';
import { NUMBERS } from '../numbers/numbers_ja.js';
import * as tr from '../transformers.js';
import * as SpeechRules from '../../speech_rules/speech_rules.js';

// 助詞の変換規則
interface ParticleRule {
  reading: string;
  conditions?: {
    prev?: string;
    next?: string;
  };
}

interface ParticleDictionary {
  [key: string]: ParticleRule;
}

// 敬語レベル
type HonorificLevel = 'plain' | 'polite' | 'honorific' | 'humble';

// 文脈の型定義
interface Context {
  prevWord?: string;
  nextWord?: string;
}

let locale: Locale = null;

// 助詞辞書
const PARTICLES: ParticleDictionary = {
  'は': { reading: 'wa' },
  'が': { reading: 'ga' },
  'を': { reading: 'wo' },
  'に': { reading: 'ni' },
  'へ': { reading: 'e' },
  'で': { reading: 'de' },
  'と': { reading: 'to' },
  'から': { reading: 'kara' },
  'まで': { reading: 'made' },
  'より': { reading: 'yori' },
  'の': { reading: 'no' },
  'や': { reading: 'ya' },
  'か': { reading: 'ka' },
  'も': { reading: 'mo' },
  'ね': { reading: 'ne' },
  'よ': { reading: 'yo' },
  'な': { reading: 'na' },
  'わ': { reading: 'wa' }
};

// 敬語変換辞書
const HONORIFIC_FORMS = {
  'plain': {
    'です': 'だ',
    'ます': 'る',
    'ございます': 'ある',
    'いたします': 'する',
    'おります': 'いる',
    'いただきます': 'もらう',
    'くださいます': 'くれる'
  },
  'polite': {
    'だ': 'です',
    'る': 'ます',
    'ある': 'あります',
    'する': 'します',
    'いる': 'います',
    'もらう': 'もらいます',
    'くれる': 'くれます'
  },
  'honorific': {
    'する': 'なさいます',
    'いる': 'いらっしゃいます',
    '行く': 'いらっしゃいます',
    '来る': 'いらっしゃいます',
    '食べる': 'めしあがります',
    '見る': 'ごらんになります',
    '言う': 'おっしゃいます'
  },
  'humble': {
    'する': 'いたします',
    'いる': 'おります',
    '行く': 'まいります',
    '来る': 'まいります',
    '食べる': 'いただきます',
    '見る': '拝見いたします',
    '言う': '申し上げます'
  }
};

/**
 * @returns The Japanese locale.
 */
export function ja(): Locale {
  if (!locale) {
    locale = create();
  }
  
  // Initialize grammar methods
  Grammar.getInstance().setCorrection('particle', locale.CORRECTIONS.particle);
  Grammar.getInstance().setCorrection('honorific', locale.CORRECTIONS.honorific);
  
  // Add Japanese specific speech rules
  SpeechRules.addStore('ja.speech.', '', {});
  SpeechRules.addStore('ja.summary.', 'ja.speech.mathspeak', {});
  
  return locale;
}

/**
 * @returns The Japanese locale.
 */
function create(): Locale {
  const loc = createLocale();
  loc.NUMBERS = NUMBERS;
  loc.FUNCTIONS.radicalNestDepth = nestingToString;
  
  // Japanese specific functions
  loc.FUNCTIONS.plural = function(unit: string) { return unit; }; // Japanese doesn't use plurals
  
  // Combine SI prefix with unit
  loc.FUNCTIONS.si = (prefix: string, unit: string) => {
    return prefix + unit;
  };

  // Combine root index with root
  loc.FUNCTIONS.combineRootIndex = function(index: string, postfix: string) {
    return index + postfix;
  };

  // Set default number transformer
  loc.ALPHABETS.combiner = tr.Combiners.prefixCombiner;
  loc.ALPHABETS.digitTrans.default = NUMBERS.numberToWords;

  // Japanese specific corrections
  loc.CORRECTIONS = {
    // 助詞の処理
    particle: (name: string) => {
      const particle = PARTICLES[name];
      if (!particle) return name;
      
      // 文脈に基づいて助詞の読みを決定
      const context = Grammar.getInstance().getParameter('context') as Context || {};
      if (particle.conditions) {
        if (particle.conditions.prev && context.prevWord !== particle.conditions.prev) return name;
        if (particle.conditions.next && context.nextWord !== particle.conditions.next) return name;
      }
      
      return particle.reading;
    },

    // 敬語の処理
    honorific: (text: string, level: HonorificLevel = 'polite') => {
      const forms = HONORIFIC_FORMS[level];
      if (!forms) return text;
      
      return Object.entries(forms).reduce((result, [plain, honorific]) => {
        return result.replace(new RegExp(plain, 'g'), honorific);
      }, text);
    },

    // 漢字とかなの処理
    kanji: (text: string, useKanji: boolean = true) => {
      // 数字の処理は numbers_ja.ts で行う
      if (!useKanji) {
        return text.replace(/[一二三四五六七八九十百千万億兆]/g, (kanji) => {
          const kanjiToKana: { [key: string]: string } = {
            '一': 'いち', '二': 'に', '三': 'さん', '四': 'よん', '五': 'ご',
            '六': 'ろく', '七': 'なな', '八': 'はち', '九': 'きゅう', '十': 'じゅう',
            '百': 'ひゃく', '千': 'せん', '万': 'まん', '億': 'おく', '兆': 'ちょう'
          };
          return kanjiToKana[kanji] || kanji;
        });
      }
      return text;
    }
  };

  // Messages specific to Japanese
  loc.MESSAGES = {
    MS: {
      START: '始め',
      END: '終わり',
      FRAC_V: '分数',
      FRAC_B: '分数',
      FRAC_S: '分の',
      NEST_FRAC: '入れ子の分数',
      ENDFRAC: '分数終わり',
      FRAC_OVER: '分の',
      ROOT: '根号',
      STARTROOT: '根号始め',
      ENDROOT: '根号終わり',
      ROOTINDEX: '指数',
      INDEX: '指数',
      NESTED: '入れ子の',
      NEST_ROOT: '入れ子の根号'
    },
    MSroots: {},
    font: {
      normal: '通常',
      bold: '太字',
      italic: '斜体',
      'bold-italic': '太字斜体',
      'sans-serif': 'サンセリフ',
      'monospace': '等幅',
      'script': '筆記体',
      'double-struck': '二重打ち',
      'fraktur': 'フラクトゥア',
      'calligraphic': 'カリグラフィック'
    },
    embellish: {
      'strike': '取り消し線',
      'overline': '上線',
      'underline': '下線',
      'box': '枠囲み',
      'circle': '丸囲み'
    },
    role: {
      'addition': '加法',
      'multiplication': '乗法',
      'subtraction': '減法',
      'division': '除法',
      'equality': '等式',
      'inequality': '不等式',
      'matrix': '行列',
      'determinant': '行列式',
      'vector': 'ベクトル'
    },
    enclose: {
      'longdiv': '割り算',
      'actuarial': '保険数理記号',
      'radical': '平方根',
      'box': '箱',
      'roundedbox': '角丸箱',
      'circle': '円',
      'left': '左縦線',
      'right': '右縦線',
      'top': '上線',
      'bottom': '下線'
    },
    navigate: {
      next: '次',
      previous: '前',
      up: '上',
      down: '下',
      home: '最初',
      end: '最後'
    },
    regexp: {
      text: '[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF\\uF900-\\uFAFF]',
      NUMBER: '((\\d{1,3})(?=(,| ))((,| )\\d{3})*(\\.\\d+)?)|^\\d*\\.\\d+|^\\d+',
      DECIMAL_MARK: '\\.',
      DIGIT_GROUP: ','
    },
    unitTimes: '掛ける'
  };

  return loc;
} 