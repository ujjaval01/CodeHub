"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Swords, Timer, Loader2 } from "lucide-react";

export function BattleRoom({ roomId }: { roomId: string }) {
  const [opponentScore, setOpponentScore] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  // In a real implementation with Supabase Realtime or Pusher:
  // useEffect(() => {
  //   const channel = supabase.channel(`room:${roomId}`);
  //   channel.on('broadcast', { event: 'score_update' }, payload => {
  //     setOpponentScore(payload.score);
  //   }).subscribe();
  // }, []);

  return (
    <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-4xl mx-auto w-full flex flex-col items-center">
      <h2 className="text-2xl font-black text-rose-400 flex items-center gap-2 mb-8">
        <Swords className="w-8 h-8" />
        Battle Room: {roomId}
      </h2>

      <div className="flex items-center justify-between w-full mb-12 px-10">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
             <span className="text-3xl font-black text-blue-400">{myScore}</span>
          </div>
          <p className="font-bold text-white">You</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white/10 border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 animate-pulse mb-2">
            <Timer className="w-5 h-5 text-amber-400" />
            <span className="font-black text-xl text-amber-400">{timeLeft}s</span>
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">First to 10 wins</span>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
             <span className="text-3xl font-black text-rose-400">{opponentScore}</span>
          </div>
          <p className="font-bold text-white">Opponent</p>
        </div>
      </div>

      <div className="w-full text-center p-10 bg-black/40 rounded-2xl border border-white/5">
        <Loader2 className="w-10 h-10 animate-spin text-white/20 mx-auto mb-4" />
        <p className="text-zinc-400 font-medium">Waiting for opponent to connect...</p>
      </div>
    </div>
  );
}
