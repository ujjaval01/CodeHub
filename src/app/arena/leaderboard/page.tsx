"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Crown, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  isPremium: boolean;
  totalXP: number;
  accuracy: string;
  totalPlayed: number;
  longestStreak: number;
}

export default function ArenaLeaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard/quiz");
        const json = await res.json();
        if (json.leaderboard) setData(json.leaderboard);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />;
      case 2: return <Medal className="w-6 h-6 text-zinc-300 drop-shadow-[0_0_10px_rgba(212,212,216,0.8)]" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]" />;
      default: return <span className="font-bold text-zinc-500">#{rank}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/arena" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            Global Rankings
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Top players in the Quiz Arena by Total XP.</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4 w-20 text-center">Rank</th>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4 text-center">Accuracy</th>
                <th className="px-6 py-4 text-center">Quizzes</th>
                <th className="px-6 py-4 text-center">Max Streak</th>
                <th className="px-6 py-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-500">
                    No players found. Be the first to play!
                  </td>
                </tr>
              ) : (
                data.map((player) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={player.userId} 
                    className={`hover:bg-white/5 transition-colors ${player.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : ''}`}
                  >
                    <td className="px-6 py-4 text-center flex items-center justify-center">
                      {getRankIcon(player.rank)}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      {player.name}
                      {player.isPremium && (
                        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Pro</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-300 font-medium">{player.accuracy}%</td>
                    <td className="px-6 py-4 text-center text-zinc-400">{player.totalPlayed}</td>
                    <td className="px-6 py-4 text-center text-orange-400 font-bold">{player.longestStreak} 🔥</td>
                    <td className="px-6 py-4 text-right text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 font-black text-lg">
                      {player.totalXP.toLocaleString()}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
