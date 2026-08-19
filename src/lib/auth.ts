// src/lib/auth.ts

export interface AuthUser {
    uid: string;
    phone?: string | null;
    name?: string;
    role?: string;
}

/**
 * Retrieves the currently logged-in user from browser local storage safely.
 */
export const getStoredUser = (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem('kamai_user');
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed && (parsed.uid || parsed.phone)) {
            return parsed;
        }
        return null;
    } catch (err) {
        console.error('Failed to parse stored user:', err);
        return null;
    }
};

/**
 * Saves or updates the user profile inside browser local storage.
 */
export const setStoredUser = (user: AuthUser | null) => {
    if (typeof window === 'undefined') return;
    if (!user) {
        localStorage.removeItem('kamai_user');
    } else {
        localStorage.setItem('kamai_user', JSON.stringify(user));
    }
    window.dispatchEvent(new Event('auth_changed'));
    window.dispatchEvent(new Event('storage'));
};

/**
 * Clears user session data on logout.
 */
export const logoutUser = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('kamai_user');
    window.dispatchEvent(new Event('auth_changed'));
    window.dispatchEvent(new Event('storage'));
};