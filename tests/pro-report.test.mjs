import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

await import(pathToFileURL(new URL('../pro-report.js', import.meta.url).pathname).href);
const pro = globalThis.ScriptGuardProReports;

assert.ok(pro, 'Pro report core should be registered');

const risky = pro.analyzeLocalRules(
  'const publicValue = 1;\r\nconst result = eval(userInput);\r\nconst token = "super-secret-value";',
  'private/team-a/credentials.js'
);
const clean = pro.analyzeLocalRules('function add(a, b) { return a + b; }\r\n', 'private/team-a/helpers.js');

assert.equal(risky.analysisMode, 'local-rules');
assert.equal(risky.model, 'scriptguard-local-rules');
assert.ok(risky.issues.some(issue => issue.ruleId === 'dynamic-execution' && issue.line === 2), 'CRLF line should be counted correctly');
assert.ok(risky.issues.some(issue => issue.ruleId === 'hardcoded-secret' && issue.line === 3));
assert.equal(clean.analysisMode, 'local-rules');

const report = pro.createAggregateReview([risky, clean], new Date('2026-10-31T08:30:00.000Z'));
assert.equal(report.generatedAt, '2026-10-31T08:30:00.000Z');
assert.equal(report.summary.reviewedFiles, 2);
assert.equal(report.files[0].source.id, 'scriptguard-local-rules');
assert.equal(report.files[0].source.execution, 'on-device');
assert.equal(report.files[0].fileName, undefined);
assert.equal(report.files[0].issues[0].code, undefined);

const markdown = pro.toMarkdown(report);
const json = pro.toJson(report);
assert.match(markdown, /قواعد محلية محدودة/);
assert.match(markdown, /وقت الإنشاء \(UTC\)/);
assert.doesNotMatch(markdown, /super-secret-value|credentials\.js|private\/team-a|eval\(userInput\)/);
assert.doesNotMatch(json, /super-secret-value|credentials\.js|private\/team-a|eval\(userInput\)/);
assert.equal(JSON.parse(json).privacy.fileContentIncluded, false);
assert.equal(JSON.parse(json).privacy.filePathsIncluded, false);
assert.throws(() => pro.createAggregateReview([risky]), /نتيجتين محليتين/);

const fixedNow = new Date('2026-10-31T08:30:00.000Z');
const activeEntitlement = {
  authenticated: true,
  subject: { id: 'account_123' },
  entitlements: [{
    feature: pro.FEATURE_ID,
    status: 'active',
    source: 'verified-subscription',
    expiresAt: '2026-11-30T08:30:00.000Z'
  }]
};
assert.deepEqual(pro.decisionForEntitlement(activeEntitlement, fixedNow), { allowed: true, code: 'ACTIVE', expiresAt: '2026-11-30T08:30:00.000Z' });
assert.equal(pro.decisionForEntitlement({ authenticated: true, subject: { id: 'account_123' }, entitlements: [] }, fixedNow).allowed, false);
assert.equal(pro.decisionForEntitlement({ ...activeEntitlement, entitlements: [{ ...activeEntitlement.entitlements[0], expiresAt: '2026-10-31T08:29:59.000Z' }] }, fixedNow).code, 'SUBSCRIPTION_EXPIRED');
assert.equal(pro.decisionForEntitlement({ ...activeEntitlement, entitlements: [{ ...activeEntitlement.entitlements[0], status: 'canceled' }] }, fixedNow).code, 'SUBSCRIPTION_CANCELED');
assert.equal(pro.decisionForEntitlement({ ...activeEntitlement, entitlements: [{ ...activeEntitlement.entitlements[0], source: 'client-flag' }] }, fixedNow).code, 'ENTITLEMENT_UNVERIFIED');

console.log('ScriptGuard Pro aggregate report tests passed.');
