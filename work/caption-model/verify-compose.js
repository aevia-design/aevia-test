// Compose without temperature (S199): does it still add nothing? 4 calls, EN+DE. ~$0.002.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { modelParams } = require(path.join(ROOT, 'functions/caption/model.js'));
const { buildComposeUserText } = require(path.join(ROOT, 'functions/caption/prompts.js'));
const VOICE = fs.readFileSync(path.join(ROOT, 'functions/caption/caption-voice.md'), 'utf8');
const key = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key });
const CASES = [
  ['en', 'We met through friends at a party. He made me laugh all night.\n\nHe proposed on a Tuesday, in our kitchen, with burnt pancakes.'],
  ['en', 'Through friends.\n\nShe is kind.'],
  ['de', 'Wir haben uns über Freunde kennengelernt.\n\nEr hat mir an einem Dienstag in der Küche einen Antrag gemacht.'],
  ['de', 'Im Zug nach Graz.\n\nSie lacht über meine Witze.'],
];
(async () => { for (const [language, composeText] of CASES) {
  const r = await client.chat.completions.create({ ...modelParams(300), messages: [
    { role: 'system', content: VOICE },
    { role: 'user', content: buildComposeUserText({ collection: 'love', composeText, language }) }] });
  console.log(`IN : ${composeText.replace(/\n+/g, ' / ')}\nOUT: ${r.choices[0].message.content.trim()}\n`);
} })();
