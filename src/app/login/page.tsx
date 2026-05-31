"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Lock, Mail, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

function LoginContent() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Invalid credentials.");
    }
  };

  const handleDemoSignIn = async (demoEmail: string) => {
    setError("");
    setIsSubmitting(true);
    const result = await login(demoEmail, "password123");
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to log in with demo account.");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
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
            Welcome Back
          </h2>
          <p className="text-sm text-zinc-400">
            Sign in to continue your algorithm training
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot Password?
                </Link>
              </div>
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glow-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Authenticating..." : "Sign In"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center justify-between text-xs text-zinc-500">
            <span className="h-[1px] w-full bg-white/5" />
            <span className="px-3 shrink-0 uppercase tracking-widest text-[9px] font-bold">OR DEMO LOGINS</span>
            <span className="h-[1px] w-full bg-white/5" />
          </div>

          {/* Quick Demo Sign In */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoSignIn("admin@codepractice.com")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Demo Admin
            </button>
            <button
              onClick={() => handleDemoSignIn("alex@codepractice.com")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" />
              Demo User
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
