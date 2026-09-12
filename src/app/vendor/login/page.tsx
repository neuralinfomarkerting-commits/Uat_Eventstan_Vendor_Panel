"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  Calendar,
  Users,
  CreditCard,
  Shield,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { clearSession, getToken, getUser, isLoggedIn, isVendorProfileComplete, saveSession, updateSessionUser, type VendorUser } from "@/lib/auth";
import { showError, showSuccess } from "@/lib/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginApiResponse {
  accessToken?: string;
  tokenType?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedProfile?: boolean;
    [key: string]: unknown;
  };
  statusCode?: number;
  message?: string;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function loginVendor(email: string, password: string): Promise<LoginApiResponse> {
  return vendorApi.auth.login<LoginApiResponse>(email, password);
}

function extractToken(res: LoginApiResponse): string | null {
  return res.accessToken || null;
}

function isSuccess(res: LoginApiResponse): boolean {
  // Check if statusCode is 200-299 (201 is success)
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
    return true;
  }
  
  // If there's an accessToken, consider it success
  if (res.accessToken) {
    return true;
  }
  
  return false;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;

    const user = getUser();
    if (user?.role !== 'VENDOR') {
      clearSession();
      return;
    }

    vendorApi.auth.me<VendorUser>()
      .then((res) => {
        if (res.role !== 'VENDOR') {
          clearSession();
          return;
        }
        const token = getToken();
        if (token) saveSession(token, res);
        updateSessionUser(res);
        router.replace(isVendorProfileComplete(res) ? '/vendor/dashboard' : '/vendor/profile');
      })
      .catch(() => clearSession());
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginVendor(email, password);
      const token = extractToken(res);

      if (isSuccess(res) && token && res.user?.role === "VENDOR") {
        saveSession(token, res.user as VendorUser);
        showSuccess("Login successful! Welcome back.");
        window.location.href = isVendorProfileComplete(res.user as VendorUser) ? "/vendor/dashboard" : "/vendor/profile";
      } else if (res.user?.role && res.user.role !== "VENDOR") {
        showError("This portal is only available to vendor accounts.");
      } else {
        showError(res.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Unable to reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-black">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white relative overflow-hidden border-r border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-20 -left-20 w-80 h-80 rounded-full blur-3xl" style={{ background: "#f9670620" }} />
        <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: "#f9670610" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full h-full">
          <div className="flex items-center">
            <span className="text-2xl xl:text-3xl font-bold tracking-tight text-white">
              Event<span style={{ color: "#f96706" }}> Stan</span>
            </span>
          </div>

          <div className="space-y-6 xl:space-y-8">
            <div className="space-y-3 xl:space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-xs font-medium text-white/80">Vendor Portal</span>
                <ArrowRight className="w-3 h-3 text-white/60" />
              </div>
              <h1 className="text-2xl xl:text-4xl font-bold leading-tight tracking-tight text-white">
                Welcome to Your
                <span className="block mt-1 xl:mt-2" style={{ color: "#f96706" }}>
                  Vendor Dashboard
                </span>
              </h1>
              <p className="text-sm xl:text-base text-white/60 leading-relaxed">
                Access your vendor panel to manage bookings, track earnings, and grow your event business with EventStan.
              </p>
            </div>

            <div className="flex gap-4 xl:gap-6 pt-2">
              {[["500+", "Active Vendors"], ["10K+", "Happy Customers"], ["98%", "Satisfaction"]].map(([val, label]) => (
                <div key={label}>
                  <div className="text-xl xl:text-2xl font-bold text-white">{val}</div>
                  <div className="text-xs text-white/50">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 xl:gap-3 pt-2">
              {[
                { icon: Calendar, text: "Smart Scheduling" },
                { icon: Users, text: "Customer Management" },
                { icon: CreditCard, text: "Secure Payments" },
                { icon: Shield, text: "Data Protection" },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 xl:p-2.5 border border-white/10">
                  <feature.icon className="w-3.5 h-3.5 xl:w-4 xl:h-4" style={{ color: "#f96706" }} />
                  <span className="text-xs font-medium text-white/80">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} EventStan. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="text-center mb-6 sm:mb-8 lg:hidden">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                Event<span style={{ color: "#f96706" }}>Stan</span>
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-2 sm:mt-3">
              Sign in to manage your business
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 md:p-8 shadow-sm">
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-black">Welcome Back</h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f96706] focus:border-transparent transition-all duration-200 bg-gray-50/50 text-black"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-10 sm:pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f96706] focus:border-transparent transition-all duration-200 bg-gray-50/50 text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2 sm:py-2.5 rounded-xl transition-all duration-200 text-sm sm:text-base"
                style={{ background: "#f96706" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Secure Login</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Privacy Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
