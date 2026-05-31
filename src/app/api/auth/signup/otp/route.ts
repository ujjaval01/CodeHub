import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, "signup_otp", 3, 15); // Max 3 requests per 15 minutes
    if (!isAllowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(generatedOtp, 10);

    // Expire any existing OTPs for this email/purpose
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "signup" }
    });

    // Store OTP in database
    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        purpose: "signup",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    });

    // Send Email
    const emailResult = await sendOTPEmail(email, generatedOtp, "signup");
    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send OTP email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Verification code sent to email.",
      email: email,
    });
  } catch (e: any) {
    console.error("Signup OTP generation error:", e);
    return NextResponse.json({ error: "Internal server error during registration" }, { status: 500 });
  }
}
