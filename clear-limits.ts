import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearRateLimits() {
  console.log("Clearing all rate limit records to unblock testing...");
  const result = await prisma.rateLimit.deleteMany({});
  console.log(`Deleted ${result.count} rate limit records.`);
}

clearRateLimits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
