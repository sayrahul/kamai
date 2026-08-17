'use client';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  business_id?: string;
  business_name?: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  subscription_valid_until?: string | null;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  created_at: string;
  token?: string;
}

const AUTH_USER_KEY = 'kamai_auth_user';
const INTRO_SEEN_KEY = 'kamai_intro_seen';

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
  window.dispatchEvent(new Event('auth_changed'));
}

export function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(INTRO_SEEN_KEY) === 'true';
}

export function markIntroAsSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INTRO_SEEN_KEY, 'true');
}

export function resetIntroSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INTRO_SEEN_KEY);
}

export function createDemoUser(): AuthUser {
  return {
    id: `usr_${Date.now()}`,
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul.kirana@vyapar.in',
    business_name: 'Shree Ganesh Super Mart',
    role: 'owner',
    created_at: new Date().toISOString(),
    token: `demo_token_${Date.now()}`,
  };
}
