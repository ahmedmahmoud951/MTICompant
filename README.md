# 🏢 MTI Engineering Solutions — Enterprise Project Management System

> **المنصة السحابية المتكاملة لإدارة المشاريع الهندسية، المواقع الميدانية، الأرشفة المحصنة للمستندات والتقارير، والتواصل اللحظي.**

![Platform](https://img.shields.io/badge/.NET-8.0-512bd4?style=for-the-badge&logo=dotnet)
![Frontend](https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js)
![Language](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![Database](https://img.shields.io/badge/SQL_Server-2022-cc292b?style=for-the-badge&logo=microsoftsqlserver)
![Realtime](https://img.shields.io/badge/SignalR-WebSockets-f472b6?style=for-the-badge&logo=signalr)
![Storage](https://img.shields.io/badge/Backblaze-B2_Cloud-e11d48?style=for-the-badge)
![Responsive](https://img.shields.io/badge/Mobile%20%26%20Tablet-100%25_Optimized-06b6d4?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-blue?style=for-the-badge)

---

## 📑 فهرس المحتويات (Table of Contents)

1. [نظرة عامة على المشروع (Executive Overview)](#1-نظرة-عامة-على-المشروع-executive-overview)
2. [المعمارية التقنية وهندسة النظام (Architecture & Tech Stack)](#2-المعمارية-التقنية-وهندسة-النظام-architecture--tech-stack)
3. [الأنظمة والميزات المكتملة بالتفصيل (Comprehensive Feature Breakdown)](#3-الأنظمة-والميزات-المكتملة-بالتفصيل-comprehensive-feature-breakdown)
   - [أ. إدارة المستندات الهندسية (Engineering Documents EDMS)](#أ-إدارة-المستندات-الهندسية-engineering-documents-edms)
   - [ب. أرشيف التقارير الميدانية المحصن (Immutable Reports Archive)](#ب-أرشيف-التقارير-الميدانية-المحصن-immutable-reports-archive)
   - [ج. مركز التحليلات والتقارير التنفيذية (Reports & Analytics Hub)](#ج-مركز-التحليلات-والتقارير-التنفيذية-reports--analytics-hub)
   - [د. توثيق هوية الرافع والرقابة الإدارية (Audit & Uploader Tracking)](#د-توثيق-هوية-الرافع-والرقابة-الإدارية-audit--uploader-tracking)
   - [هـ. مركز الاعتمادات والمراجعة (Approval Center)](#هـ-مركز-الاعتمادات-والمراجعة-approval-center)
   - [و. التواصل اللحظي والمحادثات (SignalR Real-Time Chat)](#و-التواصل-اللحظي-والمحادثات-signalr-real-time-chat)
   - [ز. تجربة الموبايل والتابلت المتطورة (Mobile & Tablet Experience)](#ز-تجربة-الموبايل-والتابلت-المتطورة-mobile--tablet-experience)
4. [هيكل المشروع والطبقات (Solution Structure)](#4-هيكل-المشروع-والطبقات-solution-structure)
5. [التخزين السحابي الآمن (Backblaze B2 Storage Architecture)](#5-التخزين-السحابي-الآمن-backblaze-b2-storage-architecture)
6. [نظام الصلاحيات والأمان (Security, RBAC & 24h Window)](#6-نظام-الصلاحيات-والأمان-security-rbac--24h-window)
7. [حسابات التشغيل الافتراضية (Default Seeded Users)](#7-حسابات-التشغيل-الافتراضية-default-seeded-users)
8. [دليل واجهات برمجة التطبيقات (Complete API Reference)](#8-دليل-واجهات-برمجة-التطبيقات-complete-api-reference)
9. [دليل الإعداد والتشغيل المحلي (Local Setup Guide)](#9-دليل-الإعداد-والتشغيل-المحلي-local-setup-guide)
10. [دليل النشر السحابي والإنتاج (Production Deployment on RunASP)](#10-دليل-النشر-السحابي-والإنتاج-production-deployment-on-runasp)

---

## 1. نظرة عامة على المشروع (Executive Overview)

منصة **MTI Engineering Solutions** هي منظومة سحابية متقدمة وموحدة تم تصميمها خصيصاً لتلبية متطلبات شركات المقاولات والحلول الهندسية وإدارة المشروعات الكبرى. تربط المنصة بين:
* **الإدارة العليا والمكتب الفني (Executives, PMs & Technical Office)**: مراقبة فورية لنسب إنجاز المشروعات، متابعة مؤشرات الأداء اللحظية (KPIs)، اعتماد أو رفض أو طلب تعديلات على التقارير الميدانية والمستندات الهندسية، وتصدير التقارير التنفيذية بصيغ Excel و CSV.
* **المهندسون الميدانيون وطواقم التنفيذ (Field Engineers & Site Crews)**: توثيق سير العمل اليومي عبر تقارير مهيكلة (الأعمال المنفذة، أحوال الطقس، أعداد الطواقم، المرفقات والصور)، ورفع المخططات والمستندات الهندسية مع تتبع سجل الإصدارات وحماية الوثائق المعتمدة من أي تلاعب.

---

## 2. المعمارية التقنية وهندسة النظام (Architecture & Tech Stack)

تم بناء النظام باتباع مبادئ **Clean Architecture (Onion Architecture)** مع نمط **Domain-Driven Design (DDD)** لعزل منطق العمل وقواعد العمليات عن طبقات البنية التحتية والواجهات:

```
┌────────────────────────────────────────────────────────────────────────┐
│             Frontend Web: Next.js 14 (App Router) + TypeScript         │
│          Tailwind CSS + Lucide Icons + SignalR Client + Mobile UX      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST) / WSS (SignalR)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             MTI.ProjectManagement.Api (Controllers & Hubs)             │
│        JWT Auth, Swagger, Exception Middleware, File Endpoints         │
├────────────────────────────────────────────────────────────────────────┤
│           MTI.ProjectManagement.Application (Services & DTOs)          │
│       Contracts, Fluent Validation, Business Rules, Auditing           │
├────────────────────────────────────────────────────────────────────────┤
│             MTI.ProjectManagement.Domain (Core Business Core)          │
│        Entities, Enums, Value Objects, Domain Events, No External Libs │
├────────────────────────────────────────────────────────────────────────┤
│          MTI.ProjectManagement.Infrastructure (External Adapters)      │
│   EF Core 8, MS SQL Server, Backblaze B2 S3 Client, SignalR Gateway    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       [ Microsoft SQL Server 2022 ]    [ Backblaze B2 Cloud (S3 API) ]
```

### المكونات التقنية الرئيسية:
* **الواجهة الخلفية (Backend)**: ASP.NET Core 8 Web API, C# 12.
* **قاعدة البيانات والـ ORM**: SQL Server 2022 مع Entity Framework Core 8، دعم Soft-Delete، وفلاتر تدقيق شاملة (`CreatedAt`, `CreatedBy`, `UpdatedAt`).
* **الاتصال اللحظي (Real-time)**: ASP.NET Core SignalR WebSockets لمزامنة حالة السجلات، المحادثات، والإشعارات فورياً بدون الحاجة لإعادة تحميل الصفحة.
* **التخزين السحابي (Cloud Object Storage)**: Backblaze B2 عبر بروتوكول S3 المتوافق وروابط التوقيع المؤقتة المباشرة (Direct Pre-signed URLs) مع حماية الـ Bucket بالكامل وحل مشكلات الـ CORS.
* **الواجهة الأمامية (Frontend)**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons.
* **الأمان والمصادقة**: JWT Bearer Tokens مع Refresh Tokens مجدولة في قاعدة البيانات، ونظام صلاحيات صارم (RBAC).

---

## 3. الأنظمة والميزات المكتملة بالتفصيل (Comprehensive Feature Breakdown)

### أ. إدارة المستندات الهندسية (Engineering Documents EDMS)
نظام متكامل لأرشفة وإدارة دورة حياة الوثائق الهندسية:
* **تتبع الإصدارات المتعددة (Version History)**: تتبع إصدارات كل مستند (`v1`, `v2`, `v3`...) مع حفظ سبب التعديل (`changeReason`)، اسم الرافع، وحجم وتاريخ كل ملف، مع حساب البصمة الرقمية المشفرة `SHA-256 Checksum`.
* **نافذة التعديل المؤقتة (24-Hour Edit Window)**: إتاحة 24 ساعة فقط لمهندس الموقع لتعديل أو استبدال ملف النسخة الجديدة؛ وبعد انقضاء الـ 24 ساعة، يتم غلق المستند تلقائياً لحمايته من أي تغيير ويصبح طلب رفع نسخة جديدة إجبارياً.
* **المسار الإداري للاعتماد (Review & Approval Flow)**: فحص المستندات بواسطة الأدمن أو المكتب الفني وإصدار قرارات: **معتمد (Approved)**، **مطلوب تعديلات (Correction Requested)**، أو **مرفوض (Rejected)**.
* **تصنيفات هندسية قياسية**: المخططات التنفيذية (Shop Drawings)، المخططات المنفذة (As-Built)، جداول الكميات (BOQ)، تقارير الفحص الميداني، المواصفات الفنية، والفواتير والمستخلصات.
* **المعاينة والتحميل المباشر**: فتح وتنزيل الملفات والمخططات الهندسية مباشرة عبر الروابط المؤقتة الموقعة من Backblaze B2 بدون أي تعارض في المفاتيح (`NoSuchKey`).

---

### ب. أرشيف التقارير الميدانية المحصن (Immutable Reports Archive)
صفحة مستقلة وشاملة لعرض وتوثيق التقارير الهندسية بعد اعتمادها:
* **حماية قانونية وهندسية (Immutability)**: تصبح التقارير المعتمدة غير قابلة للحذف أو التعديل من أي مستخدم لضمان موثوقية وأمان السجلات.
* **محرك بحث وتصفية متعدد الفلاتر (Multi-Criteria Filter Engine)**:
  * البحث الفوري باسم التقرير، المحتوى، أو الكود.
  * فلترة حسب نوع التقرير (تقرير يومي، سلامة وصحة مهنية، فحص خرسانات، جودة...).
  * فلترة حسب المشروع المستهدف والموقع الميداني.
  * فلترة حسب المهندس الرافع للتقرير.
  * فلترة مخصصة بنطاق التواريخ (من تاريخ إلى تاريخ).
* **إحصائيات فورية للأرشيف**: عداد ديناميكي فوري يُظهر إجمالي التقارير المعتمدة، مع زر استعادة الفلاتر الافتراضية بنقرة واحدة.
* **حل مشكلة تحديث الصفحة (F5 Persistence)**: جلب السجلات المعتمدة دون شروط مسبقة لجميع الأدوار لضمان بقائها نشطة دائماً.

---

### ج. مركز التحليلات والتقارير التنفيذية (Reports & Analytics Hub)
لوحة تحليلات تنفيذية تفاعلية (`ReportsAnalyticsHub.tsx`):
* **بطاقات مؤشرات الأداء الحية (Executive KPI Cards)**:
  * إجمالي المشاريع المعتمدة ونطاق العمل النشط.
  * إجمالي المواقع الميدانية والمحطات تحت المتابعة.
  * معدل إنجاز المهام الميدانية ونسبة الإتمام المئوية (`% Completion`).
  * إجمالي السجلات والتقارير الموثقة بالأرشيف المحصن.
* **نطاق تصفية ديناميكي**: اختيار المشروع والموقع والفترة الزمنية لتحديث كافة الرسوم البيانية والأرقام لحظياً.
* **تصدير فوري بنقرة واحدة (Instant One-Click Export)**:
  * دعم التصدير بصيغتي **Excel (.xlsx)** و **CSV (.csv)** لجميع الكيانات (المشاريع، المواقع، المهام، السجلات المعتمدة، طلبات الاعتماد).
  * دعم كامل لمعايير الترميز العربي `UTF-8 with BOM` لضمان عدم تشوه الحروف في برامج Microsoft Excel.

---

### د. توثيق هوية الرافع والرقابة الإدارية (Audit & Uploader Tracking)
إبراز هوية المستخدم الذي قام برفع أي تقرير، مستند، أو تنفيذ أي عملية في النظام بصورة واضحة وبارزة للأدمن:
* **في المستندات الهندسية**:
  * شارة نيون مضيئة في قائمة المستندات: `الرافع: [اسم المستخدم]` مع أيقونة المستخدم والحرف الأول.
  * بطاقة بيانات كاملة لرافع المستند في لوحة التفاصيل الجانبية (Drawer).
  * إظهار اسم رافع كل إصدار على حدة في سجل الإصدارات (`ver.uploadedByUserName`).
  * توثيق اسم طالب الاعتماد واسم المراجع المعتمد في سجل اعتمادات المستند.
* **في نافذة فحص التقارير (`ReportDetailsModal.tsx`)**:
  * **بطاقة تدقيق القائم بالرفع (Administrative Audit Card)** تحتوي على الاسم الكامل للمهندس، معرفه الرقمي، التوقيت الدقيق للرفع، وحالة الاعتماد وهوية المعتمد.
  * شارة توثيق أسفل كل صورة أو ملف مرفق توضح المهندس الذي قام برفعه.
* **في مركز الاعتمادات (Approvals Center)**:
  * بطاقة بارزة للمهندس القائم بالرفع في مقدمة كل تقرير ينتظر الاعتماد.
* **في سجل العمليات والرقابة (Audit Logs Table للأدمن)**:
  * عمود بارز لبريد واسم المستخدم القائم بالعملية مع شارة دائرية.
  * تصنيف العمليات بشارات لونية مميزة (`CREATE`/`UPLOAD` بلون السيان، `APPROVE` بلون الزمرد، `DELETE` بلون الروز).

---

### هـ. مركز الاعتمادات والمراجعة (Approval Center)
* لوحة تحكم حصرية للأدمن ومديري المشاريع تبرز كافة السجلات والتقارير المعلقة (`Submitted`).
* إمكانية كتابة توجيهات وملاحظات هندسية قبل اتخاذ القرار.
* إجراءات بنقرة واحدة: **اعتماد فوري (Approve)**، **طلب تعديل (Request Changes)**، أو **رفض التقرير (Reject)**.

---

### و. التواصل اللحظي والمحادثات (SignalR Real-Time Chat)
* **قنوات المشاريع والدردشة المباشرة**: محادثات مخصصة لكل مشروع هندسي تجمع المهندسين والإدارة، إلى جانب المحادثات الفردية المباشرة (1-on-1).
* **مؤشرات التسليم والقراءة (Read Receipts)**: ظهور علامات الصح المزدوجة اللحظية وتوقيت قراءة كل عضو للرسالة.
* **مرفقات الوسائط والتسجيل الصوتي**: إرسال الصور والمستندات والتسجيلات الصوتية مباشرة عبر الدردشة.
* **مؤشر الكتابة والتواجد اللحظي**: معرفة المتواجدين حالياً على النظام وحالات الكتابة الفورية.

---

### ز. تجربة الموبايل والتابلت المتطورة (Mobile & Tablet Experience)
تحسين شامل بنسبة 100% لواجهات المنصة على الهواتف الذكية والأجهزة اللوحية:
* **شريط التنقل السفلي الذكي (Glass Bottom Bar)**: شريط ملاحة زجاجي أنيق أسفل شاشات الموبايل (`lg:hidden`) يتيح الوصول السريع بلمسة إبهام لأهم 5 أقسام: الرئيسية، بيانات المشاريع، الأرشيف، المحادثات، والقائمة الكاملة.
* **منع التكبير التلقائي في آيفون (iOS Safari Anti-Zoom)**: ضبط أحجام حقول الإدخال لتكون `16px` على الشاشات الصغيرة لمنع قفز وتكبير الشاشة غير المرغوب فيه.
* **نظام محادثات الهواتف الكامل (Native-like Mobile Chat)**: عند فتح محادثة على الهاتف، تتحول الواجهة تلقائياً لملء الشاشة مع زر "رجوع" أنيق مماثل لتجربة WhatsApp و Telegram.
* **نوافذ منبثقة تفاعلية (Responsive Bottom Sheets)**: تفتح النوافذ المنبثقة من أسفل الشاشة على الهواتف مع أزرار اعتماد وإغلاق ثابتة (Sticky Footers).

---

## 4. هيكل المشروع والطبقات (Solution Structure)

```
MTI Comany Project/
├── MTI.ProjectManagement.sln                   # ملف الحل الرئيسي لـ .NET
├── README.md                                   # هذا الملف التوثيقي الشامل
│
├── src/                                        # الواجهة الخلفية (.NET 8 Clean Architecture)
│   ├── MTI.ProjectManagement.Domain/           # الكيانات النقية وقواعد النطاق
│   │   ├── Entities/                           # Project, Site, Document, ProjectDataRecord, TaskItem...
│   │   ├── Enums/                              # ProjectStatus, DocumentStatus, DataRecordStatus, UserRole...
│   │   └── Interfaces/                         # IAggregateRoot, IAuditableEntity, ISoftDeletable
│   │
│   ├── MTI.ProjectManagement.Application/      # منطق التطبيق وحالات الاستخدام
│   │   ├── Common/                             # Result patterns, PagedList, Exceptions
│   │   ├── DTOs/                               # Data Transfer Objects لكافة العمليات
│   │   ├── Interfaces/                         # IApplicationDbContext, IB2StorageService, ISignalRNotifier
│   │   └── Specifications/                     # شروط الفلترة والبحث المتقدم
│   │
│   ├── MTI.ProjectManagement.Infrastructure/   # البنية التحتية والمحولات الخارجية
│   │   ├── Persistence/                        # ApplicationDbContext, Entity Configurations, Migrations
│   │   ├── Storage/                            # B2StorageService (Backblaze B2 S3 Client)
│   │   ├── SignalR/                            # ProjectHub, ChatHub, Real-time Notifiers
│   │   └── Services/                           # TokenService, DateTimeService, CurrentUserService
│   │
│   └── MTI.ProjectManagement.Api/              # واجهات برمجة التطبيقات ونقطة الدخول
│       ├── Controllers/                        # Auth, Projects, Sites, Documents, ProjectData, Chat...
│       ├── Middlewares/                        # ExceptionHandlingMiddleware, JwtRefreshMiddleware
│       ├── Properties/PublishProfiles/         # ملفات النشر السحابي (WebDeploy)
│       └── Program.cs                          # تكوين الخدمات والتبعيات والحماية
│
├── mti-project-management-web/                 # الواجهة الأمامية (Next.js 14 App Router)
│   ├── src/
│   │   ├── app/                                # مسارات ومخططات Next.js (App Router)
│   │   │   ├── layout.tsx                      # المخطط العام وتصدير الـ Viewport للموبايل
│   │   │   ├── page.tsx                        # الصفحة الرئيسية والتبويبات المتقدمة
│   │   │   └── globals.css                     # أنماط Tailwind ومتغيرات التصميم المؤسسي
│   │   ├── components/                         # المكونات التفاعلية العامة
│   │   │   ├── AppModal.tsx                    # النافذة المنبثقة المتجاوبة
│   │   │   ├── ReportDetailsModal.tsx          # نافذة فحص وتدقيق التقارير واعتمادها
│   │   │   └── UploadProgressBar.tsx           # مؤشر تقدم رفع الملفات اللحظي
│   │   ├── features/                           # الأنظمة الفرعية المكتملة
│   │   │   ├── documents/                      # DocumentsManager.tsx (نظام إدارة الوثائق)
│   │   │   ├── reports/                        # ReportsAnalyticsHub.tsx (لوحة التحليلات والتصدير)
│   │   │   └── dashboard/                      # MainDashboard.tsx (لوحة القيادة الميدانية)
│   │   ├── services/                           # عملاء الاتصال بالـ API و SignalR
│   │   │   ├── api-client.ts                   # Axios client مع اعتراض التوكنات وتجديدها
│   │   │   ├── documents.service.ts            # خدمات المستندات والنسخ والتحميل
│   │   │   ├── data-records.service.ts         # خدمات السجلات الميدانية والاعتمادات
│   │   │   └── signalr.service.ts              # إدارة اتصال الـ WebSockets
│   │   ├── types/                              # تعريفات TypeScript الشاملة
│   │   └── lib/                                # الترجمة (i18n) والمساعدات العامة
│   ├── package.json
│   └── tailwind.config.ts
│
├── docker/                                     # تكوينات الحاويات (Dockerfiles)
├── nginx/                                      # تكوينات سيرفر Nginx
└── docs/                                       # وثائق إضافية وأدلة معمارية
```

---

## 5. التخزين السحابي الآمن (Backblaze B2 Storage Architecture)

يعتمد النظام على **Backblaze B2 Cloud Storage** المتوافق مع معايير **Amazon S3 API**:
1. **أمان الملفات (Private Bucket)**: الحاوية مغلقة بالكامل أمام الوصول العام؛ لا يمكن الوصول لأي ملف إلا برابط موقع ومحدد زمنياً ومحمي بالتوكن.
2. **الرفع المباشر (Direct Pre-Signed Uploads)**: يطلب المتصفح رابط رفع موقع من السيرفر بصلاحية محددة، ثم يرفع الملف مباشرة إلى Backblaze B2 لتخفيف الحمل تماماً عن سيرفر الـ API.
3. **حل معضلة الروابط وتنزيل المستندات**: يولد النظام روابط تحميل مسبقة التوقيع (`Pre-signed Download URLs`) بصلاحية تنتهي تلقائياً، مع دعم فك التشفير التلقائي لمسارات الملفات، مما يقضي نهائياً على أخطاء `NoSuchKey` عند معاينة وتنزيل المخططات.

---

## 6. نظام الصلاحيات والأمان (Security, RBAC & 24h Window)

يدعم النظام 5 أدوار صلاحية قياسية:

| الدور (Role) | الصلاحيات والمسؤوليات |
|---|---|
| **Admin** (الأدمن) | وصول كامل وشامل لكافة أقسام النظام، اعتماد ورفض التقارير، حذف واستعادة السجلات، إدارة المستخدمين، والاطلاع على سجل التدقيق والرقابة (Audit Logs). |
| **ProjectManager** (مدير المشاريع) | إدارة ومتابعة المشاريع التابعة له، إسناد المهندسين للمواقع، مراجعة واعتماد التقارير الميدانية والمستندات. |
| **TechnicalOffice** (المكتب الفني) | مراجعة واعتماد المخططات التنفيذية، جداول الكميات، إصدارات المستندات، وطلب تعديلات هندسية. |
| **Engineer** (المهندس الميداني) | رفع التقارير اليومية وتوثيق الأعمال وملاحظات الطقس والعمالة، رفع المخططات الهندسية، مع إمكانية تعديل النسخة المرفوعة خلال نافذة 24 ساعة فقط. |
| **Viewer** (المشاهد) | استعراض ومطالعة التقارير والمستندات المعتمدة دون إمكانية التعديل أو الاعتماد. |

---

## 7. حسابات التشغيل الافتراضية (Default Seeded Users)

يحتوي النظام على حسابات مهيأة مسبقاً للاختبار والتشغيل السريع:

| البريد الإلكتروني | كلمة المرور الافتراضية | الدور (Role) | الوصف |
|---|---|---|---|
| `admin@mti.com` | `Admin@MTI2026!` | **Admin** | الحساب الإداري الرئيسي الشامل |
| `pm@mti.com` | `Pm@MTI2026!` | **ProjectManager** | حساب مدير المشروعات |
| `tech@mti.com` | `Tech@MTI2026!` | **TechnicalOffice** | حساب المكتب الفني ومراجعة المخططات |
| `engineer@mti.com` | `Engineer@MTI2026!` | **Engineer** | حساب مهندس موقع ميداني |

---

## 8. دليل واجهات برمجة التطبيقات (Complete API Reference)

### 🔐 المصادقة والتحقق (`/api/auth`)
* `POST /api/auth/login`: تسجيل الدخول وإصدار Access Token و Refresh Token.
* `POST /api/auth/refresh-token`: تجديد رمز الوصول المنتهي.
* `POST /api/auth/logout`: تسجيل الخروج وإلغاء جلسة المستخدم.
* `GET /api/auth/me`: الحصول على بيانات المستخدم المسجل وصلاحياته الحالية.

### 🏗️ إدارة المشروعات والمواقع (`/api/projects` & `/api/sites`)
* `GET /api/projects`: جلب قائمة المشاريع مع دعم الفلترة والترقيم والبحث.
* `POST /api/projects`: إنشاء مشروع جديد.
* `GET /api/projects/{id}`: استرجاع تفاصيل المشروع والمواقع والمهام المرتبطة به.
* `PUT /api/projects/{id}`: تحديث بيانات المشروع.
* `DELETE /api/projects/{id}`: الحذف الناعم للمشروع.
* `GET /api/projects/{id}/sites`: جلب كافة المواقع الميدانية التابعة للمشروع.
* `POST /api/projects/{id}/sites`: إضافة موقع ميداني جديد للمشروع.
* `POST /api/sites/{id}/assign`: إسناد مهندس للموقع.

### 📑 إدارة المستندات الهندسية (`/api/documents`)
* `GET /api/documents`: جلب قائمة المستندات مع فلترة بالمشروع ونوع المستند والبحث.
* `GET /api/documents/{id}`: تفاصيل المستند بالكامل متضمنة سجل الإصدارات والاعتمادات.
* `POST /api/documents`: إنشاء مستند هندسي جديد.
* `PUT /api/documents/{id}`: تعديل بيانات المستند (متاح خلال نافذة 24 ساعة أو للأدمن).
* `DELETE /api/documents/{id}`: حذف المستند (للأدمن أو صاحب المستند في فترة السماح).
* `POST /api/documents/{id}/versions`: رفع إصدار جديد للمستند مع سبب التعديل.
* `GET /api/documents/{id}/download`: الحصول على رابط تحميل مؤقت محمي للمستند.
* `POST /api/documents/{id}/review`: اعتماد، رفض، أو طلب تصحيح على المستند.
* `GET /api/documents/types`: استرجاع قائمة الأنواع القياسية للمستندات.

### 📋 السجلات الميدانية والأرشيف (`/api/project-data`)
* `GET /api/project-data`: استرجاع السجلات الميدانية حسب الحالة والمشروع.
* `POST /api/project-data`: تقديم تقرير موقع وسجل بيانات هندسية جديد.
* `GET /api/project-data/{id}`: تفاصيل التقرير الكاملة ومرفقاته وجداول الأعمال.
* `POST /api/project-data/{id}/approve`: اعتماد التقرير الميداني ونقله للأرشيف المحصن.
* `POST /api/project-data/{id}/reject`: رفض التقرير مع تدوين السبب.
* `POST /api/project-data/{id}/request-changes`: طلب تعديلات فنية من المهندس.
* `GET /api/project-data/approved`: السجلات المعتمدة المحصنة للأرشيف.
* `GET /api/project-data/pending-approvals`: التقارير المعلقة بانتظار قرار الإدارة.

### 📊 التحليلات والتصدير (`/api/reports`)
* `GET /api/reports/dashboard-stats`: إحصائيات ومؤشرات الأداء العامة للنظام.
* `GET /api/reports/export`: تصدير بيانات الكيانات المحددة بصيغة Excel أو CSV.

### 📌 المهام الميدانية (`/api/tasks`)
* `GET /api/tasks`: قائمة المهام بحسب المشروع أو الموقع أو المكلف.
* `POST /api/tasks`: إنشاء وتكليف مهمة ميدانية جديدة.
* `PUT /api/tasks/{id}/status`: تحديث حالة المهمة (قيد التنفيذ، مكتملة، معلقة).

### 💬 المحادثات الفورية اللحظية (`/api/chat`)
* `GET /api/chat/conversations`: جلب المحادثات النشطة للمستخدم.
* `POST /api/chat/conversations`: إنشاء محادثة مباشرة أو قناة مشروع.
* `GET /api/chat/conversations/{id}/messages`: استرجاع سجل رسائل المحادثة.
* `POST /api/chat/messages`: إرسال رسالة جديدة.
* `POST /api/chat/messages/{id}/read`: تأكيد قراءة الرسالة.

### 🔍 سجل الرقابة والعمليات (`/api/audit`)
* `GET /api/audit`: استعراض سجل تدقيق العمليات (للحسابات الإدارية فقط).

---

## 9. دليل الإعداد والتشغيل المحلي (Local Setup Guide)

### المتطلبات المسبقة:
* [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Node.js 18+](https://nodejs.org/) مع مدير الحزم `npm`
* خادم [Microsoft SQL Server](https://www.microsoft.com/sql-server/)

### 1. تشغيل الواجهة الخلفية (Backend API):
```bash
# 1. الانتقال لمجلد الـ API
cd src/MTI.ProjectManagement.Api

# 2. مراجعة سلسلة الاتصال في appsettings.Development.json
# التأكد من صحة بيانات الدخول لخادم SQL Server

# 3. تشغيل المشروع
dotnet run
```
* سيبدأ الـ API بالعمل على: `http://localhost:5126`
* تصفح واجهة توثيق Swagger عبر: `http://localhost:5126/swagger`

### 2. تشغيل الواجهة الأمامية (Frontend Web):
```bash
# 1. الانتقال لمجلد الويب
cd mti-project-management-web

# 2. تثبيت الحزم والمكتبات
npm install

# 3. تشغيل خادم التطوير السريع
npm run dev
```
* افتح المتصفح على: `http://localhost:3000`

---

## 10. دليل النشر السحابي والإنتاج (Production Deployment on RunASP)

النظام مهيأ ومنشور بالكامل على سحابة استضافة **RunASP / MonsterASP**:

* **رابط الـ API السحابي المباشر**: `https://mtiapi.runasp.net`
* **بوابة SignalR WebSockets**: `https://mtiapi.runasp.net/hubs/project`
* **رابط منصة الويب المباشر**: `https://mticompany.runasp.net`
* **المستودع الرسمي على GitHub**: [ahmedmahmoud951/MTICompant](https://github.com/ahmedmahmoud951/MTICompant.git)

### خطوات بناء ونشر تحديثات الويب:
```bash
cd mti-project-management-web

# فحص سلامة الأنواع وعدم وجود أخطاء في الكود
npx tsc --noEmit

# بناء نسخة الإنتاج المحسنة
npm run build
```

---

## 👥 فريق العمل والمساهمة والملكية

* **الجهة المطورة**: شركة **MTI Engineering Solutions**.
* **فريق هندسة وتطوير النظم السحابية**: Software Engineering & Cloud Infrastructure Team.
* **حقوق الملكية الفكرية**: جميع الحقوق محفوظة لشركة MTI Engineering Solutions © 2026.
