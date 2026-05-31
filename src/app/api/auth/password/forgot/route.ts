import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, "forgot_password_otp", 3, 15); // Max 3 requests per 15 mins
    if (!isAllowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a password reset email has been sent." });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(generatedOtp, 10);

    // Delete existing forgot password OTPs
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "forgot_password" }
    });

    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        purpose: "forgot_password",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    });

    const emailResult = await sendOTPEmail(email, generatedOtp, "forgot_password");
    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
    }

    return NextResponse.json({ message: "If an account exists, a password reset email has been sent." });
  } catch (e: any) {
    console.error("Forgot password OTP generation error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
