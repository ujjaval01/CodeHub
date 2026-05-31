require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const count = await prisma.problem.count();
  console.log(`Total problems in database: ${count}`);
  
  const problems = await prisma.problem.findMany({ take: 2 });
  console.log('Sample problems:', problems);
  
  await prisma.$disconnect();
}

main().catch(console.error);
