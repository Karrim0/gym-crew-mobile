# Gym Crew Mobile v0.5.0 — Rescue Changelog

## إنقاذ واستقرار المشروع

- إزالة مشكلة فولدر `files/src` نهائيًا عبر `tsconfig` و`.gitignore` وRescue Overlay نظيف.
- إصلاح تهيئة Auth/Router بحيث فشل فحص الشبكة لا يجمّد التطبيق.
- Error Boundary عام ورسائل مستخدم طبيعية بدل أخطاء PostgreSQL وJavaScript الخام.
- حماية قراءة SQLite من Payload تالف، وتهيئة قاعدة البيانات مرة واحدة بأمان.
- تنظيف كل Cache محلي عند Sign Out كحد خصوصية على الأجهزة المشتركة.

## Offline-First

- تحميل Profile/Workspace من SQLite أولًا وفتح التطبيق فورًا من الـCache.
- Warm-up لخزن Split، Week Schedule، Exercises، History، Progress وCrew summaries.
- بدء واستكمال وإنهاء التمرينة Offline مع إعادة فتح التطبيق دون فقد البيانات.
- Sync Queue idempotent، ترتيب Parent→Child، وعدم إيقاف الطابور كله بسبب Row واحدة فاشلة.
- Pending Sync وOffline feedback هادئ وغير مزعج.

## Girls 4-Day Strength

- تطبيق موثّق لأربع أيام تدريب و25 تمرينًا.
- Validation بعد التطبيق بدل Success وهمي.
- إعادة بناء الأسبوع الحالي والمستقبلي بتوقيت `Africa/Cairo` ونظام السبت–الجمعة.
- Fallback آمن بين RPC v3/v2/legacy عند اختلاف Schema Cache.

## Gym Mode

- تمرين واحد في الشاشة، والعمليات الأساسية بدون Scroll في الاستخدام الطبيعي.
- Weight/Reps controls كبيرة وقابلة للضغط والكتابة، مع تذكر خطوة الوزن لكل تمرين ووحدة.
- Previous Set/Best performance واضحان بدون زحمة.
- زر أساسي واحد: `خلصت السِت`، مع حماية Duplicate Tap.
- بعد التسجيل: Next Set / Next Exercise / Extra Set / Undo بكليك واحدة.
- Notes والTimer وقائمة التمارين والترتيب داخل Bottom Sheets اختيارية.
- حفظ محلي صامت بعد كل Action، وتنبيهات للأخطاء والقرارات المهمة فقط.
- دعم kg/lb مع التخزين الداخلي بالكيلو لتجنب تلف البيانات.

## UI/UX

- Design System Lime / Black / White مستوحى من مرجع المستخدم دون نسخ التصميم.
- Home، Crew، Split، Workout، Progress، Profile، Settings وHistory بتسلسل بصري جديد.
- Floating Bottom Navigation، Dark hero cards، touch targets مريحة، Light/Dark مضبوطين.
- Safe Area، Keyboard avoidance، الشاشات الصغيرة، RTL/LTR، Press states وContrast أفضل.
- حذف Assets تجريبية وغير مستخدمة من قالب Expo لتقليل حجم الـBundle والـAPK.

## Release identity

- App version: `0.5.0`
- Android versionCode: `5`
- iOS buildNumber: `5`
