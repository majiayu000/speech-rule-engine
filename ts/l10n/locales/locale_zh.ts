import { Grammar } from '../../rule_engine/grammar.js';
import { createLocale, Locale } from '../locale.js';
import { nestingToString } from '../locale_util.js';
import { NUMBERS } from '../numbers/numbers.zh.js';
import * as tr from '../transformers.js';

let locale: Locale = null;

/**
 * @returns 中文区域设置。
 */
export function zh(): Locale {
  if (!locale) {
    locale = create();
  }
  // TODO: 在这里初始化语法方法？
  return locale;
}

/**
 * @returns 中文区域设置。
 */
function create(): Locale {
  const loc = createLocale();
  loc.NUMBERS = NUMBERS;
  console.log("Normal1")
  loc.FUNCTIONS.radicalNestDepth = nestingToString;
  console.log("Normal2")
  loc.FUNCTIONS.plural = (unit: string) => {
    // 中文通常不需要复数形式，所以直接返回原单位
    return unit;
  };
  console.log("Normal3")
  loc.ALPHABETS.combiner = tr.Combiners.prefixCombiner;
  console.log("Normal4")
  loc.ALPHABETS.digitTrans.default = NUMBERS.numberToWords;
  console.log("Normal5")
  loc.CORRECTIONS.article = (name: string) => {
    // 中文不使用冠词，但可能需要根据语境添加量词
    return Grammar.getInstance().getParameter('noMeasureWord') ? name : '个' + name;
  };
  console.log("Normal6")
  return loc;
}