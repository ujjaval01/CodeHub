"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Lock, Mail, User, ArrowRight, ShieldAlert, Key, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SignupContent() {
  const { refreshUser } = useAuth();
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // OTP flow states
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [registrationToken, setRegistrationToken] = useState("");
  const [userOtp, setUserOtp] = useState("");
  const [mockOtp, setMockOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Form submission (requests OTP)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another OTP.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setRegistrationToken(data.registrationToken);
        setMockOtp(data.mockOtp || "");
        setStep("otp");
        
        // Start 60s cooldown
        setCooldown(60);
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } else {
        setError(data.error || "Failed to initiate registration.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Verification submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userOtp || userOtp.trim().length === 0) {
      setError("Please enter the verification OTP code.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, userOtp }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("success");
        // Authenticate context globally
        await refreshUser();
        // Redirect to dashboard after delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "OTP verification failed.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
      {/* Background radial lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#09090b]">
              <Terminal className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            {step === "form" ? "Create Account" : step === "otp" ? "Verify Email" : "Account Created"}
          </h2>
          <p className="text-sm text-zinc-400">
            {step === "form" 
              ? "Join CodeHub and start solving DSA problems today"
              : step === "otp" ? `Enter the 6-digit OTP code sent to ${email}` : "You are now being redirected to the dashboard..."}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
                onSubmit={handleSubmitForm}
              >
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label htmlFor="name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500"
                      placeholder="•••••••• (min 6 chars)"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cooldown > 0}
                  className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Sending OTP...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <span>Wait {cooldown}s to Resend</span>
                    </>
                  ) : (
                    <>
                      <span>Next: Verify Email</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : step === "otp" ? (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
                onSubmit={handleVerifyOtp}
              >
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label htmlFor="otp" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Verification OTP Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Key className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      value={userOtp}
                      onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, ""))}
                      className="glass-input pl-10 tracking-[0.5em] font-mono text-center w-full rounded-xl py-3.5 text-base focus:ring-1 focus:ring-indigo-500 text-white placeholder:tracking-normal placeholder:font-sans"
                      placeholder="------"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="submit"
                    disabled={isVerifying || userOtp.length < 6}
                    className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Verifying OTP & Registering...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-white" />
                        <span>Complete Sign Up</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setError("");
                    }}
                    className="flex w-full items-center justify-center rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 py-2.5 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Edit Details
                  </button>
                </div>

                {/* Developer / Mock OTP helper card */}
                {mockOtp && (
                  <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-[11px] text-zinc-400 space-y-2 leading-relaxed text-left">
                    <p className="font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider text-[9px]">
                      <Key className="h-3.5 w-3.5 text-cyan-400" />
                      Mock Signup Verification Code
                    </p>
                    <p>Since this is a sandboxed environment, we simulated the verification email.</p>
                    <p className="bg-[#09090b]/80 border border-white/5 p-2 rounded text-center text-xs font-mono text-white">
                      Your OTP code is: <span className="font-extrabold text-cyan-400 text-sm tracking-widest">{mockOtp}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center font-mono">Printed also to server terminal logs.</p>
                  </div>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center space-y-4"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Registration Complete!</h3>
                  <p className="text-sm text-zinc-400">Loading your dashboard profile...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign In instead
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
