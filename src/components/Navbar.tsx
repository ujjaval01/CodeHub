"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Flame, User, LogOut, Menu, X, Award, ShieldAlert, Settings } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const navLinks = [
    { name: "Problems", path: "/problems" },
    { name: "Contests", path: "/contests" },
    { name: "Leaderboard", path: "/leaderboard" },
    ...(user ? [{ name: "Quiz Arena", path: "/arena" }] : []),
  ];

  const getRankTier = (xp: number) => {
    if (xp >= 8000) return { name: "Diamond", color: "text-cyan-400" };
    if (xp >= 5000) return { name: "Platinum", color: "text-indigo-400" };
    if (xp >= 3000) return { name: "Gold", color: "text-amber-400" };
    if (xp >= 1500) return { name: "Silver", color: "text-slate-400" };
    return { name: "Bronze", color: "text-amber-700" };
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform duration-200">
                <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#09090b]">
                  <Terminal className="h-5 w-5 text-cyan-400 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
              <span className="text-lg font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                CODE<span className="text-gradient-indigo-cyan font-extrabold">HUB</span>
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "text-white bg-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Dashboard
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? "text-white bg-white/5"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {/* User Stats Panel */}
                <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs">
                  {/* Streak */}
                  <div className="flex items-center gap-1 text-amber-500" title="Daily Streak">
                    <Flame className="h-4 w-4 fill-amber-500" />
                    <span className="font-bold">{user.streak}</span>
                  </div>
                  <div className="h-3 w-[1px] bg-white/10" />
                  {/* Level */}
                  <div className="text-zinc-300 font-medium">
                    Lv. <span className="text-gradient-indigo-cyan font-bold">{user.level}</span>
                  </div>
                  <div className="h-3 w-[1px] bg-white/10" />
                  {/* Rank */}
                  <div className={`${getRankTier(user.xp).color} font-bold`}>
                    {getRankTier(user.xp).name}
                  </div>
                </div>

                {user.isPremium ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    PREMIUM
                  </div>
                ) : (
                  <Link href="/premium" className="px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5" />
                    Upgrade
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-zinc-300 hover:text-white hover:border-indigo-500 transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg border border-white/10 bg-[#0c0c0e]/95 p-1 shadow-lg backdrop-blur-md">
                      <div className="px-3 py-2 text-xs border-b border-white/5">
                        <p className="font-semibold text-white">{user.name}</p>
                        <p className="text-zinc-500 truncate">{user.email}</p>
                      </div>

                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-amber-400 hover:bg-white/5 hover:text-amber-300 transition-colors"
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Admin Console
                        </Link>
                      )}

                      <Link
                        href="/settings"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="glow-btn-primary rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            {user && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-xs text-amber-500">
                <Flame className="h-3.5 w-3.5 fill-amber-500" />
                <span className="font-bold">{user.streak}</span>
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#09090b] px-4 py-3 space-y-2">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5"
          >
            Dashboard
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={() => setIsOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5"
            >
              {link.name}
            </Link>
          ))}
          <div className="border-t border-white/5 my-2 pt-2">
            {user ? (
              <div className="space-y-1.5">
                <div className="px-3 py-1.5 text-xs text-zinc-500">
                  Logged in as <span className="text-zinc-300 font-semibold">{user.name}</span>
                </div>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-amber-400 hover:bg-white/5"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Admin Console
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center rounded-lg border border-white/10 px-3 py-2 text-center text-sm font-medium text-zinc-300 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center glow-btn-primary rounded-lg px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
