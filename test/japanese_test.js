import SRE from '../lib/sre.js';

// Setup engine
setupEngine({
  locale: 'ja',
  modality: 'speech',
  style: 'default',
  domain: 'mathspeak',
  json: './mathmaps'
});

// Test cases
const testCases = [
  {
    input: '<math><mn>1</mn><mo>+</mo><mn>2</mn></math>',
    expected: '1 たす 2'
  },
  {
    input: '<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>',
    expected: '分数 1 分の 2'
  },
  {
    input: '<math><msqrt><mn>2</mn></msqrt></math>',
    expected: '平方根 2'
  }
];

// Run tests
testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Input: ${test.input}`);
  const result = toSpeech(test.input);
  console.log(`Result: ${result}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Pass: ${result === test.expected ? '✓' : '✗'}`);
  console.log('---');
}); 