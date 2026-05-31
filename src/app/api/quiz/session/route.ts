import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "codehub_jwt_secret_cyber_security_key";

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

    const { mode = "Quick", language, limit = 10 } = await req.json();

    // Fetch random questions from the database
    // Note: In production with large datasets, raw query with ORDER BY RANDOM() is better,
    // but for simplicity we fetch all matching or a large chunk and shuffle in memory.
    
    const where: any = {};
    if (language) where.language = language;

    const allMatching = await prisma.quizQuestion.findMany({
      where,
      select: {
        id: true,
        question: true,
        optionsJson: true,
      },
    });

    if (allMatching.length === 0) {
      return NextResponse.json({ error: "No questions found for this language. Generate some first!" }, { status: 404 });
    }

    // Shuffle and pick
    const shuffled = allMatching.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));

    // Create session
    const session = await prisma.quizSession.create({
      data: {
        userId: decoded.userId,
        mode,
      }
    });

    return NextResponse.json({
      sessionId: session.id,
      questions: selected.map(q => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.optionsJson)
      }))
    });

  } catch (e: any) {
    console.error("Create session error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
