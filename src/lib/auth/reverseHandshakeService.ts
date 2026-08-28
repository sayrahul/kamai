// src/lib/auth/reverseHandshakeService.ts
import crypto from 'crypto';

export interface ReverseHandshakeSession {
  code: string;
  phone?: string;
  status: 'pending' | 'verified' | 'expired';
  createdAt: number;
  expiresAt: number;
  verifiedAt?: number;
  ip?: string;
}

// Global in-memory session cache for serverless runtime
declare global {
  var __kamai_reverse_handshake_cache: Map<string, ReverseHandshakeSession> | undefined;
}

if (!globalThis.__kamai_reverse_handshake_cache) {
  globalThis.__kamai_reverse_handshake_cache = new Map();
}

const handshakeCache = globalThis.__kamai_reverse_handshake_cache;

// Clean up expired sessions periodically
function cleanExpiredSessions() {
  const now = Date.now();
  handshakeCache.forEach((session, code) => {
    if (session.expiresAt < now) {
      handshakeCache.delete(code);
    }
  });
}

/**
 * Generates a clean, unambiguous 5-character alphanumeric handshake code (e.g. KP-8492)
 */
function generateHandshakeCode(): string {
  // Avoid confusing characters: 0/O, 1/I/L
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    const randIndex = crypto.randomInt(0, chars.length);
    code += chars[randIndex];
  }
  return `KP-${code}`;
}

/**
 * Creates a new reverse handshake session
 */
export function createHandshakeSession(clientIp?: string): {
  code: string;
  businessPhone: string;
  whatsappUrl: string;
  expiresAt: number;
} {
  cleanExpiredSessions();

  const code = generateHandshakeCode();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes TTL

  const rawBusinessPhone = process.env.WHATSAPP_BUSINESS_PHONE || '918669997711';
  const cleanBusinessPhone = rawBusinessPhone.replace(/\D/g, '');

  const session: ReverseHandshakeSession = {
    code,
    status: 'pending',
    createdAt: now,
    expiresAt,
    ip: clientIp,
  };

  handshakeCache.set(code, session);

  const prefilledMessage = `Please verify my KamaiPlus POS login: ${code}`;
  const whatsappUrl = `https://wa.me/${cleanBusinessPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  return {
    code,
    businessPhone: cleanBusinessPhone,
    whatsappUrl,
    expiresAt,
  };
}

/**
 * Inspects an incoming WhatsApp message body and sender phone.
 * If a matching handshake code is found, marks session as verified.
 */
export function verifyHandshakeSessionByMessage(
  fromPhone: string,
  messageBody: string
): { verified: boolean; code?: string; phone?: string } {
  cleanExpiredSessions();

  if (!messageBody || !fromPhone) {
    return { verified: false };
  }

  const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10);

  // Match pattern like KP-XXXXX or KAMAI-XXXXX
  const match = messageBody.toUpperCase().match(/(?:KP|KAMAI)-[A-Z0-9]{4,6}/);
  if (!match) {
    return { verified: false };
  }

  const code = match[0].replace('KAMAI-', 'KP-');
  const session = handshakeCache.get(code);

  if (!session) {
    return { verified: false };
  }

  if (session.expiresAt < Date.now()) {
    session.status = 'expired';
    return { verified: false, code };
  }

  session.status = 'verified';
  session.phone = cleanPhone;
  session.verifiedAt = Date.now();
  handshakeCache.set(code, session);

  console.log(`✅ Reverse WhatsApp Handshake Verified: Code ${code} linked to +91 ${cleanPhone}`);

  return {
    verified: true,
    code,
    phone: cleanPhone,
  };
}

/**
 * Checks the status of an ongoing handshake session
 */
export function getHandshakeStatus(code: string): {
  status: 'pending' | 'verified' | 'expired' | 'not_found';
  phone?: string;
  verifiedAt?: number;
} {
  const session = handshakeCache.get(code);
  if (!session) {
    return { status: 'not_found' };
  }

  if (session.expiresAt < Date.now() && session.status !== 'verified') {
    session.status = 'expired';
    return { status: 'expired' };
  }

  return {
    status: session.status,
    phone: session.phone,
    verifiedAt: session.verifiedAt,
  };
}
