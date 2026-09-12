export interface VendorUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  vendorId?: string | null;
  vendorStatus?: string | null;
  companyName?: string | null;
  updatedProfile?: boolean | null;
  image?: string | null;
  vendorProfileImage?: string | null;
  permissions?: RolePermission[];
}

export interface RolePermission {
  key: string;
  label: string;
  panel: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  routes: string[];
  description: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

const SESSION_EVENT = 'vendor-session-updated';

function notifySessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function isVendorProfileComplete(user: VendorUser | null | undefined) {
  return user?.role === 'VENDOR' && user.updatedProfile === true;
}

const TOKEN_KEY = 'vendor_token';
const USER_KEY = 'vendor_data';

export function saveSession(token: string, user: VendorUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ user }));
  localStorage.setItem('user_role', user.role);
  notifySessionChanged();
}

export function updateSessionUser(patch: Partial<VendorUser>) {
  if (typeof window === 'undefined') return;
  const current = getUser();
  if (!current) return;
  const updated = { ...current, ...patch };
  localStorage.setItem(USER_KEY, JSON.stringify({ user: updated }));
  notifySessionChanged();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user_role');
  notifySessionChanged();
}

export function getToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

export function getUser(): VendorUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as
      | VendorUser
      | { user?: VendorUser }
      | null;
    if (!stored) return null;
    if ('user' in stored) return stored.user ?? null;
    return stored as VendorUser;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function onVendorSessionChange(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}