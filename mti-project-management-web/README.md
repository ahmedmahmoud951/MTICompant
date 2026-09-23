# 🌐 MTI Project Management — Web Application Frontend

> **واجهة الويب الرسمية والمؤسسية لمنصة MTI Engineering Solutions لإدارة المشروعات، المستندات الهندسية، الأرشيف المحصن، والمحادثات اللحظية.**

![Frontend](https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js)
![Language](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![Styling](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Realtime](https://img.shields.io/badge/SignalR-Client-f472b6?style=for-the-badge&logo=signalr)
![Mobile](https://img.shields.io/badge/Mobile%20%26%20Tablet-100%25_Optimized-06b6d4?style=for-the-badge)

---

## 🌟 الميزات المكتملة في تطبيق الويب (Implemented Modules)

1. **إدارة المستندات الهندسية (`src/features/documents/DocumentsManager.tsx`)**:
   - إدارة كاملة للمخططات التنفيذية والوثائق الهندسية.
   - تتبع سجل الإصدارات وتوثيق البصمة الرقمية `SHA-256`.
   - نافذة تعديل 24 ساعة للمهندسين مع القفل التلقائي.
   - إبراز هوية الرافع والمالك والمراجع المعتمد في كل مكان.
   - تحميل ومعاينة سحابية مباشرة عبر روابط Backblaze B2 المؤقتة.

2. **أرشيف التقارير المحصن (`activeTab === 'reports-archive'`)**:
   - صفحة مستقلة ذات أداء عالي للأرشيف الهندسي.
   - فلترة متعددة: البحث النصي، نوع التقرير، المشروع، الموقع، المهندس الرافع، ونطاق التواريخ.
   - ثبات البيانات عند التحديث (F5 Persistence).

3. **مركز التحليلات والتقارير التنفيذية (`src/features/reports/ReportsAnalyticsHub.tsx`)**:
   - مؤشرات أداء تفاعلية حية (KPI Cards).
   - تصدير فوري بنقرة واحدة بصيغتي **Excel (.xlsx)** و **CSV (.csv)** مع دعم كامل للترميز العربي.

4. **مركز الاعتمادات والرقابة الإدارية (`activeTab === 'approvals' & 'audit'`)**:
   - اعتماد، رفض، أو طلب تعديلات مع إبراز هوية المهندس الرافع.
   - سجل تدقيق العمليات (Audit Logs) للأدمن بشارات ملونة وهوية المستخدم المنفذ.

5. **المحادثات والتواصل اللحظي (`SignalR WebSockets`)**:
   - قنوات المشروعات والمحادثات المباشرة، مؤشرات القراءة، إرسال الوسائط والتسجيلات الصوتية.

6. **تجربة الموبايل والتابلت المتطورة**:
   - شريط ملاحة سفلي زجاجي (`Glass Bottom Bar`) لسهولة التنقل السريع بلمسة واحدة.
   - واجهة محادثات كاملة للهواتف ونوافذ تفاعلية منبثقة (`Bottom Sheets`).
   - منع تكبير الشاشة التلقائي في متصفحات iOS Safari.

---

## 🚀 التثبيت والتشغيل المحلي (Local Setup)

```bash
# تثبيت التبعيات
npm install

# فحص سلامة TypeScript
npx tsc --noEmit

# تشغيل سيرفر التطوير
npm run dev
```

يعمل التطبيق على: [http://localhost:3000](http://localhost:3000).

---

## ⚙️ متغيرات البيئة (Environment Variables)

- **بيئة التطوير المحلي (`.env.local`)**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5126
  ```
- **بيئة الإنتاج السحابي (`.env.production`)**:
  ```env
  NEXT_PUBLIC_API_URL=https://mtiapi.runasp.net
  ```

---

## 🏗️ بناء نسخة الإنتاج (Production Build)

```bash
npm run build
```

---

## 🔗 الروابط السحابية والمستودع
* **الرابط المباشر للمنصة**: [https://mticompany.runasp.net](https://mticompany.runasp.net)
* **المستودع الرسمي على GitHub**: [ahmedmahmoud951/MTICompant](https://github.com/ahmedmahmoud951/MTICompant.git)
