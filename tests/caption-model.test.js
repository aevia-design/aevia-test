// The caption model is named in ONE place (S199). gpt-4o-mini was hard-coded in four,
// and OpenAI retires models on a few months' notice — the next swap must be one line.

const fs = require('fs');
const path = require('path');
const { CAPTION_MODEL, modelParams } = require('../functions/caption/model');

const ROOT = path.join(__dirname, '..');
const CALLERS = ['functions/index.js', 'functions/caption/caption.js'];

test('no caller names a model itself', () => {
  for (const f of CALLERS) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    expect({ f, hit: src.match(/['"](gpt-[\w.-]+|claude-[\w.-]+)['"]/) }).toEqual({ f, hit: null });
  }
});

test('the model is not one OpenAI retires on 14 January 2027', () => {
  expect(CAPTION_MODEL).not.toMatch(/^gpt-4(o|\.1)/);
});

test('modelParams carries the model, a cap with room for brief thinking', () => {
  const p = modelParams(100);
  expect(p.model).toBe(CAPTION_MODEL);
  
  expect(p.reasoning_effort).toBe('low');
  // Thinking tokens count against the cap — leave room so a caption is never cut to empty.
  expect(p.max_completion_tokens).toBeGreaterThan(1000);
});

test('no caller sends temperature — gpt-6-luna rejects anything but the default (400, S199)', () => {
  for (const f of CALLERS) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect({ f, hit: code.match(/\btemperature\s*:/) }).toEqual({ f, hit: null });
  }
});
