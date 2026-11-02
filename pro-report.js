/*
 * ScriptGuard Pro aggregate review core.
 * This browser-safe module intentionally never stores an entitlement and never
 * includes file paths, file content, snippets, or private links in exports.
 */
(function attachScriptGuardProReports(root) {
  'use strict';

  const FEATURE_ID = 'aggregate-review-export';
  const MAX_BATCH_FILES = 25;
  const MAX_TOTAL_CHARACTERS = 2_000_000;
  const LOCAL_RULE_SOURCE = Object.freeze({
    id: 'scriptguard-local-rules',
    label: 'قواعد محلية محدودة',
    execution: 'on-device',
    disclaimer: 'النتائج استشارية ومبنية على أنماط محددة؛ لا تمثل تدقيقًا أمنيًا مضمونًا أو شهادة أمان.'
  });
  const SEVERITY_LABELS = Object.freeze({
    critical: 'حرج',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض'
  });
  const KNOWN_LANGUAGES = new Set(['python', 'javascript', 'typescript', 'csharp', 'gdscript', 'java', 'go', 'php', 'ruby', 'cpp', 'c', 'unknown']);

  function detectLanguage(fileName) {
    const extension = String(fileName || '').split('.').pop().toLowerCase();
    const byExtension = { py: 'python', js: 'javascript', ts: 'typescript', cs: 'csharp', gd: 'gdscript', java: 'java', go: 'go', php: 'php', rb: 'ruby', cpp: 'cpp', c: 'c', h: 'c' };
    return byExtension[extension] || 'unknown';
  }

  function lineAt(source, index) {
    return String(source).slice(0, Math.max(0, index)).split(/\r\n|\r|\n/).length;
  }

  function codeLine(source, line) {
    return String(source).split(/\r\n|\r|\n/)[line - 1]?.trim().slice(0, 220) || '';
  }

  function localAnalysisStatus(safety) {
    if (safety < 45) return { statusTitle: '🚨 تم العثور على مخاطر عالية', statusDesc: 'هذه نتيجة قواعد محلية محدودة؛ راجع كل مشكلة قبل تشغيل الكود أو نشره.', statusBadge: 'مراجعة عاجلة', statusBadgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30', statusIcon: '⚠️', statusIconBg: 'bg-red-500/20' };
    if (safety < 75) return { statusTitle: '⚡ توجد نقاط تحتاج مراجعة', statusDesc: 'التحليل المحلي التقط أنماطًا شائعة فقط، وليس ضمانًا لأمان الكود.', statusBadge: 'راجع النتائج', statusBadgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', statusIcon: '🔎', statusIconBg: 'bg-yellow-500/20' };
    return { statusTitle: '🔎 لم تكتشف القواعد المحلية خطرًا عاليًا', statusDesc: 'هذه ليست شهادة أمان؛ أُجري فحص قواعد محدود على النص المتاح فقط.', statusBadge: 'مراجعة أولية', statusBadgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', statusIcon: '🧭', statusIconBg: 'bg-blue-500/20' };
  }

  function analyzeLocalRules(code, fileName, failureReason) {
    if (typeof code !== 'string') throw new TypeError('يجب أن يكون محتوى الملف نصًا.');
    const issues = [];
    const add = (ruleId, match, severity, type, title, description) => {
      if (!match || match.index < 0) return;
      const line = lineAt(code, match.index);
      issues.push({
        id: issues.length + 1,
        ruleId,
        severity,
        type,
        title,
        description,
        line,
        code: codeLine(code, line),
        icon: severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : '💡'
      });
    };

    add('dynamic-execution', code.match(/\b(eval|exec)\s*\(/i), 'critical', 'critical', 'تنفيذ ديناميكي محتمل الخطورة', 'وجدت eval أو exec. لا تمرر أي إدخال غير موثوق إلى هذه الدوال؛ استبدلها بتحليل أو تحويل آمن ومحدد.');
    add('hardcoded-secret', code.match(/\b(?:api[_-]?key|secret|password|token)\s*=\s*['"][^'"\n]{6,}['"]/i), 'high', 'warning', 'سر محتمل مكتوب داخل الكود', 'يبدو أن قيمة حساسة مكتوبة مباشرة في المصدر. انقلها إلى متغير بيئة أو مدير أسرار، ثم بدّلها إذا كانت قيمة حقيقية.');
    add('dynamic-sql', code.match(/\b(?:cursor|db|connection)\.(?:execute|query)\s*\([^\n]*(?:\+|f['"]|\.format\()/i), 'high', 'warning', 'استعلام قاعدة بيانات مركب ديناميكيًا', 'قد يؤدي دمج مدخلات المستخدم داخل الاستعلام إلى حقن SQL. استخدم معاملات مُعلّمة في مكتبة قاعدة البيانات.');
    add('inner-html', code.match(/\.innerHTML\s*=/i), 'high', 'warning', 'إدراج HTML مباشر', 'تعيين innerHTML بمحتوى متغير قد يفتح ثغرة XSS. استخدم textContent أو تطهيرًا موثوقًا للمحتوى.');
    add('shell-true', code.match(/\bshell\s*=\s*True\b/i), 'high', 'warning', 'تشغيل أمر shell', 'تشغيل الأوامر عبر shell=True يزيد خطر حقن الأوامر. مرّر قائمة وسائط ثابتة وتجنب دمج نصوص غير موثوقة.');
    const nested = code.match(/\b(?:for|while)\b[\s\S]{0,500}\b(?:for|while)\b/i);
    add('nested-loop', nested, 'medium', 'warning', 'حلقة متداخلة محتملة', 'قد تؤدي الحلقات المتداخلة إلى بطء مع البيانات الكبيرة. راجع التعقيد الزمني واستخدم هياكل بيانات مناسبة عند الإمكان.');

    if (!issues.length) {
      issues.push({
        id: 1,
        ruleId: 'no-common-risk-pattern',
        severity: 'low',
        type: 'info',
        title: 'لم تتطابق قواعد الخطر الشائعة',
        description: 'هذه المراجعة المحلية فحصت أنماطًا محددة مثل التنفيذ الديناميكي والأسرار والاستعلامات المركبة. لا تغطي كل الأخطاء أو الثغرات.',
        line: 1,
        code: codeLine(code, 1),
        icon: '💡'
      });
    }

    const penalties = { critical: 35, high: 20, medium: 10, low: 0 };
    const safety = Math.max(15, 95 - issues.reduce((total, issue) => total + (penalties[issue.severity] || 0), 0));
    return {
      fileName: String(fileName || 'source'),
      language: detectLanguage(fileName),
      safety,
      efficiency: nested ? 65 : 82,
      quality: issues.length > 1 ? 62 : 78,
      issues,
      fixCode: code,
      analysisMode: 'local-rules',
      model: LOCAL_RULE_SOURCE.id,
      failureReason,
      ...localAnalysisStatus(safety)
    };
  }

  function safeText(value, maximumLength) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/[<>&]/g, character => ({ '<': '‹', '>': '›', '&': 'و' })[character])
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maximumLength);
  }

  function boundedScore(value) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  }

  function normalizeIssue(issue, index) {
    const severity = Object.prototype.hasOwnProperty.call(SEVERITY_LABELS, issue?.severity) ? issue.severity : 'low';
    const line = Number.isInteger(issue?.line) && issue.line > 0 ? issue.line : null;
    return {
      id: index + 1,
      ruleId: safeText(issue?.ruleId || 'local-rule', 80) || 'local-rule',
      severity,
      severityLabel: SEVERITY_LABELS[severity],
      title: safeText(issue?.title || 'ملاحظة محلية', 180) || 'ملاحظة محلية',
      description: safeText(issue?.description || 'لم تتوفر تفاصيل إضافية.', 500) || 'لم تتوفر تفاصيل إضافية.',
      ...(line ? { line } : {})
    };
  }

  function validDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('وقت إنشاء التقرير غير صالح.');
    return date;
  }

  function createAggregateReview(analyses, generatedAt = new Date()) {
    if (!Array.isArray(analyses) || analyses.length < 2) throw new RangeError('يتطلب التقرير المجمع نتيجتين محليتين على الأقل.');
    if (analyses.length > MAX_BATCH_FILES) throw new RangeError(`الحد الأقصى للتقرير المجمع هو ${MAX_BATCH_FILES} ملفًا.`);

    const files = analyses.map((analysis, index) => {
      if (!analysis || analysis.analysisMode !== 'local-rules') throw new TypeError('يقبل التقرير المجمع نتائج القواعد المحلية فقط.');
      const language = KNOWN_LANGUAGES.has(analysis.language) ? analysis.language : 'unknown';
      const issues = Array.isArray(analysis.issues) ? analysis.issues.map(normalizeIssue) : [];
      return {
        id: `file-${index + 1}`,
        label: `ملف ${index + 1}`,
        language,
        source: { ...LOCAL_RULE_SOURCE },
        scores: {
          safety: boundedScore(analysis.safety),
          efficiency: boundedScore(analysis.efficiency),
          quality: boundedScore(analysis.quality)
        },
        issues
      };
    });

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    files.forEach(file => file.issues.forEach(issue => { severityCounts[issue.severity] += 1; }));
    const totalIssues = Object.values(severityCounts).reduce((sum, count) => sum + count, 0);

    return {
      schemaVersion: '1.0',
      reportType: 'aggregate-local-rule-review',
      generatedAt: validDate(generatedAt).toISOString(),
      disclaimer: LOCAL_RULE_SOURCE.disclaimer,
      privacy: {
        filePathsIncluded: false,
        fileNamesIncluded: false,
        fileContentIncluded: false,
        codeSnippetsIncluded: false,
        privateLinksIncluded: false
      },
      sources: [{ ...LOCAL_RULE_SOURCE }],
      summary: {
        reviewedFiles: files.length,
        totalIssues,
        severityCounts
      },
      files
    };
  }

  function escapeMarkdown(value) {
    return safeText(value, 600).replace(/([\\`*_{}\[\]()#+.!|])/g, '\\$1');
  }

  function toMarkdown(review) {
    if (!review || review.reportType !== 'aggregate-local-rule-review') throw new TypeError('بيانات التقرير المجمع غير صالحة.');
    const counts = review.summary?.severityCounts || {};
    const lines = [
      '# ScriptGuard Pro — تقرير مراجعة مجمع',
      '',
      `- **وقت الإنشاء (UTC):** ${escapeMarkdown(review.generatedAt)}`,
      `- **الملفات المراجعة:** ${Number(review.summary?.reviewedFiles) || 0}`,
      `- **مصدر النتائج:** ${escapeMarkdown(LOCAL_RULE_SOURCE.label)} — على الجهاز`,
      '',
      `> ${escapeMarkdown(review.disclaimer || LOCAL_RULE_SOURCE.disclaimer)}`,
      '',
      '## الملخص',
      '',
      `- إجمالي النتائج: ${Number(review.summary?.totalIssues) || 0}`,
      `- حرجة: ${Number(counts.critical) || 0}`,
      `- عالية: ${Number(counts.high) || 0}`,
      `- متوسطة: ${Number(counts.medium) || 0}`,
      `- منخفضة: ${Number(counts.low) || 0}`,
      '',
      '## النتائج حسب الملف',
      ''
    ];

    (review.files || []).forEach(file => {
      lines.push(`### ${escapeMarkdown(file.label)} (${escapeMarkdown(file.language)})`);
      lines.push('');
      lines.push(`- **المصدر:** ${escapeMarkdown(file.source?.label || LOCAL_RULE_SOURCE.label)} — على الجهاز`);
      lines.push(`- **الدرجات:** الأمان ${boundedScore(file.scores?.safety)}%، الكفاءة ${boundedScore(file.scores?.efficiency)}%، الجودة ${boundedScore(file.scores?.quality)}%`);
      lines.push('');
      if (!file.issues?.length) {
        lines.push('لا توجد نتائج قابلة للعرض.');
      } else {
        lines.push('| الخطورة | القاعدة | الوصف | السطر |');
        lines.push('| --- | --- | --- | ---: |');
        file.issues.forEach(issue => {
          lines.push(`| ${escapeMarkdown(issue.severityLabel || SEVERITY_LABELS[issue.severity] || 'منخفض')} | ${escapeMarkdown(issue.title)} | ${escapeMarkdown(issue.description)} | ${issue.line || '—'} |`);
        });
      }
      lines.push('');
    });

    lines.push('## حدود التقرير');
    lines.push('');
    lines.push('- لا يحتوي هذا التصدير على محتوى الملفات أو مقتطفات الشيفرة أو أسماء ومسارات الملفات أو روابط خاصة.');
    lines.push('- لا تستنتج من عدم ظهور قاعدة أن الشيفرة آمنة؛ راجع النتائج والسياق يدويًا.');
    return `${lines.join('\n')}\n`;
  }

  function toJson(review) {
    if (!review || review.reportType !== 'aggregate-local-rule-review') throw new TypeError('بيانات التقرير المجمع غير صالحة.');
    return `${JSON.stringify(review, null, 2)}\n`;
  }

  function decisionForEntitlement(payload, currentTime = new Date()) {
    const now = validDate(currentTime).getTime();
    if (!payload || payload.authenticated !== true || typeof payload.subject?.id !== 'string' || !payload.subject.id.trim()) {
      return { allowed: false, code: 'AUTH_REQUIRED' };
    }
    const entitlements = Array.isArray(payload.entitlements) ? payload.entitlements.filter(item => item?.feature === FEATURE_ID) : [];
    if (!entitlements.length) return { allowed: false, code: 'ENTITLEMENT_MISSING' };
    const active = entitlements.find(item => item.status === 'active');
    if (!active) {
      if (entitlements.some(item => item.status === 'canceled')) return { allowed: false, code: 'SUBSCRIPTION_CANCELED' };
      if (entitlements.some(item => item.status === 'expired')) return { allowed: false, code: 'SUBSCRIPTION_EXPIRED' };
      return { allowed: false, code: 'ENTITLEMENT_INACTIVE' };
    }
    if (active.source !== 'verified-subscription') return { allowed: false, code: 'ENTITLEMENT_UNVERIFIED' };
    const expiresAt = Date.parse(active.expiresAt || '');
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return { allowed: false, code: 'SUBSCRIPTION_EXPIRED' };
    return { allowed: true, code: 'ACTIVE', expiresAt: new Date(expiresAt).toISOString() };
  }

  root.ScriptGuardProReports = Object.freeze({
    FEATURE_ID,
    MAX_BATCH_FILES,
    MAX_TOTAL_CHARACTERS,
    LOCAL_RULE_SOURCE,
    detectLanguage,
    analyzeLocalRules,
    createAggregateReview,
    toMarkdown,
    toJson,
    decisionForEntitlement
  });
}(typeof window !== 'undefined' ? window : globalThis));
