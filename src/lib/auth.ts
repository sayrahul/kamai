// src/lib/auth.ts

export interface AuthUser {
    uid: string;
    id?: string;
    phone?: string | null;
    email?: string | null;
    photoURL?: string | null;
    name?: string;
    business_id?: string;
    business_name?: string;
    shop_name?: string;
    role?: string;
}

export const getStoredUser = (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem('kamai_user');
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed && (parsed.uid || parsed.phone || parsed.id)) {
            return parsed;
        }
        return null;
    } catch (err) {
        console.error('Failed to parse stored user:', err);
        return null;
    }
};

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

export const purgeLocalDeviceData = async () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.clear();
        sessionStorage.clear();
        const { db } = await import('@/lib/db');
        if (db) {
            if (!db.isOpen()) {
                await db.open().catch(() => {});
            }
            await Promise.all([
                db.businesses.clear().catch(() => {}),
                db.products.clear().catch(() => {}),
                db.sales.clear().catch(() => {}),
                db.customers.clear().catch(() => {}),
                db.categories.clear().catch(() => {}),
                db.inventory_movements.clear().catch(() => {}),
                db.suppliers.clear().catch(() => {}),
                db.cash_registers.clear().catch(() => {}),
                db.cash_expenses.clear().catch(() => {}),
                db.ledger_transactions.clear().catch(() => {}),
            ]);
        }
    } catch (e) {
        console.warn('Device wipe error:', e);
    }
};

export const logoutUser = async () => {
    if (typeof window === 'undefined') return;
    try {
        await purgeLocalDeviceData();
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    window.dispatchEvent(new Event('auth_changed'));
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/auth?fresh=true';
};