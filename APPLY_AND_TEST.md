# Gym Crew Mobile v0.2.0 — تطبيق الـFinal Patch واختباره

> هذه النسخة تجمع Profile + Navigation + UI/UX + Workout + Crew + Notifications + Offline + QA في Patch واحد.
> الشغل كله على فرع `develop`. لا تطبق الـPatch على `main` مباشرة.

## 0) قبل البداية

اقفل Metro باستخدام `Ctrl + C`، ثم افتح **CMD جديد**.

تأكد أن ملف الـZIP موجود في Downloads بالاسم:

```text
gym-crew-mobile-v0.2.0-final-patch.zip
```

## 1) جهّز المشروع والفرع

نفّذ في CMD:

```bat
set "PROJECT=E:\A-KAREEM-TECH\MobileApps\gym-crew-mobile"
set "PATCHZIP=%USERPROFILE%\Downloads\gym-crew-mobile-v0.2.0-final-patch.zip"
set "PATCHDIR=%TEMP%\gym-crew-mobile-v0.2.0-final-patch"

cd /d "%PROJECT%"
git checkout develop
git status
git branch --show-current
```

المطلوب أن يظهر الفرع:

```text
develop
```

قبل أي `git add -A` راجع أن `git status` **لا يعرض**:

```text
.env.local
node_modules
.expo
android\build
```

لو عندك تعديلات سابقة سليمة ولم تُرفع بعد:

```bat
git add -A
git commit -m "fix: stabilize mobile core before v0.2.0"
git push origin develop
```

ثم:

```bat
git pull origin develop
git branch backup/pre-mobile-v0.2.0
```

## 2) فك الـPatch وطبّقه

```bat
if exist "%PATCHDIR%" rmdir /s /q "%PATCHDIR%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%PATCHZIP%' -DestinationPath '%PATCHDIR%' -Force"
call "%PATCHDIR%\APPLY_PATCH.cmd" "%PROJECT%"
```

المفروض يظهر:

```text
Patch files copied successfully.
```

راجع الملفات:

```bat
cd /d "%PROJECT%"
git status --short
```

## 3) ثبّت النسخ المقفولة من الحزم

```bat
cd /d "%PROJECT%"
npm ci
```

لا تستخدم:

```bat
npm audit fix --force
```

لأنه قد يغيّر نسخ Expo/React Native إلى نسخ غير متوافقة.

## 4) طبّق Supabase SQL

في **CMD فقط** نفّذ:

```bat
type "%PATCHDIR%\SQL_TO_RUN_IN_SUPABASE.sql" | clip
```

بعدها افتح:

```text
Supabase Dashboard
→ مشروع Gym Crew
→ SQL Editor
→ New query
```

داخل SQL Editor:

```text
Ctrl + A
Delete
Ctrl + V
Run
```

المطلوب:

```text
Success. No rows returned
```

الـSQL يقوم بـ:

- إصلاح `column reference user_id is ambiguous`.
- حماية إحصائيات أعضاء الجروب حسب إعدادات الخصوصية.
- إنشاء Bucket باسم `avatars`.
- إضافة سياسات Storage آمنة لكل مستخدم داخل مجلده فقط.
- لا يعطّل RLS.

لو ظهر أي SQL Error، لا تشغّل SQL عشوائيًا. احتفظ بصورة الخطأ والنص كاملًا.

## 5) شغّل فحوصات الكود

```bat
cd /d "%PROJECT%"
npm run typecheck
npm run lint
npx expo install --check
npx expo config --type public
```

أو دفعة واحدة:

```bat
npm run qa
```

النتيجة المطلوبة:

```text
TypeScript: passed
ESLint: passed
Dependencies are up to date
```

## 6) فحص Prebuild

الأمر التالي لا يحتاج Emulator، لكنه سيعيد إنشاء مجلد Android من إعدادات Expo الحالية:

```bat
cd /d "%PROJECT%"
npx expo prebuild --platform android --clean --no-install
```

النتيجة المطلوبة:

```text
Created native directory
Finished prebuild
```

لا تشغّل `expo run:android` عندك حاليًا لأن Android Studio وAndroid SDK غير مثبتين. الـDevelopment Build المثبت على الموبايل يكفي للاختبار عن طريق Metro.

## 7) شغّل التطبيق

```bat
cd /d "%PROJECT%"
npm run dev
```

لو البورت `8081` مستخدم، اختر `Y` لتشغيل `8082`، أو اقفل نافذة Metro القديمة أولًا.

بعد ظهور QR:

1. الكمبيوتر والموبايل على نفس Wi-Fi.
2. افتح تطبيق Gym Crew Development Build.
3. امسح QR.
4. اترك Metro مفتوحًا أثناء الاختبار.

## 8) سيناريو الاختبار الإجباري

### A. الحساب والتنقل

- التطبيق لا يحوّلك مؤقتًا إلى Onboarding أثناء تحميل الحساب.
- صورة الحساب تفتح Profile.
- زر Settings مستقل.
- زر الجرس يفتح Notification Center.
- Bottom Tabs لا تتداخل مع شريط النظام.

### B. Profile

- غيّر الاسم واحفظه.
- ارفع JPG/PNG/WebP أقل من 5MB.
- اقفل وافتح الشاشة وتأكد أن الصورة والاسم محفوظان.
- غيّر خيارات الخصوصية وتأكد أن الجروب يخفي الأرقام المقفولة عن بقية الأعضاء.

### C. Crew

- افتح شاشة الجروب.
- لا يظهر `user_id is ambiguous`.
- كود الدعوة يُنسخ.
- الصور والأدوار والترتيب تظهر.
- العضو الذي قفل ملخصه يظهر كـPrivate بدل كشف أرقامه.

### D. تمرينة اليوم

- تأكد أن اليوم في Home هو اليوم الفعلي بتوقيت الجهاز.
- ابدأ تمرينة اليوم.
- لو فيه Session قديمة، يجب أن يظهر اختيار: تكمل القديمة أو تلغيها وتبدأ اليوم.
- لا يبدأ التطبيق أول يوم في الـSplit بدل اليوم الحالي.

### E. Workout

- اختر تمرينًا وسجّل وزنًا وعدات.
- أضف Set جديدة.
- أضف Exercise أثناء الجلسة.
- اكتب Exercise Notes.
- بدّل ترتيب التمارين.
- أنهِ التمرينة وافتح تفاصيلها من History.
- جرّب إدخال قيم غير صحيحة وتأكد أن التطبيق يرفضها برسالة مفهومة.

### F. Rest Timer والإشعارات

- جرّب 60/90/120 ثانية.
- جرّب Pause وResume و±15 ثانية.
- جرّب Sound On/Off وVibration On/Off.
- اضغط Test Notification من Settings.
- ضع التطبيق في الخلفية وانتظر التنبيه.
- اضغط التنبيه وتأكد أنه يفتح الشاشة الصحيحة.
- تأكد أن الإشعار يظهر في Notification Center والـbadge يختفي بعد قراءته.

### G. Offline الحقيقي

1. افتح Home وSplit وWorkout مرة واحدة والإنترنت شغال حتى تُحفظ البيانات في SQLite.
2. فعّل Airplane Mode.
3. افتح التطبيق.
4. ابدأ تمرينة من الـCached Schedule.
5. سجّل Sets وأضف Set وأكمل التمرينة.
6. اقفل التطبيق وافتحه والإنترنت ما زال مقفولًا.
7. تأكد أن البيانات لم تختفِ وأن Banner يوضح Pending Sync.
8. أعد الإنترنت.
9. اضغط Sync Now أو انتظر المزامنة التلقائية.
10. تأكد أن Pending وصل إلى 0 ولا توجد Sessions أو Sets مكررة.

### H. UI/UX

- جرّب Arabic وEnglish.
- جرّب Light وDark وSystem.
- افتح الكيبورد في الشاشات التي تحتوي Forms.
- جرّب جهازًا صغير الشاشة أو كبّر حجم الخط من إعدادات Android.
- لا يوجد زر ظاهر يعرض Coming Soon أو لا يعمل.

## 9) أنشئ Preview APK بعد نجاح الاختبارات

الـPreview Build لا يحتاج Metro أو Android SDK محليًا:

```bat
cd /d "%PROJECT%"
npx eas-cli@latest project:info
npx eas-cli@latest env:list --environment development
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

نزّل الـAPK الناتج وثبّته كتطبيق مستقل، ثم كرر أهم اختبارات Profile/Crew/Workout/Notifications/Offline بدون تشغيل Metro.

## 10) Commit وPush

بعد نجاح الاختبارات:

```bat
cd /d "%PROJECT%"
git status
git add -A
git commit -m "feat: complete Gym Crew mobile v0.2.0 experience"
git push origin develop
```

بعد نجاح Preview APK فقط:

```bat
git checkout main
git pull origin main
git merge --no-ff develop
git push origin main
git tag -a mobile-beta-0.2.0 -m "Gym Crew Mobile beta 0.2.0"
git push origin mobile-beta-0.2.0
git checkout develop
```

## 11) الرجوع للنسخة السابقة

لو لم تعمل Commit بعد وتريد الرجوع للنقطة التي سبقت الـPatch:

```bat
cd /d "%PROJECT%"
git reset --hard backup/pre-mobile-v0.2.0
```

لو عملت Commit للـPatch ورفعته، استخدم `git revert` بدل حذف التاريخ:

```bat
git log --oneline -5
git revert <PATCH_COMMIT_HASH>
git push origin develop
```
