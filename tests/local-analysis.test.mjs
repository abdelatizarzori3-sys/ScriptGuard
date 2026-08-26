import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] },
  console,
  AbortSignal,
  setTimeout,
  clearTimeout,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../mobile-web/app.js', import.meta.url), 'utf8'), context);

const risky = context.buildLocalRuleAnalysis(
  'API_KEY = "not-a-real-secret"\nvalue = eval(user_input)',
  'sample.py',
  'اختبار انقطاع الخادم'
);

assert.equal(risky.analysisMode, 'local-rules');
assert.ok(risky.issues.some(issue => issue.title.includes('تنفيذ ديناميكي')));
assert.ok(risky.issues.some(issue => issue.title.includes('سر محتمل')));
assert.ok(risky.safety < 50);
assert.equal(risky.fixCode.includes('eval(user_input)'), true);

const clean = context.buildLocalRuleAnalysis('print("hello")', 'hello.py', 'اختبار');
assert.equal(clean.analysisMode, 'local-rules');
assert.ok(clean.issues[0].description.includes('لا تغطي كل الأخطاء'));

console.log('ScriptGuard local analysis tests passed.');
