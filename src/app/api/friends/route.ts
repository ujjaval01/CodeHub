import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";

export async function GET(req: NextRequest) {
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

    const friends = await prisma.friendship.findMany({
      where: { userId: decoded.userId },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            xp: true,
            level: true,
            isPremium: true
          }
        }
      }
    });

    return NextResponse.json({
      friends: friends.map(f => f.friend)
    });

  } catch (e: any) {
    console.error("Fetch friends error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const { friendId } = await req.json();

    if (!friendId) {
      return NextResponse.json({ error: "Missing friendId" }, { status: 400 });
    }

    if (friendId === decoded.userId) {
      return NextResponse.json({ error: "Cannot add yourself as friend" }, { status: 400 });
    }

    // Since we're using a simple follower model as default, just create it
    const friendship = await prisma.friendship.upsert({
      where: {
        userId_friendId: {
          userId: decoded.userId,
          friendId: friendId
        }
      },
      update: {},
      create: {
        userId: decoded.userId,
        friendId: friendId
      }
    });

    return NextResponse.json({ success: true, friendship });

  } catch (e: any) {
    console.error("Add friend error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
