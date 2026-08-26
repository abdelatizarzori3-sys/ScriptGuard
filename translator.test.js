const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('./app.js', 'utf8');
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById() {} },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: {},
  AbortSignal: { timeout() { return undefined; } },
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(source, sandbox);

const input = `'''رسالة مرحبا\nللتوثيق'''\nname = 'العالم'\npath = r'بيانات/ملف'\ntext = f'مرحبا {name}'\n# اختبار نجاح`;
const output = sandbox.translatePythonSource(input, 'ar-en');

assert.match(output, /'''message Hello\nللتوثيق'''/);
assert.match(output, /name = 'world'/);
assert.match(output, /path = r'data\/ملف'/);
assert.match(output, /text = f'Hello \{name\}'/);
assert.match(output, /# test success/);
assert.equal((output.match(/name/g) || []).length, 2, 'identifier name must remain unchanged');
console.log('translator edge cases: OK');
