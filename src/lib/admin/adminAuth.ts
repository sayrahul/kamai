import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

let hasLoggedAdminJwtDevWarning = false;

export function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY ERROR] ADMIN_JWT_SECRET environment variable is missing in production. Refusing to sign or verify tokens with insecure fallbacks.'
      );
    }
    if (!hasLoggedAdminJwtDevWarning) {
      console.warn(
        '⚠️ [SECURITY WARNING] ADMIN_JWT_SECRET is unset. Using development fallback secret. Set ADMIN_JWT_SECRET in .env.local for production.'
      );
      hasLoggedAdminJwtDevWarning = true;
    }
    return 'kamai_superadmin_dev_secret_key_2026_fallback_not_for_prod';
  }
  return secret;
}

export const ADMIN_COOKIE_NAME = 'kamai_admin_token';

export interface AdminSession {
  isAdmin: boolean;
  role: 'superadmin';
  timestamp: number;
}

export function signAdminToken(): string {
  const secret = getAdminJwtSecret();
  return jwt.sign(
    {
      isAdmin: true,
      role: 'superadmin',
      timestamp: Date.now(),
    },
    secret,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const secret = getAdminJwtSecret();
    const decoded = jwt.verify(token, secret) as AdminSession;
    if (decoded && decoded.isAdmin && decoded.role === 'superadmin') {
      return decoded;
    }
  } catch (err) {
    return null;
  }
  return null;
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export function verifyAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token) !== null;
}
