# دليل دراسة مشروع مُلِم — شرح الكود خطوة بخطوة

> مرجع شامل للمناقشة التقنية — يغطي كل ملف مهم في المشروع مع شرح مفصّل لكل سطر تقريباً.

---

## فهرس المحتويات

1. [البنية العامة للمشروع](#1-البنية-العامة-للمشروع)
2. [قاعدة البيانات — Schema](#2-قاعدة-البيانات--schema)
3. [نقطة دخول الـ Backend — app.ts](#3-نقطة-دخول-الـ-backend--appts)
4. [نظام المصادقة — auth.ts](#4-نظام-المصادقة--authts)
5. [حماية المعدل — rateLimits.ts](#5-حماية-المعدل--ratelimitsts)
6. [استخراج النص من الملفات — pdf.ts](#6-استخراج-النص-من-الملفات--pdfts)
7. [فهرس المواد القانونية — lawIndex.ts](#7-فهرس-المواد-القانونية--lawindexts)
8. [محرك التحليل بالذكاء الاصطناعي — analyze.ts](#8-محرك-التحليل-بالذكاء-الاصطناعي--analyzets)
9. [محرك المحادثة القانونية — chat.ts](#9-محرك-المحادثة-القانونية--chatts)
10. [Routes — المسارات](#10-routes--المسارات)
    - [auth.ts — التسجيل والدخول](#authts--التسجيل-والدخول)
    - [contracts.ts — إدارة العقود](#contractsts--إدارة-العقود)
    - [chat.ts — المحادثة](#chatts--المحادثة)
11. [Frontend — العميل الأمامي](#11-frontend--العميل-الأمامي)
    - [api.ts — عميل HTTP](#apits--عميل-http)
    - [auth-context.tsx — حالة المصادقة](#auth-contexttsx--حالة-المصادقة)
12. [تدفق العمل الكامل](#12-تدفق-العمل-الكامل)
13. [أسئلة متوقعة في المناقشة](#13-أسئلة-متوقعة-في-المناقشة)

---

## 1. البنية العامة للمشروع

```
/
├── artifacts/
│   ├── landing/              ← الواجهة الأمامية (Next.js 15)
│   │   ├── app/              ← صفحات App Router
│   │   │   ├── page.tsx      ← الصفحة الرئيسية (واجهة المحادثة)
│   │   │   ├── login/        ← صفحة تسجيل الدخول / إنشاء حساب
│   │   │   ├── dashboard/    ← لوحة تحكم المستخدم (قائمة العقود)
│   │   │   └── contracts/
│   │   │       ├── new/      ← رفع أو إدخال عقد جديد
│   │   │       └── [id]/     ← عرض تفاصيل عقد محدد
│   │   └── lib/
│   │       ├── api.ts        ← عميل HTTP يتحدث مع الـ API
│   │       └── auth-context.tsx ← إدارة حالة المستخدم في React
│   └── api-server/           ← الخادم الخلفي (Express 5)
│       └── src/
│           ├── app.ts        ← نقطة دخول Express
│           ├── routes/
│           │   ├── auth.ts   ← مسارات التسجيل والدخول
│           │   ├── contracts.ts ← مسارات العقود
│           │   ├── chat.ts   ← مسارات المحادثة
│           │   └── law.ts    ← مسارات البحث في المواد
│           └── lib/
│               ├── auth.ts       ← JWT + bcrypt
│               ├── rateLimits.ts ← حماية من الإساءة
│               ├── pdf.ts        ← استخراج النص من PDF/DOCX
│               ├── lawIndex.ts   ← كاش المواد القانونية
│               ├── analyze.ts    ← التحليل بالذكاء الاصطناعي
│               └── chat.ts       ← المحادثة بالذكاء الاصطناعي
├── lib/
│   ├── db/src/schema/        ← تعريف جداول قاعدة البيانات
│   └── api-spec/             ← مواصفة OpenAPI
└── scripts/                  ← سكريبت تحميل مواد نظام العمل
```

### كيف يتواصل الـ Frontend مع الـ Backend؟

```
المتصفح (Next.js)
    │
    │  طلبات: /api/...  (relative URL)
    ▼
Replit Reverse Proxy (المنفذ 80)
    │
    ├── /        ─→ Next.js  (المنفذ 18150)
    └── /api     ─→ Express  (المنفذ 8080)
```

**السبب في استخدام `/api` كـ base URL:**  
النظام يعمل على نفس الدومين. الـ Frontend يرسل طلبات نسبية مثل `/api/contracts` فيوجّهها الـ Proxy التلقائي إلى خادم Express. هذا يتجنب مشاكل CORS تماماً في الإنتاج.

---

## 2. قاعدة البيانات — Schema

المشروع يستخدم **Drizzle ORM** مع **PostgreSQL**. Drizzle هو ORM يكتب فيه schema بـ TypeScript مباشرة بدل SQL.

### جدول المستخدمين — `users`

```typescript
// lib/db/src/schema/users.ts
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),           // رقم تعريف تلقائي يزيد (1, 2, 3...)
  email: varchar("email", { length: 320 }).notNull().unique(),  // فريد لكل مستخدم
  passwordHash: text("password_hash").notNull(),  // كلمة المرور مشفّرة (bcrypt)
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**ملاحظة مهمة:** كلمة المرور لا تُخزَّن كما هي أبداً — تُخزَّن `passwordHash` (الهاش). حتى لو سُرّبت قاعدة البيانات، لا يستطيع أحد معرفة كلمة المرور الأصلية.

---

### جدول العقود — `contracts`

```typescript
// lib/db/src/schema/contracts.ts
export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
    // ↑ Foreign Key: ربط العقد بالمستخدم. cascade = إذا حُذف المستخدم، تُحذف عقوده تلقائياً
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),      // النص الكامل للعقد (بعد استخراجه من PDF/DOCX)
  fileName: varchar("file_name", { length: 500 }),  // null إذا أُدخل نصاً مباشراً
  fileSize: integer("file_size"),          // الحجم بالبايت، null للنص المباشر
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

### جدول نتائج التحليل — `contract_analyses`

هذا أكثر الجداول تعقيداً وأهمية:

```typescript
// lib/db/src/schema/contractAnalyses.ts

// أنواع البيانات المخزّنة في JSONB:
export type RightItem = {
  title: string;        // "الراتب الشهري"
  description: string;  // شرح الحق
  citations: string[];  // ["نظام العمل-المادة 90"]
};

export type AlertItem = {
  severity: "high" | "medium" | "low";  // مستوى الخطورة
  clause: string;        // نص البند المشكوك فيه
  issue: string;         // وصف المشكلة
  affectedParty: "employee" | "employer" | "both";
  recommendation: string; // التوصية
  citations: string[];
};

export const contractAnalysesTable = pgTable(
  "contract_analyses",
  {
    id: serial("id").primaryKey(),
    contractId: integer("contract_id").references(() => contractsTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // status يمر بـ: pending → running → completed | failed

    summary: text("summary"),                        // ملخص العقد
    contractType: varchar("contract_type"),          // "محدد المدة" / "غير محدد"
    partiesDescription: text("parties_description"), // وصف الطرفين
    employeeRights: jsonb("employee_rights").$type<RightItem[]>(),  // مصفوفة JSON
    employerRights: jsonb("employer_rights").$type<RightItem[]>(),
    alerts: jsonb("alerts").$type<AlertItem[]>(),    // التنبيهات
    citations: jsonb("citations").$type<CitationItem[]>(),  // المواد المستشهد بها
    errorMessage: text("error_message"),             // سبب الفشل إن وُجد
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    // *** الجزء الذكي جداً ***
    // Partial Unique Index: يمنع تشغيل أكثر من تحليل واحد في نفس الوقت لنفس العقد
    // WHERE status = 'running' يعني: الـ index يطبّق فقط على الصفوف التي status = 'running'
    // نتيجة: إذا أرسل المستخدم طلب تحليل مرتين بالتزامن، الطلب الثاني يفشل بـ error 23505
    uniqueIndex("contract_analyses_one_running_idx")
      .on(table.contractId)
      .where(sql`${table.status} = 'running'`),
  ],
);
```

**لماذا JSONB؟** الحقول مثل `employeeRights` و `alerts` هي مصفوفات معقدة من objects. JSONB في PostgreSQL تسمح بتخزين بيانات JSON مع إمكانية الاستعلام فيها.

---

### جدول المحادثات والرسائل — `chat`

```typescript
// lib/db/src/schema/chat.ts
export const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),  // عنوان يُولَّد بالذكاء الاصطناعي
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),  // يُحدَّث مع كل رسالة جديدة
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => chatConversationsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(),  // "user" أو "assistant"
  content: text("content").notNull(),               // نص الرسالة
  citations: jsonb("citations").$type<ChatCitation[] | null>(),  // المواد المستشهد بها
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

### جدول المواد القانونية — `law_articles`

```typescript
// lib/db/src/schema/lawArticles.ts
export const lawArticlesTable = pgTable("law_articles", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 20 }).notNull(),  // "law" أو "regulation"
  // "law" = نظام العمل السعودي (227 مادة)
  // "regulation" = اللائحة التنفيذية (297 مادة)
  bookTitle: varchar("book_title"),     // اسم الكتاب
  chapterTitle: varchar("chapter_title"), // اسم الفصل
  articleNumber: varchar("article_number").notNull(), // رقم المادة
  content: text("content").notNull(),   // نص المادة كاملاً
  summary: text("summary"),            // ملخص ذكاء اصطناعي للمادة
  keywords: text("keywords"),          // كلمات مفتاحية للبحث
  orderIndex: integer("order_index"),  // لترتيب المواد بشكل صحيح
}, (t) => [
  index("law_articles_source_idx").on(t.source),  // index للبحث السريع بالمصدر
  index("law_articles_order_idx").on(t.orderIndex),
]);
```

**المجموع:** 227 + 297 = **524 مادة** مُحمَّلة مسبقاً في قاعدة البيانات.

---

## 3. نقطة دخول الـ Backend — app.ts

```typescript
// artifacts/api-server/src/app.ts
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app = express();

// ✅ مهم جداً: نخبر Express أن خلفه Proxy (Replit's Reverse Proxy)
// بدون هذا، req.ip سيكون IP الـ Proxy نفسه، وليس IP المستخدم الحقيقي
// وهذا يكسر نظام Rate Limiting القائم على IP
app.set("trust proxy", 1);

// قائمة الدومينات المسموح لها بإرسال طلبات (CORS)
const ALLOWED_ORIGINS = [
  "https://v0-molem-psau.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
];

// إعداد CORS — يحدد من يسمح له بالتحدث مع الـ API
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);  // طلبات من Curl/Postman/Server-to-Server
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);  // قائمة بيضاء
    if (/\.replit\.dev$/i.test(origin) || /\.replit\.app$/i.test(origin)) return cb(null, true);  // Replit
    if (/\.vercel\.app$/i.test(origin)) return cb(null, true);  // Vercel
    logger.warn({ origin }, "CORS origin not allowed");
    cb(null, false);  // رفض بدون throw (لتجنب error في طلبات OPTIONS)
  },
  credentials: true,  // السماح بإرسال الـ cookies
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// تفسير JSON مع حد 12MB (لأن العقود قد تكون كبيرة)
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

// كل المسارات تبدأ بـ /api
app.use("/api", router);

// معالج الأخطاء العام — يُمسك أي خطأ لم يُعالج ويرد برسالة عربية
const errorHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Unhandled error");
  if (res.headersSent) return;  // إذا بدأ الرد، لا نستطيع إرسال آخر
  const message = err instanceof Error ? err.message : "خطأ داخلي في الخادم";
  res.status(500).json({ error: message });
};
app.use(errorHandler);

export default app;
```

**ما هو CORS؟** Cross-Origin Resource Sharing — آلية أمان في المتصفحات تمنع موقعاً ما من إرسال طلبات إلى دومين مختلف إلا إذا صرّح الخادم بذلك.

---

## 4. نظام المصادقة — auth.ts

```typescript
// artifacts/api-server/src/lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env["SESSION_SECRET"];  // مخزّن في Replit Secrets
const JWT_EXPIRES_IN = "30d";  // التوكن صالح 30 يوم

// Interface: شكل البيانات المخزّنة داخل التوكن
export interface AuthPayload {
  userId: number;
  email: string;
}

// ────────────────────────────────────────────────
// دالة توليد التوكن
// ────────────────────────────────────────────────
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  // payload = { userId: 5, email: "ahmed@example.com" }
  // النتيجة: سلسلة نصية مشفّرة مثل: "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjV9.abc123"
}

// ────────────────────────────────────────────────
// دالة التحقق من التوكن
// ────────────────────────────────────────────────
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // jwt.verify تتحقق من: (1) التوقيع صحيح، (2) التوكن لم ينتهِ
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;  // توكن منتهٍ أو مزوّر
  }
}

// ────────────────────────────────────────────────
// تشفير كلمة المرور
// ────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
  // 10 = cost factor: كلما زاد، كلما استغرق التشفير وقتاً أطول (أصعب للـ Brute Force)
  // النتيجة: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
}

// ────────────────────────────────────────────────
// التحقق من كلمة المرور
// ────────────────────────────────────────────────
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
  // تقارن النص الأصلي مع الهاش — bcrypt يعلم كيف يعيد الهاش ويقارن بأمان
}

// ────────────────────────────────────────────────
// Middleware: حارس المسارات المحمية
// ────────────────────────────────────────────────
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  // الـ Frontend يرسل: Authorization: Bearer eyJhbGc...
  
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  
  const token = header.slice("Bearer ".length).trim();  // نقطع "Bearer " ونأخذ التوكن
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  
  (req as AuthedRequest).user = payload;  // نضيف معلومات المستخدم للـ request
  next();  // ننتقل للـ route handler التالي
};
```

### كيف تعمل JWT؟

```
تسجيل الدخول:
  المستخدم  →  [email + password]  →  الخادم
  الخادم    →  يتحقق من قاعدة البيانات
  الخادم    →  يولّد JWT توكن
  الخادم    →  [JWT Token]  →  المتصفح (يُحفظ في Cookie)

طلب محمي:
  المتصفح  →  [Authorization: Bearer <token>]  →  الخادم
  الخادم   →  requireAuth يتحقق من التوكن
  الخادم   →  إذا صحيح، يُضاف user للـ request ويكمل
  الخادم   →  [البيانات المطلوبة]  →  المتصفح
```

---

## 5. حماية المعدل — rateLimits.ts

هذا الملف يحمي الـ API من الإساءة والـ Brute Force.

```typescript
// artifacts/api-server/src/lib/rateLimits.ts

// ────────────────────────────────────────────────
// حد التسجيل: 5 حسابات / ساعة / IP
// ────────────────────────────────────────────────
export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // نافذة زمنية: ساعة واحدة
  limit: 5,                   // 5 طلبات كحد أقصى
  message: { error: "تم تجاوز الحد المسموح لإنشاء الحسابات..." },
});

// ────────────────────────────────────────────────
// حد الدخول — طبقتان (defense in depth)
// ────────────────────────────────────────────────

// الطبقة 1: 30 محاولة / 15 دقيقة / IP (تصدّ هجمات Multi-Account Spraying)
export const authLoginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,  // لا يُعد الطلب الناجح ضمن الحد
  keyGenerator: (req) => `login-ip:${req.ip}`,
  message: { error: "عدد كبير من المحاولات من هذا العنوان..." },
});

// الطبقة 2: 8 محاولات / 15 دقيقة / IP + حساب (تصدّ Brute Force لحساب محدد)
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase();
    const ip = req.ip;
    return email ? `login-acct:${ip}:${email}` : `login-ip:${ip}`;
    // المفتاح = IP + Email معاً → كل حساب له حد مستقل لكل IP
  },
  message: { error: "عدد كبير من محاولات تسجيل الدخول..." },
});

// ────────────────────────────────────────────────
// حد رفع الملفات: 10 ملفات / 15 دقيقة / مستخدم
// ────────────────────────────────────────────────
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: userKeyGenerator,  // يستخدم userId (للمسجّلين) أو IP (للضيوف)
});

// ────────────────────────────────────────────────
// حارس التزامن — الأذكى في الملف
// ────────────────────────────────────────────────
const uploadConcurrency = new Map<number, number>();
// Map = قاموس: { userId → عدد الرفعات الجارية }
// مثال: { 5 → 1, 12 → 2 }

const MAX_CONCURRENT_UPLOADS = 2;  // حد أقصى رفعتان متزامنتان لكل مستخدم

function acquireUploadSlot(userId: number): boolean {
  const current = uploadConcurrency.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_UPLOADS) return false;  // رُفض
  uploadConcurrency.set(userId, current + 1);           // احجز slot
  return true;
}

function releaseUploadSlot(userId: number): void {
  const current = uploadConcurrency.get(userId) ?? 1;
  const next = current - 1;
  if (next <= 0) {
    uploadConcurrency.delete(userId);  // حذف المدخل إذا وصل للصفر
  } else {
    uploadConcurrency.set(userId, next);
  }
}

export function uploadConcurrencyGuard(req, res, next) {
  const userId = req.user?.userId;
  
  if (!acquireUploadSlot(userId)) {
    res.status(429).json({ error: "لديك طلبات رفع معلّقة كثيرة جداً..." });
    return;
  }
  
  let released = false;
  const release = () => {
    if (!released) {        // ضمان التحرير مرة واحدة فقط
      released = true;
      releaseUploadSlot(userId);
    }
  };
  
  // تحرير الـ slot عند انتهاء الاستجابة — في كلتا الحالتين (نجاح أو قطع)
  res.on("finish", release);
  res.on("close", release);
  
  next();
}
```

**لماذا طبقتان لتسجيل الدخول؟**
- هجوم **Password Spraying**: مهاجم يجرّب كلمة مرور واحدة على آلاف الحسابات → تصدّها الطبقة 1 (حد IP)
- هجوم **Brute Force**: مهاجم يجرّب آلاف كلمات المرور على حساب واحد → تصدّها الطبقة 2 (حد IP + Email)

---

## 6. استخراج النص من الملفات — pdf.ts

```typescript
// artifacts/api-server/src/lib/pdf.ts
import mammoth from "mammoth";  // لملفات DOCX

// ────────────────────────────────────────────────
// مشكلة خاصة بملفات PDF العربية
// ────────────────────────────────────────────────
// كثير من ملفات PDF العربية تخزّن النصوص بـ"الترتيب البصري"
// أي كل كلمة مقلوبة حرفاً حرفاً:
// "المادة" تُخزَّن كـ "ةداملا"
// "العمل" تُخزَّن كـ "لمعلا"

function looksReversedArabic(text: string): boolean {
  const sample = text.slice(0, 4000);
  
  // نعدّ الكلمات المقلوبة
  const reversedHits =
    (sample.match(/ةداملا/g)?.length ?? 0) +  // "المادة" مقلوبة
    (sample.match(/لمعلا/g)?.length ?? 0) +   // "العمل" مقلوبة
    (sample.match(/ةكلمملا/g)?.length ?? 0);  // "المملكة" مقلوبة
    
  // نعدّ الكلمات الطبيعية
  const normalHits =
    (sample.match(/المادة/g)?.length ?? 0) +
    (sample.match(/العمل/g)?.length ?? 0) +
    (sample.match(/المملكة/g)?.length ?? 0);
    
  return reversedHits > normalHits;  // إذا الكلمات المقلوبة أكثر، النص مقلوب
}

function reverseArabicTokens(text: string): string {
  return text
    .split(/(\s+)/)           // نقسّم على المسافات
    .map((token) => {
      if (/^\s+$/.test(token)) return token;  // المسافات تبقى كما هي
      if (/[\u0600-\u06FF]/.test(token)) {    // إذا الكلمة تحتوي حروف عربية
        return [...token].reverse().join("");  // نقلبها
      }
      return token;  // الأرقام والحروف اللاتينية تبقى كما هي
    })
    .join("");
}

// ────────────────────────────────────────────────
// استخراج النص من PDF
// ────────────────────────────────────────────────
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = loadPdfParse();
  const result = await pdfParse(buffer);  // buffer = محتوى الملف في الذاكرة
  let text = result.text;
  
  if (looksReversedArabic(text)) {
    text = reverseArabicTokens(text);  // نصحّح الترتيب
  }
  
  return text;
}

// ────────────────────────────────────────────────
// استخراج النص من DOCX
// ────────────────────────────────────────────────
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;  // mammoth يتعامل مع العربية بشكل صحيح تلقائياً
}

// ────────────────────────────────────────────────
// الدالة الرئيسية — تختار الأسلوب حسب نوع الملف
// ────────────────────────────────────────────────
export async function extractTextFromFile(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<string> {
  const lowerName = filename.toLowerCase();
  
  if (mimetype === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (mimetype.includes("word") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    return extractTextFromDocx(buffer);
  }
  if (mimetype.startsWith("text/")) {
    return buffer.toString("utf-8");  // ملفات TXT = نقرأ مباشرة
  }
  
  throw new Error(`Unsupported file type: ${mimetype}`);
}
```

**لماذا `buffer` وليس مسار ملف؟**  
Multer (مكتبة رفع الملفات) يستخدم `memoryStorage` — أي يحفظ الملف في ذاكرة الخادم (RAM) مباشرة بدل القرص الصلب. هذا أسرع وأكثر أماناً لأن الملفات المؤقتة لا تُترك على القرص.

---

## 7. فهرس المواد القانونية — lawIndex.ts

```typescript
// artifacts/api-server/src/lib/lawIndex.ts

// ────────────────────────────────────────────────
// Caching في الذاكرة
// ────────────────────────────────────────────────
let cachedIndex: { id: number; source: string; articleNumber: string; summary: string }[] | null = null;

export async function getArticleIndex() {
  if (cachedIndex) return cachedIndex;  // إذا محمّل مسبقاً، نرجعه فوراً
  
  // أول مرة: نحمّل من قاعدة البيانات
  const rows = await db.select({
    id: lawArticlesTable.id,
    source: lawArticlesTable.source,
    articleNumber: lawArticlesTable.articleNumber,
    summary: lawArticlesTable.summary,
    content: lawArticlesTable.content,
    chapterTitle: lawArticlesTable.chapterTitle,
  }).from(lawArticlesTable).orderBy(asc(lawArticlesTable.orderIndex));
  
  cachedIndex = rows.map((r) => ({
    id: r.id,
    source: r.source,
    articleNumber: r.articleNumber,
    // نستخدم summary إذا وُجد، وإلا نأخذ أول 220 حرف من المحتوى
    summary: (r.summary?.length > 0 ? r.summary : r.content.slice(0, 220))
             + (r.chapterTitle ? ` [${r.chapterTitle}]` : ""),
  }));
  
  return cachedIndex;
}
```

**لماذا الـ Caching مهم هنا؟**  
الفهرس = 524 مادة × (id + source + articleNumber + summary). يُستدعى مع كل تحليل ومع كل سؤال في المحادثة. بدون Caching، سنضرب قاعدة البيانات بمئات الطلبات في الثانية. مع الـ Cache، نقرأ مرة واحدة عند أول طلب وبعدها نخدم من الذاكرة.

```typescript
// جلب المواد الكاملة بأرقام معرّفاتها
export async function getArticlesByIds(ids: number[]): Promise<LawArticle[]> {
  if (ids.length === 0) return [];
  return db.select().from(lawArticlesTable).where(inArray(lawArticlesTable.id, ids));
}

// البحث النصي في المواد (fallback)
export async function searchArticles(query: string, source: string, limit: number) {
  // ILIKE = LIKE لكن Case-Insensitive
  // يبحث في المحتوى والملخص ورقم المادة
  const q = `%${query.trim()}%`;
  conditions.push(
    sql`(${lawArticlesTable.content} ILIKE ${q} 
         OR ${lawArticlesTable.summary} ILIKE ${q} 
         OR ${lawArticlesTable.articleNumber} ILIKE ${q})`
  );
}
```

---

## 8. محرك التحليل بالذكاء الاصطناعي — analyze.ts

هذا أهم ملف في المشروع — يُطبّق نمط **Two-Pass RAG** (Retrieval-Augmented Generation):

```
Pass 1: إرسال فهرس المواد + العقد → Gemini يختار أرقام المواد الأكثر صلة
Pass 2: جلب نص المواد المختارة كاملاً + العقد → Gemini يحلّل ويُرجع JSON منظّم
```

```typescript
// artifacts/api-server/src/lib/analyze.ts
const MODEL = "gemini-2.5-flash";

// ────────────────────────────────────────────────
// دالة مساعدة: استدعاء Gemini وتحليل الـ JSON
// ────────────────────────────────────────────────
async function generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",  // يُجبر Gemini على رد JSON فقط
      temperature: 0.2,  // قريب من الصفر = إجابات أكثر حتمية وأقل إبداعاً (مناسب للقانون)
    },
  });
  
  const text = response.text ?? "";
  // safeJsonParse تُزيل ```json ``` إذا أرسلها Gemini بالخطأ
  return safeJsonParse<T>(text);
}

// ────────────────────────────────────────────────
// Pass 1: اختيار المواد القانونية ذات الصلة
// ────────────────────────────────────────────────
async function pickRelevantArticles(contractText: string): Promise<number[]> {
  const index = await getArticleIndex();  // الفهرس من الـ Cache
  
  // نبني فهرساً نصياً: كل سطر = مادة واحدة مع ملخصها
  // مثال: "#45 [law/مادة 75] يجب صرف الأجر في نهاية الشهر [أحكام الأجور]"
  const indexLines = index.map(a =>
    `#${a.id} [${a.source}/مادة ${a.articleNumber}] ${a.summary}`
  ).join("\n");

  const userPrompt = `
فهرس المواد:
${indexLines}

نص العقد:
"""
${contractText.slice(0, 12000)}  ← نأخذ أول 12000 حرف فقط
"""

اختر بين 12 و25 مادة الأكثر صلة. أعد JSON فقط:
{ "articleIds": [45, 78, 123, ...] }
  `;
  
  const result = await generateJson<{ articleIds: number[] }>(systemPrompt, userPrompt);
  
  // تحقق: نتأكد أن الأرقام المُعادة موجودة فعلاً في الفهرس
  const validIds = new Set(index.map(a => a.id));
  return result.articleIds.filter(id => validIds.has(id)).slice(0, 30);
}

// ────────────────────────────────────────────────
// Pass 2: التحليل الكامل
// ────────────────────────────────────────────────
async function performAnalysis(contractText: string, articleIds: number[]): Promise<AnalysisResult> {
  const articles = await getArticlesByIds(articleIds);  // نجلب النصوص الكاملة
  
  // نبني نص المواد بشكل منظّم مع مرجعها
  const articlesText = articles.map(a =>
    `[المرجع: ${a.source}-${a.articleNumber} | المعرّف: ${a.id}]
المصدر: ${a.source === "law" ? "نظام العمل" : "اللائحة التنفيذية"}
نص المادة: ${a.content}`
  ).join("\n\n---\n\n");

  const systemPrompt = `أنت "مُلِم"، مدقق عقود العمل السعودية...
  [يُعطى الذكاء الاصطناعي هوية وشخصية ومبادئ للعمل بها]`;

  const userPrompt = `
نص العقد:
"""${contractText}"""

المواد القانونية المرجعية:
${articlesText}

أعد JSON بهذا الشكل:
{
  "summary": "...",
  "contractType": "...",
  "partiesDescription": "...",
  "employeeRights": [{ "title": "...", "description": "...", "citations": ["..."] }],
  "employerRights": [...],
  "alerts": [{ "severity": "high|medium|low", "clause": "...", "issue": "...", ... }],
  "citations": [{ "ref": "...", "source": "law|regulation", "articleNumber": "...", ... }]
}
  `;
  
  return generateJson<AnalysisResult>(systemPrompt, userPrompt);
}

// ────────────────────────────────────────────────
// الدالة الرئيسية المُصدَّرة
// ────────────────────────────────────────────────
export async function analyzeContract(contractText: string): Promise<AnalysisResult> {
  if (contractText.trim().length < 20) throw new Error("نص العقد قصير جداً");
  
  const articleIds = await pickRelevantArticles(contractText);  // Pass 1
  return performAnalysis(contractText, articleIds);              // Pass 2
}
```

**لماذا Two-Pass وليس pass واحد؟**  
مشكلة الـ Context Window: نص 524 مادة كاملة = ~500,000 حرف. هذا يتجاوز حد Gemini. الحل:
- Pass 1: نرسل **الملخصات فقط** (أقل من 100 حرف لكل مادة) → ~52,000 حرف
- Pass 2: نرسل **15-25 مادة كاملة فقط** التي اختارها الذكاء → ~30,000 حرف
- إجمالي: ~82,000 حرف بدل ~500,000 — توفير 84%

---

## 9. محرك المحادثة القانونية — chat.ts

نفس نمط Two-Pass لكن مُكيَّف للمحادثة:

```typescript
// artifacts/api-server/src/lib/chat.ts

// ────────────────────────────────────────────────
// تنسيق سجل المحادثة
// ────────────────────────────────────────────────
function formatHistory(history: ChatHistoryItem[]): string {
  if (history.length === 0) return "";
  const last = history.slice(-6);  // آخر 6 رسائل فقط (3 أسئلة + 3 إجابات)
  return last.map(m =>
    m.role === "user" ? `المستخدم: ${m.content}` : `المساعد: ${m.content}`
  ).join("\n\n");
}

// ────────────────────────────────────────────────
// Pass 1: اختيار المواد ذات الصلة بالسؤال
// ────────────────────────────────────────────────
async function pickArticlesForQuestion(question: string, history: ChatHistoryItem[]): Promise<number[]> {
  const index = await getArticleIndex();
  const historyBlock = formatHistory(history);
  
  // نرسل: الفهرس + تاريخ المحادثة + السؤال الحالي
  // هذا يسمح للذكاء الاصطناعي باختيار مواد بناءً على سياق المحادثة كاملها
  
  // ميزة: Fallback ثلاثي الطبقات
  try {
    const result = await generateJson<{ articleIds: number[] }>(...);
    if (filtered.length > 0) return filtered;  // نجح
  } catch {
    // فشل Gemini → نفتش نصياً
  }
  
  const fallback = await searchArticles(question.slice(0, 200), undefined, 10);
  if (fallback.length > 0) return fallback.map(a => a.id);  // بحث نصي
  
  return index.slice(0, 10).map(a => a.id);  // آخر ملاذ: أول 10 مواد
}

// ────────────────────────────────────────────────
// ميزات خاصة في نظام المحادثة
// ────────────────────────────────────────────────

// 1. سؤال توضيحي:
//    إذا السؤال يحتمل إجابات مختلفة حسب معلومة ناقصة
//    (مثل: موظف أم صاحب عمل؟ محدد أم غير محدد؟ مدة خدمته؟)
//    يُجيب الذكاء الاصطناعي بـ: "❓ قبل أن أجيبك، أحتاج توضيحاً: ..."

// 2. تنبيه الإجحاف:
//    إذا المستخدم يصف بنداً مخالفاً أو مجحفاً
//    يبدأ الرد بـ: "⚠️ تنبيه: [وصف المشكلة]"

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  // يُولَّد عنوان تلقائي للمحادثة من أول رسالة
  // مثال: "ما حقوقي إذا..." → "حقوق الموظف عند الفصل"
  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: "أعد عنواناً قصيراً جداً (بحد أقصى 6 كلمات)...",
      temperature: 0.4,  // أعلى قليلاً للعناوين (أكثر تنوعاً)
    },
  });
  return response.text?.trim() || "محادثة جديدة";
}
```

---

## 10. Routes — المسارات

### auth.ts — التسجيل والدخول

```typescript
// artifacts/api-server/src/routes/auth.ts

// POST /api/auth/register
router.post("/register", authRegisterLimiter, async (req, res) => {
  // تطبيع البيانات — يقبل حقول بأسماء مختلفة من مختلف الـ Frontends
  const normalizedBody = {
    email: body.email ?? body.username ?? body.user ?? body.mail,
    password: body.password ?? body.pass ?? body.pwd,
    name: body.name ?? body.fullName ?? body.full_name,
  };
  
  // التحقق بـ Zod Schema
  const parsed = RegisterUserBody.safeParse(normalizedBody);
  if (!parsed.success) {
    res.status(400).json({ error: `الحقل "${field}" ${reason}` });
    return;
  }
  
  // تحقق من تكرار البريد الإلكتروني
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }
  
  // تشفير كلمة المرور + إدراج في قاعدة البيانات
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();
  
  // توليد التوكن وإرجاعه مع بيانات المستخدم
  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post("/login", authLoginIpLimiter, authLoginLimiter, async (req, res) => {
  // جلب المستخدم بالبريد الإلكتروني
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  
  // ملاحظة أمنية: نفس الرسالة لـ "مستخدم غير موجود" و"كلمة مرور خاطئة"
  // هذا يمنع المهاجم من معرفة أي بريد إلكتروني مسجّل وأيها ليس كذلك (User Enumeration)
  if (!user) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });  // نفس الرسالة
    return;
  }
  
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id, email, name, createdAt } });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  // requireAuth ضمن فحص التوكن وأضاف req.user
  const { userId } = req.user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json(user);
});
```

---

### contracts.ts — إدارة العقود

```typescript
// artifacts/api-server/src/routes/contracts.ts

// كل المسارات في هذا الملف تتطلب مصادقة
router.use(requireAuth);

// إعداد Multer — رفع ملف واحد في الذاكرة (buffer)
const upload = multer({
  storage: multer.memoryStorage(),  // في RAM لا في القرص
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
});

// GET /api/contracts — قائمة عقود المستخدم
router.get("/", async (req, res) => {
  const { userId } = req.user;
  const rows = await db.select({...}).from(contractsTable)
    .where(eq(contractsTable.userId, userId))  // ← فلتر بالمستخدم (حماية ضرورية!)
    .orderBy(desc(contractsTable.createdAt));
  
  // نضيف حالة التحليل لكل عقد
  const results = await Promise.all(rows.map(async (c) => {
    const [latest] = await db.select({ status: contractAnalysesTable.status })
      .from(contractAnalysesTable)
      .where(eq(contractAnalysesTable.contractId, c.id))
      .limit(1);
    return { ...c, analysisStatus: latest?.status ?? null };
  }));
  
  res.json(results);
});

// POST /api/contracts/upload — رفع ملف
router.post("/upload",
  uploadLimiter,           // ← حد المعدل
  uploadConcurrencyGuard,  // ← حارس التزامن
  upload.single("file"),   // ← Multer يقرأ الملف
  async (req, res) => {
    const file = req.file;  // { buffer, mimetype, originalname, size }
    
    // استخراج النص
    let text;
    try {
      text = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
    } catch (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // تحقق: النص يجب أن يكون 20 حرفاً على الأقل (يتأكد أن PDF ليس صورة فقط)
    if (!text || text.trim().length < 20) {
      res.status(400).json({ error: "تعذّر استخراج نص... PDF مصوَّر؟" });
      return;
    }
    
    const [created] = await db.insert(contractsTable).values({
      userId, title, content: text, fileName: file.originalname, fileSize: file.size,
    }).returning();
    
    res.status(201).json(created);
  }
);

// POST /api/contracts/:id/analyze — تشغيل التحليل
router.post("/:id/analyze", analyzeLimiter, async (req, res) => {
  // ← التحقق من الملكية: هل هذا العقد يخص هذا المستخدم؟
  const [contract] = await db.select().from(contractsTable)
    .where(and(
      eq(contractsTable.id, params.data.id),
      eq(contractsTable.userId, userId)  // ← فلتر بالمستخدم (ownership check)
    )).limit(1);
  
  if (!contract) {
    res.status(404).json({ error: "العقد غير موجود" });
    return;
  }
  
  // إدراج صف بـ status='running' — الـ Partial Unique Index يضمن أنه لا يوجد صف آخر بنفس الوضع
  let pending;
  try {
    [pending] = await db.insert(contractAnalysesTable)
      .values({ contractId: contract.id, status: "running" })
      .returning();
  } catch (err) {
    if (err.code === "23505") {  // unique constraint violation
      res.status(409).json({ error: "التحليل قيد التنفيذ بالفعل" });
      return;
    }
    throw err;
  }
  
  // تشغيل التحليل وتحديث قاعدة البيانات
  try {
    const result = await analyzeContract(contract.content);
    const [updated] = await db.update(contractAnalysesTable)
      .set({ status: "completed", ...result, completedAt: new Date() })
      .where(eq(contractAnalysesTable.id, pending.id))
      .returning();
    res.json(updated);
  } catch (err) {
    if (isAiRateLimited(err)) {
      // خطأ من Gemini API — rate limit exceeded
      await db.update(contractAnalysesTable)
        .set({ status: "failed", errorMessage: "تجاوز حد الذكاء الاصطناعي" })
        .where(eq(contractAnalysesTable.id, pending.id));
      res.status(429).json({ error: "النظام مشغول..." });
      return;
    }
    // خطأ آخر
    await db.update(contractAnalysesTable)
      .set({ status: "failed", errorMessage: err.message })
      .where(eq(contractAnalysesTable.id, pending.id));
    res.status(500).json({ error: "فشل التحليل" });
  }
});
```

**لماذا Partial Unique Index وليس فقط CHECK في الكود؟**  
الكود غير كافٍ لأن طلبين متزامنين قد يمرّان بالفحص في نفس اللحظة (Race Condition). الـ Index في قاعدة البيانات يُطبَّق بشكل **ذري (atomic)** — لا يمكن لطلبين إدراج صف `status='running'` لنفس العقد في نفس الوقت.

---

### chat.ts — المحادثة

```typescript
// artifacts/api-server/src/routes/chat.ts
const HISTORY_FETCH_LIMIT = 20;  // نحمّل آخر 20 رسالة من قاعدة البيانات

// POST /api/chat/messages — إرسال رسالة
router.post("/messages", chatMessageLimiter, async (req, res) => {
  const { userId } = req.user;
  const { message, conversationId } = req.body;
  
  // إنشاء محادثة جديدة أو استئناف موجودة
  let conversation;
  if (conversationId) {
    // استئناف محادثة — نتحقق من الملكية
    [conversation] = await db.select().from(chatConversationsTable)
      .where(and(
        eq(chatConversationsTable.id, conversationId),
        eq(chatConversationsTable.userId, userId)  // ← ownership check
      )).limit(1);
  } else {
    // محادثة جديدة — نولّد عنواناً تلقائياً بالذكاء الاصطناعي
    const title = await generateConversationTitle(message);
    [conversation] = await db.insert(chatConversationsTable)
      .values({ userId, title }).returning();
  }
  
  // جلب سجل المحادثة (مع عكس الترتيب)
  const priorMessages = await db.select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conversation.id))
    .orderBy(desc(chatMessagesTable.createdAt))  // من الأحدث للأقدم
    .limit(HISTORY_FETCH_LIMIT)
    .then(rows => rows.reverse());  // نعكس للترتيب الصحيح (الأقدم للأحدث)
  
  // حفظ رسالة المستخدم
  const [userMsg] = await db.insert(chatMessagesTable)
    .values({ conversationId: conversation.id, role: "user", content: message })
    .returning();
  
  // استدعاء الذكاء الاصطناعي
  const result = await answerLegalQuestion(message, history);
  
  // حفظ رد الذكاء الاصطناعي مع المواد المستشهد بها
  const [assistantMsg] = await db.insert(chatMessagesTable)
    .values({
      conversationId: conversation.id,
      role: "assistant",
      content: result.answer,
      citations: result.citations,  // JSONB
    }).returning();
  
  // تحديث وقت آخر رسالة في المحادثة
  await db.update(chatConversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversationsTable.id, conversation.id));
  
  res.json({ conversation, userMessage: userMsg, assistantMessage: assistantMsg });
});
```

---

## 11. Frontend — العميل الأمامي

### api.ts — عميل HTTP

```typescript
// artifacts/landing/lib/api.ts
const BASE_URL = "/api"  // ← نسبي، يعمل في كل البيئات

// ────────────────────────────────────────────────
// إدارة التوكن في الـ Cookie
// ────────────────────────────────────────────────
export function setToken(token: string): void {
  if (typeof document === "undefined") return  // حماية: لا تعمل في Server-Side Rendering
  
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);  // 30 يوم
  
  // SameSite=Lax: يرسل الـ Cookie مع التنقل الطبيعي لكن لا مع طلبات Cross-Site
  // هذا يحمي من CSRF attacks
  document.cookie = `molem_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|; )molem_token=([^;]*)/)
  return match ? match[1] : null
}

export function removeToken(): void {
  // نحذف الـ Cookie بجعل تاريخ انتهائه في الماضي
  document.cookie = "molem_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
}

// ────────────────────────────────────────────────
// دالة HTTP المركزية
// ────────────────────────────────────────────────
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...options.headers };
  
  // نضيف Content-Type تلقائياً إلا إذا كان FormData (لأن FormData يحدد contentType بنفسه)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // نضيف Authorization إذا المستخدم مسجّل دخول
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    // نحاول قراءة رسالة الخطأ من الخادم
    const error = await response.json().catch(() => ({ error: "حدث خطأ غير متوقع" }));
    throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// ────────────────────────────────────────────────
// واجهات برمجية منظّمة
// ────────────────────────────────────────────────
export const authApi = {
  register: (email, password, name) =>
    apiCall("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email, password) =>
    apiCall("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiCall("/auth/me"),
};

export const contractsApi = {
  getAll: () => apiCall<Contract[]>("/contracts"),
  getById: (id) => apiCall<ContractWithAnalysis>(`/contracts/${id}`),
  create: (title, content) =>
    apiCall("/contracts", { method: "POST", body: JSON.stringify({ title, content }) }),
  upload: (title, file) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    return apiCall("/contracts/upload", { method: "POST", body: formData });
    // ملاحظة: نمرر FormData لـ body → apiCall لن يضيف Content-Type تلقائياً
    // المتصفح يضيفه تلقائياً مع الـ boundary الصحيح لـ multipart/form-data
  },
  analyze: (id) => apiCall(`/contracts/${id}/analyze`, { method: "POST" }),
  delete: (id) => apiCall(`/contracts/${id}`, { method: "DELETE" }),
};
```

---

### auth-context.tsx — حالة المصادقة

```typescript
// artifacts/landing/lib/auth-context.tsx
"use client"  // ← ضروري لأن Context لا يعمل في Server Components

// ────────────────────────────────────────────────
// تعريف شكل الـ Context
// ────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  isLoading: boolean;     // هل لا يزال يتحقق من التوكن؟
  isAuthenticated: boolean;  // اختصار لـ user !== null
  login: (email, password) => Promise<void>;
  register: (email, password, name) => Promise<void>;
  logout: () => void;
}

// ────────────────────────────────────────────────
// AuthProvider — يُغلّف التطبيق كله
// ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);  // نبدأ بـ true حتى نتحقق

  useEffect(() => {
    // عند بدء التطبيق: نتحقق إذا المستخدم كان مسجّلاً دخوله سابقاً
    const token = getToken();
    if (token) {
      authApi.me()           // نسأل الـ API: هل هذا التوكن صالح؟
        .then(user => setUser(user))      // نجح → نحفظ بيانات المستخدم
        .catch(() => removeToken())       // فشل (انتهى التوكن) → نحذف الـ Cookie
        .finally(() => setIsLoading(false));  // انتهى التحقق في كل الأحوال
    } else {
      setIsLoading(false);  // لا يوجد توكن أصلاً
    }
  }, []);  // ← يعمل مرة واحدة عند تحميل الصفحة

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    setToken(response.token);   // نحفظ التوكن في الـ Cookie
    setUser(response.user);     // نحدّث حالة React
  };

  const logout = () => {
    removeToken();  // نحذف الـ Cookie
    setUser(null);  // نمسح حالة React
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}  {/* كل الصفحات تستطيع الوصول للـ context */}
    </AuthContext.Provider>
  );
}

// ────────────────────────────────────────────────
// Hook لاستخدام الـ Context
// ────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// الاستخدام في أي صفحة:
// const { user, isAuthenticated, isLoading, login, logout } = useAuth();
```

---

## 12. تدفق العمل الكامل

### تدفق تسجيل الدخول

```
1. المستخدم يُدخل Email + Password في صفحة /login
2. authApi.login() يرسل POST /api/auth/login
3. authLoginIpLimiter + authLoginLimiter يتحققان من الحد
4. auth.ts route: يجلب المستخدم من DB بالـ email
5. verifyPassword() يقارن كلمة المرور بالهاش
6. signToken() يولّد JWT توكن { userId, email }
7. الرد: { token: "eyJ...", user: {...} }
8. الـ Frontend: setToken() يحفظ التوكن في Cookie
9. setUser() يحدّث حالة React
10. router.push("/dashboard") → انتقال للوحة التحكم
```

### تدفق رفع وتحليل عقد

```
1. المستخدم يختار ملف في /contracts/new
2. contractsApi.upload() يرسل POST /api/contracts/upload (multipart/form-data)
3. uploadLimiter يتحقق من الحد
4. uploadConcurrencyGuard يحجز slot في الـ Map
5. Multer يقرأ الملف في الـ RAM (buffer)
6. extractTextFromFile() يستخرج النص:
   - PDF → pdf-parse → يتحقق من الـ Arabic reversal → يصحّح إذا لزم
   - DOCX → mammoth
   - TXT → buffer.toString("utf-8")
7. نتحقق: النص أكثر من 20 حرف؟
8. نُدرج في جدول contracts (title, content, fileName, fileSize)
9. الرد: بيانات العقد المُنشأ
10. router.push("/contracts/1") → صفحة تفاصيل العقد

--- المستخدم يضغط "تحليل" ---

11. contractsApi.analyze() يرسل POST /api/contracts/1/analyze
12. analyzeLimiter يتحقق من الحد (10 تحليلات/ساعة)
13. نتحقق من الملكية: هل العقد 1 يخص هذا المستخدم؟
14. نُدرج صف { status: "running" } في contract_analyses
    → Partial Unique Index يمنع طلبين متزامنين
15. analyzeContract(contract.content) يبدأ:
    
    Pass 1 — pickRelevantArticles():
    a. getArticleIndex() → 524 سطر من الـ Cache
    b. Gemini: "اختر المواد المتعلقة بهذا العقد"
    c. Gemini يُعيد: { articleIds: [45, 78, 90, 103, ...] }
    
    Pass 2 — performAnalysis():
    d. getArticlesByIds([45,78,90,...]) → نص المواد الكاملة
    e. Gemini: "حلّل العقد وأعد JSON منظّم"
    f. Gemini يُعيد JSON كامل مع: summary, rights, alerts, citations
    
16. تحديث contract_analyses: status="completed" + النتائج
17. الرد: نتيجة التحليل كاملة
18. الـ Frontend يعرض التبويبات: ملخص / حقوق الموظف / حقوق صاحب العمل / تنبيهات / مواد
```

### تدفق المحادثة القانونية

```
1. المستخدم يكتب سؤاله في واجهة المحادثة
2. chatApi.sendMessage() يرسل POST /api/chat/messages
3. chatMessageLimiter يتحقق (30 رسالة/10 دقائق)
4. إذا بلا conversationId → generateConversationTitle() → محادثة جديدة
5. جلب آخر 20 رسالة من الـ DB (السياق)
6. حفظ رسالة المستخدم في DB
7. answerLegalQuestion(message, history):
    
    Pass 1 — pickArticlesForQuestion():
    a. الفهرس + تاريخ المحادثة + السؤال → Gemini
    b. Gemini يختار 5-15 مادة ذات صلة
    c. Fallback: بحث نصي → أول 10 مواد
    
    Pass 2 — performAnswer():
    d. نص المواد + تاريخ المحادثة + السؤال → Gemini
    e. Gemini يُعيد: { answer: "...", citations: [...] }
    f. إذا سؤال غامض → يبدأ بـ "❓ قبل أن أجيبك..."
    g. إذا مخالفة → يبدأ بـ "⚠️ تنبيه: ..."
    
8. حفظ رد الذكاء الاصطناعي + المواد في DB
9. تحديث updatedAt للمحادثة
10. الرد: { conversation, userMessage, assistantMessage }
```

---

## 13. أسئلة متوقعة في المناقشة

**س: لماذا استخدمتم JWT وليس Sessions؟**  
الـ Sessions تتطلب تخزيناً على الخادم (Redis أو DB) مما يعقّد Scaling. JWT يحتوي البيانات في نفسه ولا يحتاج DB للتحقق. في مشروعنا، التوكن يُخزَّن في Cookie بدل localStorage لأنه أكثر أماناً من XSS.

**س: ما هو الـ RAG وكيف طبّقتموه؟**  
RAG = Retrieval-Augmented Generation. بدل أن نُدرّب نموذجاً جديداً على نظام العمل، نُحضر المواد ذات الصلة ونُرفقها مع السؤال. Two-Pass: الـ Pass الأول يختار المواد (بالفهرس المختصر)، الـ Pass الثاني يحلّل (بالنص الكامل للمواد المختارة).

**س: ما هو Race Condition وكيف حللتموه في التحليل؟**  
إذا المستخدم ضغط زر التحليل مرتين بسرعة، قد يبدأ تحليلان في نفس الوقت على نفس العقد. الحل: Partial Unique Index في PostgreSQL على `(contractId) WHERE status='running'`. قاعدة البيانات تمنع إدراج صفين بهذا الوضع لنفس العقد — atomic وبدون Race Condition.

**س: لماذا `memoryStorage` في Multer بدل `diskStorage`؟**  
الـ `diskStorage` يحفظ الملف في القرص مؤقتاً ثم يحتاج حذفاً. الـ `memoryStorage` يحفظ في الـ RAM مباشرة كـ Buffer — أسرع وأنظف، ولا يترك ملفات مؤقتة. المقايضة: يصلح فقط للملفات الصغيرة (≤10MB).

**س: ما هو CORS وكيف تعاملتم معه؟**  
CORS هي آلية أمان في المتصفح تمنع موقعاً من إرسال طلبات لدومين آخر. حللناها بطريقتين: (1) الـ Reverse Proxy يجعل Frontend وBackend على نفس الدومين فلا CORS أصلاً. (2) إضافة CORS middleware في Express يسمح لدومينات Vercel وReplit للتطوير.

**س: لماذا `temperature: 0.2` في التحليل و `0.4` في العناوين؟**  
التحليل القانوني يجب أن يكون محدداً ومتسقاً (temperature منخفضة = أقل إبداعاً). عناوين المحادثات تحتاج تنوعاً (temperature أعلى = أكثر إبداعاً).

**س: كيف تحمون من User Enumeration في تسجيل الدخول؟**  
رسالة الخطأ واحدة سواء كان البريد غير موجود أو كلمة المرور خاطئة: "بيانات الدخول غير صحيحة". هذا يمنع المهاجم من معرفة أي بريد إلكتروني مسجّل.

**س: ما هو onDelete: "cascade" في قاعدة البيانات؟**  
عندما تُحذف سجل مرتبط به سجلات أخرى عبر Foreign Key، cascade يحذف تلك السجلات تلقائياً. مثال: حذف مستخدم → تُحذف عقوده → تُحذف تحليلاته → تُحذف محادثاته — كل ذلك تلقائياً.

**س: ما هي JSONB وكيف استخدمتموها؟**  
JSONB = JSON Binary في PostgreSQL. تخزّن بيانات JSON مع إمكانية الاستعلام فيها. استخدمناها لـ `employeeRights`, `alerts`, `citations` لأنها مصفوفات من objects معقدة لا يمكن وضعها في أعمدة عادية.

---

<div align="center">
  <b>مُلِم — مشروع Software Engineering Fundamentals</b><br>
  كلية علوم الحاسب والهندسة — بإشراف د. عبدالله البنيان
</div>
