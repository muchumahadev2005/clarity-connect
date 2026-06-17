import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Shield,
  KeyRound,
  Eye,
  Timer,
  VenetianMask,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Check,
  PenLine,
  Link2,
  ShieldCheck,
  Github,
  Twitter,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/landing")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true") {
      throw redirect({ to: "/" });
    }
  },
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "SecureSend — Send messages only they can read" },
      {
        name: "description",
        content:
          "End-to-end encrypted messaging with hybrid AES + RSA, view-once links, self-destruct timers, and anonymous sharing.",
      },
      { property: "og:title", content: "SecureSend — Send messages only they can read" },
      {
        property: "og:description",
        content:
          "Privacy-first encrypted messaging. Keys stay in your browser. No plaintext storage. Ever.",
      },
    ],
  }),
});

function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Nav />
        <Hero />
        <Features />
        <HowItWorks />
        <Demo />
        <Security />
        <CTA />
        <Footer />
      </div>
    </>
  );
}

/* ---------------- NAV ---------------- */
function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/landing" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-base font-semibold tracking-tight">SecureSend</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex rounded-full bg-surface-muted/30 p-1.5 border border-border/40 backdrop-blur-md">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
            { label: "Demo", href: "#demo" },
            { label: "Security", href: "#security" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-primary-foreground active:scale-95"
            >
              <div className="absolute inset-0 z-0 scale-75 rounded-full bg-linear-to-r from-primary to-key opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:shadow-glow-primary" />
              <span className="relative z-10">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button
              size="sm"
              className="group bg-linear-to-r from-primary to-key text-primary-foreground shadow-glow-primary"
            >
              Sign in
              <ArrowRight className="transition group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-full p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 py-4 shadow-floating animate-in fade-in slide-in-from-top-4 z-50">
          <nav className="flex flex-col gap-1.5">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how" },
              { label: "Demo", href: "#demo" },
              { label: "Security", href: "#security" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-linear-to-br from-primary to-key shadow-glow-primary">
      <Shield className="h-4 w-4 text-primary-foreground" />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 150]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background ornaments */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          style={{ y: y1 }}
          className="absolute -top-24 left-1/2 h-130 w-205 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.585_0.176_256/0.25),transparent)] blur-2xl"
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute right-[-10%] top-40 h-105 w-105 rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.22_295/0.22),transparent)] blur-2xl"
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--color-border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 60%, transparent) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 md:pt-16 md:pb-28 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Zero-knowledge by design
            </span>
          </motion.div>
          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
          >
            Send messages that{" "}
            <span className="bg-linear-to-r from-primary via-key to-primary bg-clip-text text-transparent">
              only they can read
            </span>{" "}
            🔐
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            End-to-end encrypted messaging with complete privacy. Keys live in your browser — no
            one, not even us, can access your data.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  className="group h-12 w-full bg-linear-to-r from-primary to-key px-6 text-primary-foreground shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-primary),0.6)] transition-shadow duration-300 sm:w-auto"
                >
                  Send Secure Message
                  <ArrowRight className="transition group-hover:translate-x-0.5" />
                </Button>
              </motion.div>
            </Link>
            <a href="#demo" className="sm:w-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button variant="outline" size="lg" className="h-12 w-full px-6 sm:w-auto">
                  Try Demo
                </Button>
              </motion.div>
            </a>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex items-center gap-5 text-xs text-muted-foreground"
          >
            <Pill icon={<Lock className="h-3.5 w-3.5" />}>AES-256 + RSA-2048</Pill>
            <Pill icon={<Eye className="h-3.5 w-3.5" />}>View-once</Pill>
            <Pill icon={<Timer className="h-3.5 w-3.5" />}>Self-destruct</Pill>
          </motion.div>
        </motion.div>

        <div className="relative">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
      {icon}
      {children}
    </span>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-slide-up">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-linear-to-br from-primary/20 to-key/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-floating">
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
            <ShieldCheck className="h-3 w-3" />
            Encrypted
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              A
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-3.5 py-2.5 text-sm">
              Hey, sending you the access keys.
            </div>
          </div>

          <div className="flex items-start justify-end gap-3">
            <div className="rounded-2xl rounded-tr-sm bg-linear-to-br from-primary to-key px-3.5 py-2.5 text-sm text-primary-foreground shadow-elegant">
              Use the secure link below 👇
            </div>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-key-soft text-xs font-semibold text-key">
              M
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary-soft/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Encrypted payload
              </span>
              <Lock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              U2FsdGVkX1+8aQ3z…7rN9pVxKdQ==·iv:9f3ac1b2…·rsa:wrapped
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> 09:58
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> View once
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <div className="absolute -left-6 top-10 hidden rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-elegant backdrop-blur md:block">
        <div className="flex items-center gap-2 text-xs">
          <KeyRound className="h-4 w-4 text-key" />
          AES key wrapped with RSA
        </div>
      </div>
      <div className="absolute -right-4 bottom-10 hidden rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-elegant backdrop-blur md:block">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-success" />
          Decrypted in browser
        </div>
      </div>
    </div>
  );
}

/* ---------------- FEATURES ---------------- */
const FEATURES = [
  {
    icon: Shield,
    title: "End-to-End Encryption",
    desc: "Messages are encrypted in your browser before they ever leave your device.",
    tone: "primary" as const,
  },
  {
    icon: KeyRound,
    title: "Hybrid Encryption",
    desc: "AES-256 for content, RSA-2048 for keys. Maximum security, zero compromise.",
    tone: "key" as const,
  },
  {
    icon: Eye,
    title: "View Once",
    desc: "Messages disappear forever the moment they're opened.",
    tone: "flash" as const,
  },
  {
    icon: Timer,
    title: "Self Destruct",
    desc: "Set a timer. Your message vanishes automatically when it expires.",
    tone: "warning" as const,
  },
  {
    icon: VenetianMask,
    title: "Anonymous Sharing",
    desc: "Send without revealing who you are. Identity stays yours.",
    tone: "anon" as const,
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    desc: "Fast, seamless sharing. No installs, no friction, no waiting.",
    tone: "success" as const,
  },
];

function Features() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <section id="features" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Features"
          title="Privacy isn't a setting. It's the default."
          subtitle="Everything you need to share sensitive information without losing sleep."
        />
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  tone,
}: {
  icon: typeof Shield;
  title: string;
  desc: string;
  tone: "primary" | "key" | "flash" | "warning" | "anon" | "success";
}) {
  const toneMap: Record<typeof tone, string> = {
    primary: "bg-primary-soft text-primary",
    key: "bg-key-soft text-key",
    flash: "bg-flash-soft text-flash",
    warning: "bg-warning-soft text-warning-foreground",
    anon: "bg-anon-soft text-anon",
    success: "bg-success-soft text-success",
  };
  const item = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <motion.div
      variants={item}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-elegant transition duration-300 hover:-translate-y-1 hover:shadow-floating"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: PenLine,
      title: "Write your message",
      desc: "Compose a note, attach a file, or record a voice memo.",
    },
    {
      n: "02",
      icon: Lock,
      title: "Encrypt & generate link",
      desc: "We encrypt locally and produce a secure, shareable link.",
    },
    {
      n: "03",
      icon: ShieldCheck,
      title: "Receiver decrypts securely",
      desc: "Only the intended recipient can unlock and read it.",
    },
  ];
  return (
    <section id="how" className="relative bg-surface-muted/40 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps. Zero friction."
          subtitle="From plaintext to encrypted in under a second."
        />
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
            className="absolute left-0 right-0 top-17 hidden h-px origin-left bg-linear-to-r from-transparent via-border to-transparent md:block"
          />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.2, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative z-10"
            >
              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-elegant transition hover:-translate-y-0.5 hover:shadow-floating h-full">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-primary to-key text-primary-foreground shadow-glow-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    STEP {s.n}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- DEMO ---------------- */
function Demo() {
  const [msg, setMsg] = useState("Meet me at the usual place at 8.");
  const [stage, setStage] = useState<"idle" | "encrypted" | "decrypted">("idle");

  const fakeCipher =
    "U2FsdGVkX1+kQp9w8nXz7r·" +
    btoa(unescape(encodeURIComponent(msg)))
      .replace(/=+$/, "")
      .slice(0, 56) +
    "·rsa:wrapped";

  return (
    <section id="demo" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Try it live"
          title="See encryption happen in real time"
          subtitle="No accounts, no data sent. Everything stays in your browser."
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
          className="mt-12 overflow-hidden rounded-3xl border border-border bg-card shadow-floating"
        >
          <div className="grid gap-0 md:grid-cols-2">
            {/* Input */}
            <div className="border-b border-border p-6 md:border-b-0 md:border-r">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your message
              </label>
              <Input
                value={msg}
                onChange={(e) => {
                  setMsg(e.target.value);
                  setStage("idle");
                }}
                className="mt-3 h-11"
                placeholder="Type a message…"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => setStage("encrypted")}
                  className="bg-linear-to-r from-primary to-key text-primary-foreground"
                >
                  <Lock />
                  Encrypt
                </Button>
                <Button
                  variant="outline"
                  disabled={stage !== "encrypted"}
                  onClick={() => setStage("decrypted")}
                >
                  <KeyRound />
                  Decrypt
                </Button>
                <Button variant="ghost" onClick={() => setStage("idle")}>
                  Reset
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                This is a UI demonstration. The full app uses real Web Crypto AES + RSA.
              </p>
            </div>

            {/* Output */}
            <div className="bg-surface-muted/50 p-6">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stage === "decrypted" ? "Decrypted" : "Encrypted preview"}
              </label>
              <div className="mt-3 min-h-40 rounded-2xl border border-border bg-card p-4">
                {stage === "idle" && (
                  <p className="font-mono text-xs text-muted-foreground">Waiting for encryption…</p>
                )}
                {stage === "encrypted" && (
                  <p className="break-all font-mono text-xs leading-relaxed text-foreground animate-fade-in">
                    {fakeCipher}
                  </p>
                )}
                {stage === "decrypted" && (
                  <p className="text-sm leading-relaxed text-foreground animate-fade-in">{msg}</p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Keys never leave your device
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- SECURITY ---------------- */
function Security() {
  const points = [
    "No plaintext storage — ever",
    "Keys generated and held in your browser",
    "AES-256-GCM + RSA-OAEP 2048 standards",
    "Open, auditable cryptography",
    "View-once and self-destruct enforced client-side",
    "Zero tracking, zero ads",
  ];
  return (
    <section id="security" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Security
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Your privacy is our{" "}
              <span className="bg-linear-to-r from-primary to-key bg-clip-text text-transparent">
                only priority
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              We built SecureSend so that even we can't read your messages. The math guarantees it —
              not our policy.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {points.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{p}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
            className="relative"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-to-br from-primary/15 via-key/15 to-transparent blur-2xl" />
            <div className="relative mx-auto aspect-square w-full max-w-md rounded-[2rem] border border-border bg-card p-10 shadow-floating">
              <div className="grid h-full place-items-center">
                <div className="relative">
                  <div className="absolute inset-0 -z-10 animate-glow-pulse rounded-full" />
                  <div className="grid h-40 w-40 place-items-center rounded-full bg-linear-to-br from-primary to-key shadow-glow-primary">
                    <Lock className="h-16 w-16 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Badge>AES-256</Badge>
                <Badge>RSA-2048</Badge>
                <Badge>GCM</Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-surface-muted py-2">{children}</div>;
}

/* ---------------- CTA ---------------- */
function CTA() {
  return (
    <section className="relative px-4 py-20 sm:px-6 md:py-28 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-linear-to-br from-primary to-key p-10 text-center shadow-floating sm:p-16"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, white, transparent 40%), radial-gradient(circle at 70% 80%, white, transparent 40%)",
          }}
        />
        <h2 className="relative text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Ready to send your first secret?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Open SecureSend and share something only the right person can read.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button size="lg" variant="secondary" className="h-12 px-6">
                Open the app
                <ArrowRight />
              </Button>
            </motion.div>
          </Link>
          <Link to="/signup">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                Create an account
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-base font-semibold tracking-tight">SecureSend</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Universal secure communication. Encrypted in your browser. Trusted by people who care
            about privacy.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <SocialLink href="#" label="Twitter">
              <Twitter className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="#" label="GitHub">
              <Github className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="#" label="Email">
              <Mail className="h-4 w-4" />
            </SocialLink>
          </div>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
            { label: "Demo", href: "#demo" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: "Privacy", href: "#security" },
            { label: "Security", href: "#security" },
            { label: "Contact", href: "#" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SecureSend. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Built for privacy.
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground hover:shadow-elegant"
    >
      {children}
    </a>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- SHARED ---------------- */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
      >
        {eyebrow}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] as const }}
        className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
        className="mt-4 text-base text-muted-foreground sm:text-lg"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
