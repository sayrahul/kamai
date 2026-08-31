import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'kamai_session';

// 24 hours in seconds
export const SESSION_MAX_AGE = 24 * 60 * 60;

export interface SessionPayload {
  staff_id: string;
  business_id: string;
  phone: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
}

let hasLoggedUserJwtDevWarning = false;

export function getUserJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY ERROR] JWT_SECRET environment variable is missing in production. Refusing to sign or verify tokens with insecure fallbacks.'
      );
    }
    if (!hasLoggedUserJwtDevWarning) {
      console.warn(
        '⚠️ [SECURITY WARNING] JWT_SECRET is unset. Using development fallback. Set JWT_SECRET in .env.local for production.'
      );
      hasLoggedUserJwtDevWarning = true;
    }
    return 'kamaiplus_secure_jwt_secret_dev_fallback_32bytes';
  }
  return secret;
}

/**
 * Signs a 24-hour JWT session token containing staff & business identity
 */
export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getUserJwtSecret(), {
    expiresIn: '24h',
  });
}

/**
 * Verifies a JWT session token and returns decoded payload or null if invalid/expired
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getUserJwtSecret()) as SessionPayload;
    if (decoded && decoded.staff_id && decoded.business_id) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
