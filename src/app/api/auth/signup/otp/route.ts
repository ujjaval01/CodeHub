import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    console.log("[Signup Phase 1] Starting OTP generation process...");
    const ip = req.ip || req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const isAllowed = await checkRateLimit(ip, "signup_otp", 10, 15); // Max 10 requests per 15 minutes for testing
    if (!isAllowed) {
      console.warn(`[Signup Phase 1] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { name, email, password } = await req.json();
    console.log(`[Signup Phase 1] Received request for email: ${email}`);

    if (!name || !email || !password) {
      console.warn("[Signup Phase 1] Missing required fields");
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
      console.warn(`[Signup Phase 1] User already exists: ${email}`);
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }

    // Generate random 6-digit OTP
    console.log(`[Signup Phase 1] Generating OTP for ${email}...`);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(generatedOtp, 10);

    // Expire any existing OTPs for this email/purpose
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "signup" }
    });

    // Store OTP in database
    console.log(`[Signup Phase 1] Storing OTP hash in database for ${email}...`);
    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        purpose: "signup",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    });

    // Send Email
    console.log(`[Signup Phase 1] Invoking sendOTPEmail for ${email}...`);
    const emailResult = await sendOTPEmail(email, generatedOtp, "signup");
    
    if (!emailResult.success) {
      console.error(`[Signup Phase 1] Email delivery failed for ${email}:`, emailResult.error);
      
      const errorMessage = (emailResult.error as any)?.message || "Failed to send OTP email. Please try again.";
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: emailResult.error 
      }, { status: 500 });
    }

    console.log(`[Signup Phase 1] OTP successfully sent to ${email}`);
    return NextResponse.json({
      message: "Verification code sent to email.",
      email: email,
    });
  } catch (e: any) {
    console.error("Signup OTP generation error:", e);
    return NextResponse.json({ error: "Internal server error during registration" }, { status: 500 });
  }
}
