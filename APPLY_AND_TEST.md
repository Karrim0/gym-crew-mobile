# Gym Crew Mobile v0.5.0 — Apply & Test

النسخة دي **Rescue Overlay كامل** مبني على فولدر المشروع اللي تم رفعه، وليس Patch جزئي فوق نسخة متوقعة. السكربت يستبدل ملفات التطبيق الأساسية بالكامل ويُبقي `.git` و`.env.local` و`node_modules` كما هي.

## قبل التطبيق

- اقفل Metro بـ `Ctrl + C`.
- لا تشغّل `prebuild` أو `npm audit fix --force`.
- ضع `gym-crew-mobile-v0.5.0-rescue-patch.zip` داخل Downloads.

## 1) نسخة أمان محلية

```bat
set "PROJECT=E:\A-KAREEM-TECH\MobileApps\gym-crew-mobile"
set "BACKUP=E:\A-KAREEM-TECH\MobileApps\gym-crew-mobile-backup-before-v050"

if exist "%BACKUP%" rmdir /s /q "%BACKUP%"
robocopy "%PROJECT%" "%BACKUP%" /E /XD node_modules .expo .git dist /R:2 /W:1
```

النسخة الاحتياطية تشمل `.env.local`. لا ترفعها أو تشاركها.

## 2) فك وتطبيق Rescue Overlay

```bat
set "PATCHZIP=%USERPROFILE%\Downloads\gym-crew-mobile-v0.5.0-rescue-patch.zip"
set "PATCHDIR=%TEMP%\gym-crew-mobile-v0.5.0-rescue-patch"

if exist "%PATCHDIR%" rmdir /s /q "%PATCHDIR%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%PATCHZIP%' -DestinationPath '%PATCHDIR%' -Force"

dir "%PATCHDIR%\APPLY_PATCH.cmd"
dir "%PATCHDIR%\SQL_TO_RUN_IN_SUPABASE.sql"

call "%PATCHDIR%\APPLY_PATCH.cmd" "%PROJECT%"
```

المتوقع:

```text
[OK] Rescue files copied successfully.
[OK] .git, .env.local and node_modules were preserved.
```

## 3) تأكد من النسخة

```bat
cd /d "%PROJECT%"
node -p "require('./package.json').version"
findstr /C:"version: "0.5.0"" app.config.js
findstr /C:"versionCode: 5" app.config.js
```

المتوقع أن يظهر `0.5.0` و`versionCode: 5`.

## 4) طبّق SQL على Supabase

من CMD:

```bat
type "%PATCHDIR%\SQL_TO_RUN_IN_SUPABASE.sql" | clip
```

ثم داخل Supabase:

```text
SQL Editor → New query → Ctrl + V → Run
```

المتوقع:

```text
Success. No rows returned
```

الملف idempotent ويحتوي إصلاح الجروب، Avatar Storage، Gym Mode metadata، Girls 4-Day Split، وإعادة بناء الأسبوع بتوقيت القاهرة. لا يعطّل RLS.

## 5) الفحص الكامل

```bat
call "%PATCHDIR%\VERIFY_PATCH.cmd" "%PROJECT%"
```

أو يدويًا:

```bat
cd /d "%PROJECT%"
npm ci
npm run check
npx expo install --check
npx expo config --type public
```

لا تشغّل:

```bat
npm audit fix --force
```

## 6) تشغيل Development Build

```bat
cd /d "%PROJECT%"
npx expo start --dev-client --lan --clear
```

الموبايل والكمبيوتر على نفس Wi‑Fi. الـDevelopment Build الحالي يكفي لأنه لا توجد Native Dependency جديدة.

## 7) سيناريو الاختبار الوظيفي

### أونلاين مرة واحدة

افتح: Home، Split، Workout، Progress، Profile، Crew، History. بعدها طبّق **Girls 4-Day Strength** وتأكد من ظهور 4 أيام و25 تمرينًا.

### Gym Mode

- اضغط بدء تمرينة اليوم.
- اختبر سؤال الترتيب الخفيف.
- تأكد أن أول تمرين يظهر في شاشة واحدة.
- عدّل الوزن والعدات بالضغط، وسجل السِت.
- اختبر: السِت التالية، التمرين التالي، سِت زيادة، Undo، Notes، ترتيب الجلسة، إنهاء التمرينة.
- اضغط زر التسجيل مرتين بسرعة وتأكد أنه لا يسجل Duplicate.

### Offline

- بعد الـwarm-up فعّل Airplane Mode.
- اقفل التطبيق وافتحه من الأيقونة.
- افتح Home وSplit وWorkout وProgress وProfile وHistory.
- ابدأ تمرينة، سجل Sets وNotes، اقفل التطبيق وافتحه، ثم أكمل وأنهِ.
- رجّع الإنترنت وافتح Settings؛ يجب أن يقل Pending Sync حتى يصل للصفر بدون Sets مكررة.

### Light/Dark/Small screens

اختبر Light وDark والعربي والإنجليزي، وراجع عدم خروج الأزرار أو مدخلات Gym Mode خارج الشاشة.

## 8) Git بعد نجاح الاختبار

```bat
cd /d "%PROJECT%"
git checkout develop
git status
git add -A
git commit -m "feat: rescue offline flow and advanced gym experience v0.5.0"
git push origin develop
```

بعد اختبار الـAPK فقط، ادمج `develop` إلى `main` وأنشئ Tag.

## 9) Preview APK مستقل

```bat
npx eas-cli@latest project:info
npx eas-cli@latest env:list --environment development
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

لا تحتاج Android SDK محليًا لأن EAS Cloud ينفذ البناء.
