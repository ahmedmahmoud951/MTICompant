# 🌐 MTI Project Management — Web Application Frontend

واجهة الويب الرسمية لمنصة **MTI Engineering Solutions** لإدارة المشاريع والمواقع الميدانية والمحادثات اللحظية.

## 🚀 التقنيات المستخدمة
- **Framework**: Next.js 14 (App Router)
- **Library**: React 18 & TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Real-Time Client**: `@microsoft/signalr`
- **Internationalization**: دعم ثنائي اللغة (العربية RTL والإنجليزية LTR)

## 📦 التثبيت والتشغيل المحلي
```bash
# تثبيت التبعيات
npm install

# تشغيل سيرفر التطوير المحلي
npm run dev
```

يعمل التطبيق افتراضياً على: [http://localhost:3000](http://localhost:3000).

## ⚙️ ملفات البيئة (Environment Variables)
- **للتطوير المحلي (`.env.local`)**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5126
  ```
- **للإنتاج السحابي (`.env.production`)**:
  ```env
  NEXT_PUBLIC_API_URL=https://mtiapi.runasp.net
  ```

## 🏗️ بناء نسخة الإنتاج (Production Build)
```bash
npm run build
```
يقوم الأمر بإنشاء مجلد `.next` المترجم بالكامل للرفع على الاستضافة السحابية `https://mticompany.runasp.net`.
