const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearRateLimits() {
  console.log("Clearing all rate limit records to unblock testing...");
  const result = await prisma.rateLimit.deleteMany({});
  console.log(`Deleted ${result.count} rate limit records.`);
}

clearRateLimits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
