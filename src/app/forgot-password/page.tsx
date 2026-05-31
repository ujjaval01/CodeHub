"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Key, ShieldAlert, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    if (cooldown > 0) return setError(`Please wait ${cooldown} seconds before requesting another recovery code.`);
    
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      
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

    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return setError("Please enter a valid 6-digit OTP.");
    
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      
      setResetToken(data.resetToken);
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      
      setStep("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 relative z-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#09090b]">
              <Lock className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Reset Password</h2>
          <p className="text-sm text-zinc-400">Recover access to your account</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.form key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleRequestOtp} className="space-y-5">
                {error && <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"><ShieldAlert className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
                
                <div className="space-y-1 text-left">
                  <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><Mail className="h-4 w-4 text-zinc-500" /></div>
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500" placeholder="name@example.com" />
                  </div>
                </div>

                <button type="submit" disabled={isLoading || cooldown > 0} className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : cooldown > 0 ? <span>Wait {cooldown}s</span> : <><span>Send Recovery Code</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </motion.form>
            )}

            {step === "otp" && (
              <motion.form key="otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleVerifyOtp} className="space-y-5">
                {error && <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"><ShieldAlert className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
                
                <div className="space-y-1 text-left">
                  <label htmlFor="otp" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Enter Recovery Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><Key className="h-4 w-4 text-zinc-500" /></div>
                    <input id="otp" type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="glass-input pl-10 tracking-[0.5em] font-mono text-center w-full rounded-xl py-3.5 text-base focus:ring-1 focus:ring-indigo-500 text-white" placeholder="------" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Code sent to {email}</p>
                </div>

                <button type="submit" disabled={isLoading || otp.length < 6} className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <><span>Verify Code</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </motion.form>
            )}

            {step === "reset" && (
              <motion.form key="reset" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleResetPassword} className="space-y-5">
                {error && <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"><ShieldAlert className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
                
                <div className="space-y-1 text-left">
                  <label htmlFor="newPassword" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><Lock className="h-4 w-4 text-zinc-500" /></div>
                    <input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="glass-input pl-10 w-full rounded-xl py-3 text-sm focus:ring-1 focus:ring-indigo-500" placeholder="•••••••• (min 6 chars)" />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <><span>Update Password</span><CheckCircle className="h-4 w-4" /></>}
                </button>
              </motion.form>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Password Updated</h3>
                  <p className="text-sm text-zinc-400 mt-2">Redirecting to your dashboard...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Back to Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
