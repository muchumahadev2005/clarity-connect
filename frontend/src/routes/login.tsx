import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { Toaster, toast } from "sonner";
import { ShieldCheck, Mail, KeyRound, Loader2, CheckCircle2, ArrowLeft, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true") {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — SecureSend" },
      { name: "description", content: "Sign in to SecureSend with a one-time code sent to your email." },
      { property: "og:title", content: "Sign in — SecureSend" },
      { property: "og:description", content: "Email OTP login for secure, encrypted messaging." },
    ],
  }),
  component: LoginPage,
});

type Step = "login" | "success";

function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );

  const handleLogin = async () => {
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1000));
    setVerifying(false);
    
    setStep("success");
    localStorage.setItem("isLoggedIn", "true");
    setTimeout(() => navigate({ to: "/" }), 1400);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Toaster position="top-center" richColors />
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">SecureSend</span>
        </div>

        <div
          key={step}
          className="w-full animate-fade-in rounded-2xl border border-border bg-surface p-6 shadow-elegant sm:p-8"
        >
          {step === "login" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back 🔐</h1>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@securesend.co.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className={cn(
                      "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      error?.includes("email") ? "border-destructive focus:ring-destructive/30 focus:border-destructive" : "border-border",
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className={cn(
                      "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      error?.includes("Password") ? "border-destructive focus:ring-destructive/30 focus:border-destructive" : "border-border",
                    )}
                  />
                </div>
              </div>

              {error && (
                <p className="mt-4 text-center text-xs text-destructive animate-fade-in">{error}</p>
              )}

              <button
                onClick={handleLogin}
                disabled={verifying || !email || !password}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all",
                  "hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                )}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign in</>
                )}
              </button>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-semibold text-primary hover:underline transition-colors">
                  Create new account
                </Link>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="py-6 text-center animate-scale-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Login Successful 🎉</h1>
              <p className="mt-1 text-sm text-muted-foreground">Redirecting to your inbox...</p>
              <div className="mx-auto mt-5 h-1 w-32 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full origin-left animate-[fade-in_1.4s_ease-out] bg-primary" />
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to SecureSend's terms & privacy policy.
        </p>
      </div>
    </div>
  );
}