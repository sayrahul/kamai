import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'kamai_session';

// 30 days in seconds
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export interface SessionPayload {
  staff_id: string;
  business_id: string;
  phone: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
}

function getUserJwtSecret(): string {
  return process.env.JWT_SECRET || 'kamaiplus_secure_jwt_secret_dev_fallback_32bytes';
}

/**
 * Signs a 30-day JWT session token containing staff & business identity
 */
export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getUserJwtSecret(), {
    expiresIn: '30d',
  });
}

/**
 * Verifies a JWT session token and returns decoded payload or null if invalid/expired
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getUserJwtSecret()) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}
