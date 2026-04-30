import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { Toaster, toast } from "sonner";
import { ShieldCheck, Mail, KeyRound, Loader2, CheckCircle2, ArrowLeft, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true") {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign up — SecureSend" },
      { name: "description", content: "Sign up for SecureSend with a one-time code sent to your email." },
      { property: "og:title", content: "Sign up — SecureSend" },
      { property: "og:description", content: "Email OTP signup for secure, encrypted messaging." },
    ],
  }),
  component: SignupPage,
});

type Step = "email" | "otp" | "password" | "success";

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  
  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
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
    if (step === "otp") {
      const id = setTimeout(() => inputsRef.current[0]?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [step]);

  const handleSendOtp = async () => {
    if (!emailValid) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSending(true);
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    setStep("otp");
    setOtp(["", "", "", "", "", ""]);
    setOtpError(null);
    setResendIn(30);
    toast.success(`Code sent to ${maskEmail(email.trim())}`);
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError(null);
    setResendIn(30);
    toast.success("New code sent");
  };

  const handleOtpChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    setOtpError(null);
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

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1000));
    setVerifying(false);
    // Demo: accept any code ending in even digit; reject "000000"
    if (code === "000000") {
      setOtpError("Incorrect code. Try again.");
      return;
    }
    setStep("password");
  };

  const handleCreateAccount = async () => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError(null);
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCreating(false);
    
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
          {step === "email" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Create your account 🔐</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email to sign up</p>
              </div>

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
                  if (emailError) setEmailError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                className={cn(
                  "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                  "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                  emailError ? "border-destructive focus:ring-destructive/30 focus:border-destructive" : "border-border",
                )}
              />
              {emailError && (
                <p className="mt-2 text-xs text-destructive animate-fade-in">{emailError}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={sending || !email}
                className={cn(
                  "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all",
                  "hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                )}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>Send OTP</>
                )}
              </button>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
                  Sign in
                </Link>
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                onClick={() => {
                  setStep("email");
                  setOtpError(null);
                }}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change email
              </button>

              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{maskEmail(email.trim())}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    className={cn(
                      "h-12 w-10 sm:h-14 sm:w-12 rounded-xl border bg-background text-center text-lg font-semibold outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary focus:scale-105",
                      otpError
                        ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                        : d
                          ? "border-primary"
                          : "border-border",
                    )}
                  />
                ))}
              </div>
              {otpError && (
                <p className="mt-3 text-center text-xs text-destructive animate-fade-in">{otpError}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={verifying || otp.join("").length < 6}
                className={cn(
                  "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all",
                  "hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                )}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify OTP</>
                )}
              </button>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>Didn't receive code?</span>
                {resendIn > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                    <Timer className="h-3.5 w-3.5" />
                    Resend in {resendIn}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="font-medium text-primary hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Create a password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Secure your account</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                    className={cn(
                      "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      passwordError?.includes("at least 6") ? "border-destructive focus:ring-destructive/30 focus:border-destructive" : "border-border",
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                    className={cn(
                      "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      passwordError?.includes("match") ? "border-destructive focus:ring-destructive/30 focus:border-destructive" : "border-border",
                    )}
                  />
                </div>
              </div>

              {passwordError && (
                <p className="mt-4 text-center text-xs text-destructive animate-fade-in">{passwordError}</p>
              )}

              <button
                onClick={handleCreateAccount}
                disabled={creating || !password || !confirmPassword}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-all",
                  "hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                )}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>Create Account</>
                )}
              </button>
            </>
          )}

          {step === "success" && (
            <div className="py-6 text-center animate-scale-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Account Created 🎉</h1>
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