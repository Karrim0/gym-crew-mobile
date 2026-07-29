# Gym Crew Mobile v0.5.0 — QA Report

## فحوصات تم تنفيذها على النسخة المرفوعة بعد الإصلاح

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run check` ✅
- `npx expo install --check` ✅ باستخدام dependency map المحلية لأن الإنترنت داخل بيئة الفحص غير متاح
- `npx expo config --type public` ✅
- `npx expo prebuild --platform android --clean --no-install` ✅
- `npm ls --depth=0` ✅
- Android native identity: `versionCode 5`, `versionName 0.5.0` ✅
- Native splash/adaptive colors: Lime + Light/Dark backgrounds ✅
- Secret scan: لا يوجد `.env.local` أو مفاتيح فعلية داخل الملفات المسلّمة ✅
- Patch overlay test على نسخة المشروع المرفوعة: TypeScript/Lint/Expo config ✅

## حدود الفحص

لم أتمكن من تشغيل الآتي من داخل بيئة التجهيز، لذلك لا أزعم أنها اختُبرت فعليًا:

- تنفيذ SQL على مشروع Supabase الحقيقي.
- تسجيل دخول حقيقي والوصول إلى بيانات الجروب.
- اختبار Airplane Mode وإعادة فتح التطبيق على جهاز Android فعلي.
- Local notifications في Foreground/Background.
- EAS Preview APK النهائي.
- Production Metro export لم يكتمل داخل Container محدود الموارد؛ لا توجد TypeScript/Metro syntax errors مسجلة، لكن يجب الاعتماد على EAS Build كاختبار Native نهائي.

## بوابة اعتماد النسخة

تعتبر النسخة Release Candidate بعد مرور السيناريوهات الموجودة في `APPLY_AND_TEST.md`. لا تدمج إلى `main` ولا تنشئ Tag قبل اختبار الـAPK المستقل على جهازين Android بمقاسين مختلفين إن أمكن.
