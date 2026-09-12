import AuthGuard from '@/components/vendor/AuthGuard';
import VendorLayout from '@/components/vendor/VendorLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <VendorLayout>{children}</VendorLayout>
    </AuthGuard>
  );
}
