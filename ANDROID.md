# ScriptGuard Android

تمت إضافة غلاف Capacitor أصلي في `android/` بمعرّف الحزمة `com.abdelatizarzori.scriptguard`. تُنسخ واجهة التطبيق من `mobile-web/`، بينما يبقى `server.mjs` خدمة مستقلة للتحليل والترجمة وإدارة الملفات.

## المتطلبات

يتطلب البناء Android Studio أو Android SDK وJDK 21. يجب أن يشير إعداد التطبيق إلى عنوان API عام عند استخدام خادم بعيد، ولا يجوز وضع مفاتيح أو كلمات مرور داخل التطبيق أو المستودع.

## التطوير وAPK

```bash
npm install
npx cap sync android
npx cap open android
cd android
./gradlew assembleDebug
```

ملف الاختبار يوجد عادةً في `android/app/build/outputs/apk/debug/app-debug.apk`.

## إصدار Google Play

أنشئ keystore خارج المستودع واربطه من Android Studio أو من متغيرات CI الآمنة، ثم شغّل:

```bash
cd android
./gradlew bundleRelease
```

ملف النشر المتوقع هو `android/app/build/outputs/bundle/release/app-release.aab`.

ملاحظة: GitHub Pages لا تشغّل `server.mjs`. لذلك يلزم خادم Node عام حتى تعمل ميزات التحليل والترجمة داخل التطبيق.

## Developer

**Abdelati Zarzori** — `abdelatizarzori3@gmail.com`
