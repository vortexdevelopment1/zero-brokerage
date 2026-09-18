"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const push = useToastStore((s) => s.push);
  const [email, setEmail] = useState("admin@vortexcubes.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Enter both email and password to continue.");
      return;
    }
    setSubmitting(true);
    // Mock auth — later this calls POST /api/admin/auth/login (see lib/api/endpoints.ts)
    // and stores the returned JWT instead of a mock token.
    await new Promise((r) => setTimeout(r, 650));
    login(email);
    setSubmitting(false);
    push("Welcome back. Signed in successfully.", "success");
    router.replace("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800/60 via-ink-950 to-ink-950" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">VC</div>
          <span className="text-sm font-semibold tracking-wide">VortexCubes</span>
        </div>
        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">
            Asset Network V4.0 <br /> Super Admin Command Center
          </h1>
          <p className="text-sm text-ink-300">
            Central governance for users, brokers, agencies and listings across the residential, commercial,
            land and furniture ecosystems — with live commission, payout and system-health oversight.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: ShieldCheck, label: "Listing & broker moderation" },
              { icon: Building2, label: "Agency & subscription control" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span className="text-xs text-ink-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} VortexCubes. All rights reserved.</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-ink-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">VC</div>
            <span className="text-sm font-semibold text-ink-900">VortexCubes</span>
          </div>

          <h2 className="text-xl font-semibold text-ink-900">Sign in to Super Admin</h2>
          <p className="mt-1 text-sm text-ink-500">Enter your credentials to access the command center.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@vortexcubes.com"
                  className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {error && <p className="text-xs font-medium text-danger-600">{error}</p>}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-ink-500">
                <input type="checkbox" className="rounded border-ink-300" defaultChecked />
                Keep me signed in
              </label>
              <a href="#" className="font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-400">
            This is a frontend-only build on mock data. Any credentials will sign you in.
          </p>
        </div>
      </div>
    </div>
  );
}
