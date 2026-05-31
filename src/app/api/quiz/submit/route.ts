import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { sessionId, questionId, selectedAnswer, timeTaken } = await req.json();

    if (!sessionId || !questionId || selectedAnswer === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify session
    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 403 });
    }

    // Verify question
    const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = selectedAnswer === question.correctAnswer;
    const xpReward = isCorrect ? question.xpReward : 0;

    // Record attempt
    await prisma.quizAttempt.create({
      data: {
        userId: decoded.userId,
        questionId: question.id,
        sessionId: session.id,
        selectedAnswer,
        isCorrect,
        timeTaken: timeTaken || 0
      }
    });

    // Update session score
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        score: { increment: isCorrect ? 1 : 0 },
        xpEarned: { increment: xpReward }
      }
    });

    // Update user stats
    await prisma.$transaction(async (tx) => {
      let stats = await tx.userQuizStat.findUnique({ where: { userId: decoded.userId } });
      if (!stats) {
        stats = await tx.userQuizStat.create({
          data: { userId: decoded.userId }
        });
      }

      const totalPlayed = stats.totalPlayed + 1;
      const totalCorrect = stats.totalCorrect + (isCorrect ? 1 : 0);
      const accuracy = (totalCorrect / totalPlayed) * 100;
      
      let streak = stats.currentStreak;
      if (isCorrect) streak += 1;
      else streak = 0;

      await tx.userQuizStat.update({
        where: { userId: decoded.userId },
        data: {
          totalPlayed,
          totalCorrect,
          totalWrong: stats.totalWrong + (isCorrect ? 0 : 1),
          accuracy,
          currentStreak: streak,
          longestStreak: Math.max(stats.longestStreak, streak),
          totalXP: { increment: xpReward }
        }
      });

      // Update global User XP
      if (xpReward > 0) {
        await tx.user.update({
          where: { id: decoded.userId },
          data: { xp: { increment: xpReward } }
        });
      }
    });

    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      xpEarned: xpReward
    });

  } catch (e: any) {
    console.error("Submit quiz answer error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
