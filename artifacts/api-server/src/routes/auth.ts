import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  type AuthedRequest,
} from "../lib/auth";
import { authRegisterLimiter, authLoginLimiter } from "../lib/rateLimits";

const router: IRouter = Router();

router.post("/register", authRegisterLimiter, async (req: Request, res: Response) => {
  // Accept common alternative field names from various frontends
  const body = (req.body ?? {}) as Record<string, unknown>;
  const normalizedBody = {
    email: body.email ?? body.username ?? body.user ?? body.mail,
    password: body.password ?? body.pass ?? body.pwd,
    name: body.name ?? body.fullName ?? body.full_name ?? body.username ?? body.displayName,
  };
  const parsed = RegisterUserBody.safeParse(normalizedBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "غير معروف";
    const reason = issue?.message || "غير صالح";
    req.log.warn({ field, reason, receivedKeys: Object.keys(body) }, "Register validation failed");
    res.status(400).json({
      error: `الحقل "${field}" ${reason}`,
      field,
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }
  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ email: normalizedEmail, passwordHash, name: name.trim() })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
    });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user });
});

router.post("/login", authLoginLimiter, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const normalizedBody = {
    email: body.email ?? body.username ?? body.user ?? body.mail,
    password: body.password ?? body.pass ?? body.pwd,
  };
  const parsed = LoginUserBody.safeParse(normalizedBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "غير معروف";
    const reason = issue?.message || "غير صالح";
    req.log.warn({ field, reason, receivedKeys: Object.keys(body) }, "Login validation failed");
    res.status(400).json({
      error: `الحقل "${field}" ${reason}`,
      field,
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as AuthedRequest).user;
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json(user);
});

export default router;
