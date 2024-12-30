import { Numbers, NUMBERS as NUMB } from '../messages.js';

const CHINESE_NUMBERS = {
    units: ['', '十', '百', '千'],
    thousands: ['', '万', '亿', '兆'],
    digits: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
    ordinalPrefix: ''
};

function numberToWords(num: number): string {
    if (num === 0) {
        return CHINESE_NUMBERS.digits[0];
    }

    console.log(`num start is ${num}`)

    let result = '';
    let thousand = 0;

    while (num > 0) {
        let part = '';
        for (let i = 0; i < 4; i++) {
            const digit = num % 10;
            if (digit !== 0) {
                part = CHINESE_NUMBERS.digits[digit] + CHINESE_NUMBERS.units[i] + part;
                console.log(`part is ${part}`)
            } else if (part !== '') {
                part = CHINESE_NUMBERS.digits[0] + part;
            }
            num = Math.floor(num / 10);
        }
        if (part !== '') {
            console.log(`part  is ${part}`)
            result = part + CHINESE_NUMBERS.thousands[thousand] + result;
            console.log(`result is ${result}`)
        }
        thousand++;
    }
    console.log(`num ber is ${num}`)
    // 处理一些特殊情况
    console.log(`result before replace is ${result}`)

    result = result.replace(/一十/g, '十');
    result = result.replace(/零+/g, '');
    console.log(`result is ${result}`)
    result = result.replace(/零+$/g, '');
    console.log(`result is ${result}`)

    return result;
}

function numberToOrdinal(num: number): string {
    return CHINESE_NUMBERS.ordinalPrefix + numberToWords(num);
}

function wordOrdinal(num: number): string {
    return numberToOrdinal(num);
}

function numericOrdinal(num: number): string {
    return num.toString();  // 中文通常不使用类似英语的数字序数形式
}

export const NUMBERS: Numbers = NUMB(
    {
        'wordOrdinal': wordOrdinal,
        'numericOrdinal': numericOrdinal,
        'numberToWords': numberToWords,
        'numberToOrdinal': numberToOrdinal,
    }
);