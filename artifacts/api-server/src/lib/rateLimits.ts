import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";

function userKeyGenerator(req: Request): string {
  const authed = req as AuthedRequest;
  return authed.user?.userId != null ? `user:${authed.user.userId}` : req.ip ?? "unknown";
}

export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح لإنشاء الحسابات، يرجى المحاولة لاحقاً" },
});

function extractLoginEmail(req: Request): string {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw =
    body["email"] ?? body["username"] ?? body["user"] ?? body["mail"];
  return typeof raw === "string" ? raw.toLowerCase().trim() : "";
}

// Layer 1: global per-IP cap — catches multi-account password spraying.
export const authLoginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => `login-ip:${req.ip ?? "unknown"}`,
  message: { error: "عدد كبير من المحاولات من هذا العنوان، يرجى المحاولة بعد 15 دقيقة" },
});

// Layer 2: per-IP+account cap — catches per-account brute-forcing.
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const email = extractLoginEmail(req);
    const ip = req.ip ?? "unknown";
    return email ? `login-acct:${ip}:${email}` : `login-ip:${ip}`;
  },
  message: { error: "عدد كبير من محاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة" },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: userKeyGenerator,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "تجاوزت حد رفع الملفات المسموح به، حاول بعد قليل" },
});

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: userKeyGenerator,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "تجاوزت حد التحليل المسموح به، حاول بعد ساعة" },
});

export const chatMessageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: userKeyGenerator,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "تجاوزت حد الرسائل المسموح به، حاول بعد قليل" },
});

// Per-user upload concurrency guard.
// The slot is acquired before multer buffers the file so back-pressure is
// applied before any memory allocation, and released exactly once when the
// response closes (whether success, error, or client disconnect).
const uploadConcurrency = new Map<number, number>();
const MAX_CONCURRENT_UPLOADS = 2;

function acquireUploadSlot(userId: number): boolean {
  const current = uploadConcurrency.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_UPLOADS) return false;
  uploadConcurrency.set(userId, current + 1);
  return true;
}

function releaseUploadSlot(userId: number): void {
  const current = uploadConcurrency.get(userId) ?? 1;
  const next = current - 1;
  if (next <= 0) {
    uploadConcurrency.delete(userId);
  } else {
    uploadConcurrency.set(userId, next);
  }
}

/**
 * Express middleware that must be placed BEFORE multer in the upload route.
 * Acquires a per-user concurrency slot so that large file buffers cannot
 * be created concurrently beyond the cap. Releases the slot exactly once
 * on response finish/close.
 */
export function uploadConcurrencyGuard(req: Request, res: Response, next: NextFunction): void {
  const userId = (req as AuthedRequest).user?.userId;
  if (userId == null) {
    // requireAuth already rejected unauthenticated requests; this is a guard.
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  if (!acquireUploadSlot(userId)) {
    res.status(429).json({ error: "لديك طلبات رفع معلّقة كثيرة جداً، يرجى الانتظار" });
    return;
  }

  let released = false;
  const release = (): void => {
    if (!released) {
      released = true;
      releaseUploadSlot(userId);
    }
  };

  res.on("finish", release);
  res.on("close", release);

  next();
}
