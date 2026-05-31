import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "codehub_jwt_secret_cyber_security_key";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, "signup_verify", 10, 15);
    if (!isAllowed) {
      return NextResponse.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
    }

    const { name, email, password, userOtp } = await req.json();

    if (!name || !email || !password || !userOtp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already registered." }, { status: 409 });
    }

    // Find latest valid OTP
    const otpRecord = await prisma.emailOTP.findFirst({
      where: { email, purpose: "signup" },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
    }

    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: "Too many incorrect attempts. Please request a new OTP." }, { status: 400 });
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(userOtp.trim(), otpRecord.otpHash);
    
    if (!isValid) {
      await prisma.emailOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    // Hash user password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in DB and mark as verified
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: new Date(),
        xp: 0,
        level: 1,
        streak: 1,
      },
    });

    // Cleanup OTPs
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "signup" }
    });

    // Create JWT token for persistent login
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      message: "Registration completed successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
      },
    });
  } catch (e: any) {
    console.error("Signup OTP verification error:", e);
    return NextResponse.json({ error: "Internal server error during verification" }, { status: 500 });
  }
}
