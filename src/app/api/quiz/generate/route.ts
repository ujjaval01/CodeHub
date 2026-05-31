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

    const { language, category, difficulty, count = 5 } = await req.json();

    if (!language || !category || !difficulty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Generate a JSON array containing ${count} multiple-choice programming questions for the language "${language}", topic "${category}", and difficulty "${difficulty}". 
The output MUST be raw JSON without any markdown formatting, following exactly this schema:
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0, // integer index of the correct option
    "explanation": "Brief explanation of why this is correct."
  }
]`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!aiRes.ok) {
      console.error("AI API Error:", await aiRes.text());
      return NextResponse.json({ error: "Failed to generate questions from AI" }, { status: 500 });
    }

    const aiData = await aiRes.json();
    let questionsText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!questionsText) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const parsedQuestions = JSON.parse(questionsText);

    // Save to database
    const savedQuestions = await Promise.all(
      parsedQuestions.map((q: any) => 
        prisma.quizQuestion.create({
          data: {
            language,
            category,
            difficulty,
            question: q.question,
            optionsJson: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            xpReward: difficulty.toLowerCase() === 'hard' ? 30 : difficulty.toLowerCase() === 'medium' ? 20 : 10
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: savedQuestions.length,
      questions: savedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.optionsJson)
      }))
    });

  } catch (e: any) {
    console.error("AI Quiz Generate error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
