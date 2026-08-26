import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(import.meta.dirname, '..', 'mobile-web/app.js'), 'utf8');

test('ScriptGuard examples submit code to the real analysis path', () => {
  const start = source.indexOf('function loadDemo(type)');
  const end = source.indexOf('\nfunction startAnalysis', start);
  const functionBody = source.slice(start, end);
  assert.match(functionBody, /startAnalysis\(demo\.code, demo\.fileName\)/);
  assert.doesNotMatch(functionBody, /startAnalysis\(null, demo\.fileName, demo\)/);
  assert.match(functionBody, /eval\(user_input\)/);
});
