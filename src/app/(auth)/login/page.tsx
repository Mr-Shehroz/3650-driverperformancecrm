"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";

const FEATURES = [
  {
    icon: Camera,
    title: "Damage on record",
    text: "Photos, customer signature and GPS captured at pickup.",
  },
  {
    icon: ShieldCheck,
    title: "Claims-ready reports",
    text: "Locked entries with a complete audit history.",
  },
  {
    icon: BarChart3,
    title: "Team performance",
    text: "Drivers and sales reps measured in one place.",
  },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center bg-primary font-heading text-base font-extrabold tracking-wide text-white [clip-path:polygon(0_0,100%_0,100%_72%,72%_100%,0_100%)]">
        DRS
      </div>
      <div className="leading-none">
        <p className="font-heading text-lg font-bold tracking-wide text-white">
          DIRECT RELOCATION
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
          Services
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-secondary text-white">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 32px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 pt-[max(env(safe-area-inset-top),1.75rem)]">
          <Brand />
          <p className="hidden text-sm text-white/55 md:block">
            Need access?{" "}
            <span className="font-medium text-white">Contact your admin</span>
          </p>
        </header>

        {/* Content */}
        <div className="grid flex-1 items-center gap-10 py-6 md:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] md:gap-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_540px] xl:gap-24">
          {/* Left */}
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.25em] text-primary sm:text-sm">
              Performance Portal
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] sm:text-[44px] md:text-[38px] lg:text-[44px] xl:text-5xl">
              Every job. Every mile.
              <br />
              <span className="text-primary">On record.</span>
            </h1>
            <p className="mt-5 hidden max-w-lg text-base leading-relaxed text-white/50 sm:block">
              Document pre-existing damage at pickup, track every crew&apos;s
              performance, and measure sales results — all from one secure
              portal.
            </p>

            <ul className="mt-10 hidden space-y-4 sm:block">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <p className="text-[15px] text-white/50">
                    <span className="font-semibold text-white/85">{title}</span>{" "}
                    — {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: form card */}
          <div className="w-full">
            <div className="overflow-hidden rounded-2xl bg-white text-foreground shadow-[0_40px_100px_-30px_rgba(215,25,32,0.55)] ring-1 ring-white/10">
              <div className="h-1.5 bg-primary" />
              <div className="p-6 sm:p-12 md:p-8 lg:p-12">
                <h2 className="text-3xl font-bold sm:text-[38px] md:text-[32px] lg:text-[38px]">
                  Sign in
                </h2>
                <p className="mt-2 text-base text-muted-foreground">
                  Use the email and password provided by your admin.
                </p>

                <form action={action} className="mt-10 space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[15px] font-semibold"
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      placeholder="name@directrelocate.com"
                      className="h-12 rounded-lg bg-muted/40 px-4 text-base focus-visible:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-[15px] font-semibold"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        placeholder="Enter your password"
                        className="h-12 rounded-lg bg-muted/40 px-4 pr-12 text-base focus-visible:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {state?.error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {state.error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-14 w-full rounded-lg text-[17px] font-semibold shadow-lg shadow-primary/30"
                  >
                    {pending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign in <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Forgot your password? Contact your admin.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>USDOT #3000931 · MC #24036 · Fort Lauderdale, FL</p>
          <p>© {new Date().getFullYear()} Direct Relocation Services</p>
        </footer>
      </div>
    </main>
  );
}
