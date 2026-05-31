import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const stats = await prisma.userQuizStat.findMany({
      orderBy: {
        totalXP: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isPremium: true
          }
        }
      },
      take: limit,
      skip,
    });

    const formattedStats = stats.map((stat, index) => ({
      rank: skip + index + 1,
      userId: stat.user.id,
      name: stat.user.name,
      isPremium: stat.user.isPremium,
      totalXP: stat.totalXP,
      accuracy: stat.accuracy.toFixed(1),
      totalPlayed: stat.totalPlayed,
      longestStreak: stat.longestStreak
    }));

    return NextResponse.json({
      leaderboard: formattedStats
    });

  } catch (e: any) {
    console.error("Fetch quiz leaderboard error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
