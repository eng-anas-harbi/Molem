import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction, RequestHandler } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"];

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const JWT_SECRET: string = SESSION_SECRET;
const JWT_EXPIRES_IN = "30d";

export interface AuthPayload {
  userId: number;
  email: string;
}

export interface AuthedRequest extends Request {
  user: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & AuthPayload;
    if (typeof decoded === "object" && decoded.userId && decoded.email) {
      return { userId: decoded.userId, email: decoded.email };
    }
    return null;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  (req as AuthedRequest).user = payload;
  next();
};
