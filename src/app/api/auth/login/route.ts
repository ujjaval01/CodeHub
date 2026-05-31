import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "codehub_jwt_secret_cyber_security_key";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, "login", 5, 15); // 5 failed attempts per 15 min
    if (!isAllowed) {
      return NextResponse.json({ error: "Too many failed login attempts. Please try again later." }, { status: 429 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before logging in. If you signed up before email verification was required, please contact support." }, { status: 403 });
    }

    // Update lastActive and streak if needed
    const now = new Date();
    const lastActive = new Date(user.lastActive);
    const timeDiff = now.getTime() - lastActive.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    let newStreak = user.streak;
    if (dayDiff === 1) {
      newStreak += 1;
    } else if (dayDiff > 1) {
      newStreak = 1; // reset streak
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActive: now,
        streak: newStreak,
      },
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: newStreak,
        isPremium: user.isPremium,
      },
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Internal server error during login" }, { status: 500 });
  }
}
