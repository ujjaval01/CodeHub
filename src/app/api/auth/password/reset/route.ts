import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "codehub_jwt_secret_cyber_security_key";

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired reset token. Please request a new password reset." }, { status: 400 });
    }

    if (decoded.purpose !== "password_reset" || !decoded.email) {
      return NextResponse.json({ error: "Invalid token purpose." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { email: decoded.email },
      data: { passwordHash },
    });

    // Invalidate old sessions by generating a new token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (e: any) {
    console.error("Password reset error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
