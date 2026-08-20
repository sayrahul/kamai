import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'kamai_superadmin_secret_key_2026';
const ADMIN_COOKIE_NAME = 'kamai_admin_token';

export interface AdminSession {
  isAdmin: boolean;
  role: 'superadmin';
  timestamp: number;
}

export function signAdminToken(): string {
  return jwt.sign(
    {
      isAdmin: true,
      role: 'superadmin',
      timestamp: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminSession;
    if (decoded && decoded.isAdmin) {
      return decoded;
    }
  } catch (err) {
    return null;
  }
  return null;
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function verifyAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token) !== null;
}
