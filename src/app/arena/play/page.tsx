"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Timer, Award, Loader2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

interface Question {
  id: string;
  question: string;
  options: string[];
}

function PlayArenaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "Quick";
  const lang = searchParams.get("lang") || "JavaScript";

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const [feedback, setFeedback] = useState<{isCorrect: boolean, correctIdx: number, exp: string | null} | null>(null);

  useEffect(() => {
    // Start session
    const initSession = async () => {
      try {
        const res = await fetch("/api/quiz/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({ mode, language: lang })
        });
        const data = await res.json();
        if (res.ok) {
          setSession(data.sessionId);
          setQuestions(data.questions);
        } else {
          alert(data.error || "Failed to start quiz");
          router.push("/arena");
        }
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [mode, lang, router]);

  useEffect(() => {
    if (loading || gameOver || feedback) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, gameOver, feedback]);

  const handleTimeUp = () => {
    if (mode === "Survival") {
      setGameOver(true);
    } else {
      // Auto submit wrong answer or just move next
      handleSubmit(null);
    }
  };

  const handleSubmit = async (ansIdx: number | null) => {
    if (isSubmitting || feedback) return;
    setIsSubmitting(true);
    
    try {
      const q = questions[currentIndex];
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          sessionId: session,
          questionId: q.id,
          selectedAnswer: ansIdx,
          timeTaken: (60 - timeLeft) * 1000
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setFeedback({ isCorrect: data.isCorrect, correctIdx: data.correctAnswer, exp: data.explanation });
        if (data.isCorrect) {
          setScore(s => s + data.xpEarned);
          if (data.xpEarned > 15) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
          }
        } else if (mode === "Survival") {
          setTimeout(() => setGameOver(true), 2000);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setSelectedOption(null);
    if (currentIndex + 1 >= questions.length) {
      setGameOver(true);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    } else {
      setCurrentIndex(i => i + 1);
      setTimeLeft(60); // Reset timer per question
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-10 rounded-3xl max-w-md w-full text-center border border-white/10 relative overflow-hidden">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-fuchsia-500/20 to-transparent pointer-events-none" />
           <Award className="w-20 h-20 text-fuchsia-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(232,121,249,0.5)]" />
           <h2 className="text-3xl font-black text-white mb-2">Quiz Completed!</h2>
           <p className="text-zinc-400 mb-8">You've completed the {mode} challenge.</p>
           
           <div className="bg-black/40 rounded-2xl p-6 mb-8 border border-white/5">
             <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Total XP Earned</p>
             <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
               +{score}
             </p>
           </div>
           
           <div className="flex gap-4">
             <button onClick={() => router.push('/arena')} className="flex-1 bg-white/5 border border-white/10 py-3 rounded-xl font-bold hover:bg-white/10 transition">
               Home
             </button>
             <button onClick={() => router.push('/arena/leaderboard')} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold transition shadow-[0_0_15px_rgba(139,92,246,0.3)]">
               Leaderboard
             </button>
           </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-10 min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase">Question</span>
            <span className="text-sm font-black text-white">{currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase">Score</span>
            <span className="text-sm font-black text-fuchsia-400">{score} XP</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold ${timeLeft <= 10 ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'}`}>
          <Timer className="w-5 h-5" />
          {timeLeft}s
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-10 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col"
        >
          <div className="glass-panel p-8 rounded-3xl border border-white/10 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
              {currentQ?.question}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {currentQ?.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              let btnClass = "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20";
              
              if (feedback) {
                if (idx === feedback.correctIdx) {
                  btnClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                } else if (isSelected && idx !== feedback.correctIdx) {
                  btnClass = "bg-rose-500/20 border-rose-500/50 text-rose-100";
                } else {
                  btnClass = "bg-black/40 border-white/5 text-zinc-600 opacity-50";
                }
              } else if (isSelected) {
                btnClass = "bg-violet-500/20 border-violet-500/50 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.2)]";
              }

              return (
                <button
                  key={idx}
                  disabled={!!feedback || isSubmitting}
                  onClick={() => { setSelectedOption(idx); handleSubmit(idx); }}
                  className={`p-6 rounded-2xl border-2 text-left font-medium transition-all duration-300 flex items-center justify-between ${btnClass}`}
                >
                  <span className="text-lg">{opt}</span>
                  {feedback && idx === feedback.correctIdx && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                  {feedback && isSelected && idx !== feedback.correctIdx && <XCircle className="w-6 h-6 text-rose-400" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Explanation & Next */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 p-6 rounded-2xl border ${feedback.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} flex flex-col md:flex-row items-center justify-between gap-6`}
          >
            <div className="flex-1">
              <h4 className={`text-lg font-black mb-1 ${feedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {feedback.isCorrect ? "Correct! Well done." : "Incorrect."}
              </h4>
              {feedback.exp && <p className="text-sm text-zinc-300">{feedback.exp}</p>}
            </div>
            
            <button 
              onClick={nextQuestion}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition shrink-0"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlayArena() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>}>
      <PlayArenaContent />
    </Suspense>
  );
}
