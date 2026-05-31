import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    console.log("[Forgot Password Phase 1] Starting OTP generation process...");
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const isAllowed = await checkRateLimit(ip, "forgot_password", 10, 15); // Max 10 requests per 15 mins
    
    if (!isAllowed) {
      console.warn(`[Forgot Password Phase 1] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = await req.json();
    console.log(`[Forgot Password Phase 1] Received request for email: ${email}`);

    if (!email) {
      console.warn("[Forgot Password Phase 1] Missing email field");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      console.warn(`[Forgot Password Phase 1] User not found for email: ${email}. Returning fake success.`);
      return NextResponse.json({ message: "If an account exists, a recovery code has been sent." });
    }

    // Generate random 6-digit OTP
    console.log(`[Forgot Password Phase 1] Generating OTP for ${email}...`);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(generatedOtp, 10);

    // Delete existing forgot password OTPs
    await prisma.emailOTP.deleteMany({
      where: { email, purpose: "forgot_password" }
    });

    // Store OTP in database
    console.log(`[Forgot Password Phase 1] Storing OTP hash in database for ${email}...`);
    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        purpose: "forgot_password",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }
    });

    // Send Email
    console.log(`[Forgot Password Phase 1] Invoking sendOTPEmail for ${email}...`);
    const emailResult = await sendOTPEmail(email, generatedOtp, "forgot_password");
    
    if (!emailResult.success) {
      console.error(`[Forgot Password Phase 1] Email delivery failed for ${email}:`, emailResult.error);
      
      const errorMessage = (emailResult.error as any)?.message || "Failed to send recovery email. Please try again.";

      return NextResponse.json({ 
        error: errorMessage,
        details: emailResult.error 
      }, { status: 500 });
    }

    console.log(`[Forgot Password Phase 1] OTP successfully sent to ${email}`);
    return NextResponse.json({ message: "If an account exists, a recovery code has been sent." });
  } catch (e: any) {
    console.error("[Forgot Password Phase 1] Unexpected Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
