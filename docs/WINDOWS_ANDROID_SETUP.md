# تشغيل Gym Crew Mobile على Windows وAndroid

## 1) جهّز البيئة

- Node.js 20 أو أحدث.
- Android Studio مع Android SDK وAndroid Emulator.
- موبايل Android مع USB debugging اختياريًا.

## 2) جهّز المتغيرات

انسخ `.env.example` إلى `.env.local` واكتب بيانات Supabase العامة فقط.

## 3) شغّل النسخة التطويرية

```bat
npm install
npm run check
npx expo start
```

اضغط `a` لفتح Android Emulator. لتجربة الصوت والإشعارات والخصائص الأصلية بصورة أدق، استخدم Development Build:

```bat
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile development
```

## 4) APK تجريبي

```bat
eas build --platform android --profile preview
```

## 5) AAB للمتجر

```bat
eas build --platform android --profile production
```

لا ترفع `.env.local`، ولا تستخدم service-role key أو OpenAI key داخل تطبيق الموبايل.
