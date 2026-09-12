'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, CalendarDays, Package,
  BookOpen, User, LogOut, ChevronRight, Menu, Loader2, X, LifeBuoy, Megaphone,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { vendorApi } from '@/api/vendorApi';
import { clearSession, getToken, getUser, isVendorProfileComplete, onVendorSessionChange, saveSession, type VendorUser } from '@/lib/auth';
import { canAccessPermission, canAccessRoute } from '@/lib/permissions';
import { showError, showSuccess } from '@/lib/toast';

const navItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissionKey: 'dashboard-vendor' },
  { href: '/vendor/services',  label: 'Services',  icon: Briefcase, permissionKey: 'services-vendor' },
  { href: '/vendor/packages',  label: 'Packages',  icon: Package, permissionKey: 'packages-vendor' },
  { href: '/vendor/promotional-packages',  label: 'Promotional Package',  icon: Megaphone, permissionKey: 'packages-vendor' },
  { href: '/vendor/bookings',  label: 'Bookings',  icon: BookOpen, permissionKey: 'bookings-vendor' },
  { href: '/vendor/calendar',  label: 'Calendar',  icon: CalendarDays, permissionKey: 'calendar-vendor' },
  { href: '/vendor/support',   label: 'Help & Support', icon: LifeBuoy, permissionKey: 'support-vendor' },
  { href: '/vendor/profile',   label: 'Update Profile',   icon: User, permissionKey: 'profile-vendor' },
];

async function logoutVendor() {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem('vendor_token');
  if (token) {
    try {
      await vendorApi.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [vendor, setVendor] = useState<VendorUser | null>(getUser());
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let alive = true;

    async function syncSession() {
      const token = getToken();
      if (!token) {
        setVendor(null);
        setSessionReady(true);
        return;
      }

      try {
        const latest = await vendorApi.auth.me<VendorUser>();
        if (!alive) return;
        saveSession(token, latest);
        setVendor(latest);
      } catch {
        if (!alive) return;
        clearSession();
        setVendor(null);
        router.replace('/vendor/login');
      } finally {
        if (alive) setSessionReady(true);
      }
    }

    void syncSession();

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    return onVendorSessionChange(() => {
      setVendor(getUser());
    });
  }, []);

  const profileComplete = isVendorProfileComplete(vendor);
  const permissions = useMemo(() => vendor?.permissions ?? [], [vendor?.permissions]);
  const visibleNavItems = navItems.filter((item) => {
    if (!profileComplete) {
      return ['/vendor/profile', '/vendor/support'].includes(item.href);
    }
    if (!permissions.length || !item.permissionKey) return true;
    return canAccessPermission(item.permissionKey, permissions) || canAccessRoute(item.href, permissions);
  });

  useEffect(() => {
    if (!sessionReady) return;

    const token = getToken();
    if (!token && pathname !== '/vendor/login') {
      router.replace('/vendor/login');
      return;
    }

    const supportRoute = pathname.startsWith('/vendor/support');
    if (token && !profileComplete && pathname !== '/vendor/profile' && pathname !== '/vendor/login' && !supportRoute) {
      router.replace('/vendor/profile');
      return;
    }

    if (token && profileComplete && permissions.length && pathname !== '/vendor/login' && !canAccessRoute(pathname, permissions)) {
      const fallback = permissions.find((permission) => permission.view && permission.routes.length > 0)?.routes[0] ?? '/vendor/dashboard';
      router.replace(fallback);
    }
  }, [pathname, permissions, profileComplete, router, sessionReady]);

  const avatarUrl = vendor?.vendorProfileImage || vendor?.image || null;

  const initials = vendor
    ? vendor.name?.split(' ').map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase() ||
      vendor.email.charAt(0).toUpperCase()
    : 'V';

  const fullName = vendor
    ? vendor.name || vendor.email.split('@')[0] || 'Vendor'
    : 'Vendor';

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await logoutVendor();
    } catch {
      // ignore
    }
    clearSession();
    showSuccess('Logged out successfully.');
    router.replace('/vendor/login');
  }

  // Don't show layout on login page
  if (pathname === '/vendor/login') return <>{children}</>;

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profileComplete && pathname !== '/vendor/profile' && !pathname.startsWith('/vendor/support')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link href="https://event-stan.vercel.app" target="_blank" className="flex items-center gap-1">
            <span className="text-xl font-bold text-gray-900">Event</span>
            <span className="text-xl font-bold text-orange-500">Stan</span>
          </Link>
          <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Vendor</span>
        </div>

        {/* Vendor Info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                {initials || 'V'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{vendor?.email ?? 'vendor@example.com'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {!profileComplete && (
            <div className="mb-3 rounded-xl border border-orange-100 bg-orange-50/80 p-3 text-xs text-orange-700">
              Complete your profile to unlock dashboard, services, packages, bookings, and calendar. Help & Support stays available.
            </div>
          )}
          {visibleNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} className={active ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-orange-400" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900 capitalize">
              {navItems.find(n => n.href === pathname)?.label ?? 'Vendor Panel'}
            </h1>
          </div>

          {/* Avatar — click opens logout modal */}
          <button
            onClick={() => setShowLogout(true)}
            className="relative group focus:outline-none"
            title="Click to sign out"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-orange-400 transition" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-transparent group-hover:ring-orange-300 transition">
                {initials || 'V'}
              </div>
            )}
            {/* small logout hint badge */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
              <LogOut size={8} className="text-gray-500" />
            </span>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* ── Logout Confirm Modal ── */}
      {showLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogout(false)} />

          {/* card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
            <button
              onClick={() => setShowLogout(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            {/* icon */}
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut size={26} className="text-red-500" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">Sign out?</h2>
              <p className="text-sm text-gray-500 mt-1">
                You will be logged out of your vendor account.
              </p>
            </div>

            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}