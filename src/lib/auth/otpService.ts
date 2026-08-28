import crypto from 'crypto';
import { getUserJwtSecret } from '@/lib/auth/session';

export interface OtpSessionData {
  phone: string;
  codeHash: string;
  expiresAt: number;
  requestedAt: number;
  attempts: number;
}

// In-memory fallback cache for local dev / single instance
declare global {
  var __kamai_otp_cache: Map<string, { code: string; expiresAt: number; requestedAt: number; attempts: number }> | undefined;
}

if (!globalThis.__kamai_otp_cache) {
  globalThis.__kamai_otp_cache = new Map();
}

const localCache = globalThis.__kamai_otp_cache;

/**
 * Computes a secure HMAC-SHA256 hash of the OTP and phone
 */
function hashOtp(phone: string, otpCode: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${phone}:${otpCode}`)
    .digest('hex');
}

/**
 * Creates a cryptographically signed, stateless OTP session token.
 * This allows verification to succeed across multiple serverless lambda instances (e.g. Vercel)
 * without needing an external database connection.
 */
export function signOtpSessionToken(phone: string, otpCode: string, expiresAt: number): string {
  const secret = getUserJwtSecret();
  const codeHash = hashOtp(phone, otpCode, secret);
  const payload = `${phone}.${expiresAt}.${codeHash}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

/**
 * Verifies a stateless OTP session token and matches entered OTP
 */
export function verifyStatelessOtp(
  phone: string,
  enteredOtp: string,
  sessionToken: string
): { valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(sessionToken, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 4) {
      return { valid: false, error: 'Malformed OTP session token.' };
    }

    const [tokenPhone, tokenExpiresStr, tokenHash, tokenSignature] = parts;
    const expiresAt = parseInt(tokenExpiresStr, 10);
    const secret = getUserJwtSecret();

    // 1. Verify HMAC Signature
    const expectedPayload = `${tokenPhone}.${tokenExpiresStr}.${tokenHash}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    const sigBuf = Buffer.from(tokenSignature, 'utf8');
    const expectedSigBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return { valid: false, error: 'Invalid or tampered OTP session signature.' };
    }

    // 2. Check Phone Match
    if (tokenPhone !== phone) {
      return { valid: false, error: 'OTP session phone number mismatch.' };
    }

    // 3. Check Expiry
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'OTP has expired. Please request a new OTP.' };
    }

    // 4. Verify Entered OTP
    const enteredHash = hashOtp(phone, enteredOtp, secret);
    const hashBuf = Buffer.from(tokenHash, 'utf8');
    const enteredHashBuf = Buffer.from(enteredHash, 'utf8');

    if (hashBuf.length !== enteredHashBuf.length || !crypto.timingSafeEqual(hashBuf, enteredHashBuf)) {
      return { valid: false, error: 'Invalid 6-digit OTP code. Please check your WhatsApp.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'OTP token verification failed.' };
  }
}

/**
 * Check request cooldown (60 seconds)
 */
export function checkOtpCooldown(phone: string): { allowed: boolean; waitSeconds?: number } {
  const existing = localCache.get(phone);
  if (existing) {
    const elapsed = Date.now() - existing.requestedAt;
    if (elapsed < 60 * 1000) {
      return { allowed: false, waitSeconds: Math.ceil((60 * 1000 - elapsed) / 1000) };
    }
  }
  return { allowed: true };
}

/**
 * Stores OTP in local memory cache (used as backup in dev / single instance)
 */
export function setLocalOtp(phone: string, code: string, expiresAt: number) {
  localCache.set(phone, {
    code,
    expiresAt,
    requestedAt: Date.now(),
    attempts: 0,
  });
}

/**
 * Retrieves local OTP and checks attempt limit
 */
export function verifyLocalOtp(phone: string, enteredOtp: string): { valid: boolean; error?: string } {
  const stored = localCache.get(phone);
  if (!stored) {
    return { valid: false, error: 'OTP has expired or was not requested. Please request a new OTP.' };
  }

  if (Date.now() > stored.expiresAt) {
    localCache.delete(phone);
    return { valid: false, error: 'OTP has expired. Please request a new OTP.' };
  }

  if (stored.attempts >= 5) {
    localCache.delete(phone);
    return { valid: false, error: 'Too many incorrect attempts. This OTP has been invalidated for security.' };
  }

  stored.attempts++;

  if (stored.code !== enteredOtp) {
    return { valid: false, error: `Invalid 6-digit OTP code. (${5 - stored.attempts} attempts remaining)` };
  }

  // Success - consume immediately
  localCache.delete(phone);
  return { valid: true };
}
