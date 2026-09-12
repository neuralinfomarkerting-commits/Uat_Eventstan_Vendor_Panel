'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';
import { clearSession, getToken, getUser, isLoggedIn, isVendorProfileComplete, saveSession, type VendorUser } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/vendor/login']);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(!PUBLIC_PATHS.has(pathname));

  useEffect(() => {
    async function verify() {
      if (PUBLIC_PATHS.has(pathname)) {
        setChecking(false);
        if (!isLoggedIn()) return;
        try {
          const me = await vendorApi.auth.me<VendorUser>();
          const user = me ?? getUser();
          if (user?.role !== 'VENDOR') {
            clearSession();
            return;
          }
          const token = getToken();
          if (token && me) {
            saveSession(token, me);
          }
          router.replace(isVendorProfileComplete(me) ? '/vendor/dashboard' : '/vendor/profile');
        } catch {
          clearSession();
        }
        return;
      }

      const token = localStorage.getItem('vendor_token');
      const stored = getUser();
      if (!token || stored?.role !== 'VENDOR') {
        clearSession();
        router.replace('/vendor/login');
        return;
      }

      try {
        const me = await vendorApi.auth.me<VendorUser>();
        const user = me;
        if (!user || user.role !== 'VENDOR') {
          clearSession();
          router.replace('/vendor/login');
          return;
        }

        const supportRoute = pathname.startsWith('/vendor/support');
        if (!isVendorProfileComplete(user) && pathname !== '/vendor/profile' && !supportRoute) {
          saveSession(token, user);
          router.replace('/vendor/profile');
          return;
        }

        saveSession(token, user);
        if (pathname === '/vendor/profile' || pathname === '/vendor/login') {
          queueMicrotask(() => setChecking(false));
        } else {
          setChecking(false);
        }
      } catch {
        clearSession();
        router.replace('/vendor/login');
      }
    }

    void verify();
  }, [pathname, router]);

  if (checking && pathname !== '/vendor/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return <>{children}</>;
}
