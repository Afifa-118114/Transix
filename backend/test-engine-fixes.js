const { ActivityClassifier } = require('./src/services/imageEngineService');

const text = 'Board overnight train (e.g., Rajdhani Express or similar) to Delhi. Ensure to carry packed dinner or purchase on train. Book AC 3-tier or Sleeper class for comfort within budget.';
const text2 = 'Dinner will be served on Rajdhani or can be purchased from pantry/vendors on other trains. Get a good nights rest.';

console.log('Classify text1:', ActivityClassifier.classify(text, ''));
console.log('Classify text2:', ActivityClassifier.classify(text2, ''));
