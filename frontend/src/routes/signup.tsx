import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { Toaster, toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Timer,
  Circle,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true") {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign up — SecureSend" },
      {
        name: "description",
        content: "Sign up for SecureSend with a one-time code sent to your email.",
      },
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[@#$%]/.test(password),
    }),
    [password],
  );

  const missingPasswordRules = useMemo(() => {
    const missing: string[] = [];
    if (!passwordChecks.minLength) missing.push("Minimum: 12 characters");
    if (!passwordChecks.uppercase) missing.push("Uppercase (A-Z)");
    if (!passwordChecks.lowercase) missing.push("Lowercase (a-z)");
    if (!passwordChecks.number) missing.push("Numbers (0-9)");
    if (!passwordChecks.symbol) missing.push("Symbols (@ # $ %)");
    return missing;
  }, [passwordChecks]);

  const passwordStrong = missingPasswordRules.length === 0;
  const passwordMatch = password === confirmPassword;
  const canCreateAccount =
    passwordStrong && passwordMatch && password.length > 0 && confirmPassword.length > 0;

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
    try {
      await api.post("/auth/request-otp", { email: email.trim() });
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setOtpError(null);
      setResendIn(30);
      toast.success(`Code sent to ${maskEmail(email.trim())}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    try {
      await api.post("/auth/request-otp", { email: email.trim() });
      setOtp(["", "", "", "", "", ""]);
      setOtpError(null);
      setResendIn(30);
      toast.success("New code sent");
    } catch (err: any) {
      toast.error("Failed to resend OTP");
    }
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
    try {
      await api.post("/auth/verify-otp", { email: email.trim(), otp: code });
      setStep("password");
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "Incorrect code. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!passwordStrong) {
      setPasswordError(`Password is missing: ${missingPasswordRules.join(", ")}.`);
      return;
    }
    if (!passwordMatch) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError(null);
    setCreating(true);
    try {
      const res = await api.post("/auth/signup", {
        email: email.trim(),
        password,
      });

      // Store token and authenticated user's email
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userEmail", res.data.user?.email || email.trim());
      localStorage.setItem("isLoggedIn", "true");
      setStep("success");
      setTimeout(() => navigate({ to: "/" }), 1400);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Toaster position="top-center" richColors />
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10">
        {/* Brand */}
        <Link to="/landing" className="mb-6 flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">SecureSend</span>
        </Link>

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

              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
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
                  emailError
                    ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                    : "border-border",
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
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline transition-colors"
                >
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

              <div className="grid grid-cols-6 gap-2 sm:gap-3 justify-center" onPaste={handleOtpPaste}>
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
                      "w-full aspect-square rounded-xl border bg-background text-center text-base sm:text-lg font-semibold outline-none transition-all flex items-center justify-center min-h-[40px] focus:scale-105",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
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
                <p className="mt-3 text-center text-xs text-destructive animate-fade-in">
                  {otpError}
                </p>
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
                <div className="rounded-xl border border-border bg-surface-muted px-3.5 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Password must include
                  </p>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { ok: passwordChecks.minLength, label: "Minimum: 12 characters" },
                      { ok: passwordChecks.uppercase, label: "Uppercase (A-Z)" },
                      { ok: passwordChecks.lowercase, label: "Lowercase (a-z)" },
                      { ok: passwordChecks.number, label: "Numbers (0-9)" },
                      { ok: passwordChecks.symbol, label: "Symbols (@ # $ %)" },
                    ].map((rule) => (
                      <p
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-2",
                          rule.ok ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {rule.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}{" "}
                        {rule.label}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                      className={cn(
                        "w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none transition-all",
                        "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        passwordError?.includes("Password is missing")
                          ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                          : "border-border",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                      className={cn(
                        "w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none transition-all",
                        "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        !passwordMatch && confirmPassword
                          ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                          : "border-border",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label={
                        showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {passwordError && (
                <p className="mt-4 text-center text-xs text-destructive animate-fade-in">
                  {passwordError}
                </p>
              )}

              <button
                onClick={handleCreateAccount}
                disabled={creating || !canCreateAccount}
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
