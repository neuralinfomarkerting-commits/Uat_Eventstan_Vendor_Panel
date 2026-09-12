import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventStan – Vendor Panel",
  description: "Manage your event services on EventStan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
