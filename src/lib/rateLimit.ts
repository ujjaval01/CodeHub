import { prisma } from "./prisma";

export async function checkRateLimit(ip: string, action: string, limit: number, windowMinutes: number): Promise<boolean> {
  const now = new Date();
  
  // Cleanup expired rate limits first (optional, but good for DB health)
  await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: now } }
  });

  const record = await prisma.rateLimit.findUnique({
    where: {
      ip_action: {
        ip,
        action
      }
    }
  });

  if (!record) {
    // First attempt
    await prisma.rateLimit.create({
      data: {
        ip,
        action,
        count: 1,
        expiresAt: new Date(now.getTime() + windowMinutes * 60 * 1000)
      }
    });
    return true; // Allowed
  }

  if (record.expiresAt < now) {
    // Expired, reset
    await prisma.rateLimit.update({
      where: { id: record.id },
      data: {
        count: 1,
        expiresAt: new Date(now.getTime() + windowMinutes * 60 * 1000)
      }
    });
    return true; // Allowed
  }

  if (record.count >= limit) {
    return false; // Rate limit exceeded
  }

  // Increment count
  await prisma.rateLimit.update({
    where: { id: record.id },
    data: { count: { increment: 1 } }
  });

  return true; // Allowed
}
