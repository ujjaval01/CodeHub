import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { checkRateLimit } from "@/lib/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "codehub_jwt_secret_cyber_security_key";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, "forgot_password_verify", 10, 15);
    if (!isAllowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const otpRecord = await prisma.emailOTP.findFirst({
      where: { email, purpose: "forgot_password" },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "No reset request found. Please request a new code." }, { status: 400 });
    }

    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
    
    if (!isValid) {
      await prisma.emailOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });
      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    }

    // OTP is valid. Issue a temporary token to actually reset the password.
    // This token is valid for 15 minutes.
    const resetToken = jwt.sign(
      { email, purpose: "password_reset" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Cleanup OTPs
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "forgot_password" }
    });

    return NextResponse.json({
      message: "Code verified successfully.",
      resetToken,
    });
  } catch (e: any) {
    console.error("Forgot password verify error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
