import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { Toaster, toast } from "sonner";
import { ShieldCheck, Mail, KeyRound, Loader2, CheckCircle2, ArrowLeft, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

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

type Step = "login" | "success" | "forgot-email" | "forgot-otp" | "forgot-reset" | "forgot-success";

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "forgot-otp") {
      const id = setTimeout(() => inputsRef.current[0]?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [step]);

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
    
    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("isLoggedIn", "true");
      setStep("success");
      setTimeout(() => navigate({ to: "/" }), 1400);
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestReset = async () => {
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setStep("forgot-otp");
      setOtp(["", "", "", "", "", ""]);
      setResendIn(30);
      toast.success(`Reset code sent to ${maskEmail(email.trim())}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset code");
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    setError(null);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setOtp(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      await api.post("/auth/verify-otp", { email: email.trim(), otp: code });
      setStep("forgot-reset");
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Incorrect code. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim(),
        otp: otp.join(""),
        newPassword: password,
      });
      setStep("forgot-success");
      setTimeout(() => setStep("login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setVerifying(false);
    }
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
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                      Password
                    </label>
                    <button 
                      onClick={() => {
                        setStep("forgot-email");
                        setError(null);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
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

          {step === "forgot-email" && (
            <>
              <button
                onClick={() => setStep("login")}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </button>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email to receive a reset code</p>
              </div>

              <label htmlFor="reset-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="you@securesend.co.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRequestReset()}
                className={cn(
                  "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                  "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                  error ? "border-destructive" : "border-border",
                )}
              />
              {error && <p className="mt-2 text-xs text-destructive animate-fade-in">{error}</p>}

              <button
                onClick={handleRequestReset}
                disabled={verifying || !email}
                className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {verifying ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Code"}
              </button>
            </>
          )}

          {step === "forgot-otp" && (
            <>
              <button
                onClick={() => setStep("forgot-email")}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change email
              </button>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Verify Reset Code</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a code to <span className="font-medium text-foreground">{maskEmail(email)}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    className={cn(
                      "h-12 w-10 sm:h-14 sm:w-12 rounded-xl border bg-background text-center text-lg font-semibold outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      error ? "border-destructive" : d ? "border-primary" : "border-border",
                    )}
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-center text-xs text-destructive animate-fade-in">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={verifying || otp.join("").length < 6}
                className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-90 disabled:opacity-60"
              >
                {verifying ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify Code"}
              </button>
            </>
          )}

          {step === "forgot-reset" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">New password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Set your new account password</p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              {error && <p className="mt-4 text-center text-xs text-destructive animate-fade-in">{error}</p>}

              <button
                onClick={handleResetPassword}
                disabled={verifying || !password || !confirmPassword}
                className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-90 disabled:opacity-60"
              >
                {verifying ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reset Password"}
              </button>
            </>
          )}

          {step === "forgot-success" && (
            <div className="py-6 text-center animate-scale-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Password Reset! 🎉</h1>
              <p className="mt-1 text-sm text-muted-foreground">You can now sign in with your new password.</p>
            </div>
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