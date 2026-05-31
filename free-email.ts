import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function freeUpEmail() {
  const targetEmail = "sainiujvl@gmail.com";
  const newEmail = "sainiujvl_admin_backup@gmail.com";
  
  console.log(`Checking if user exists with email: ${targetEmail}`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail }
  });

  if (user) {
    console.log(`User found. Renaming email to ${newEmail} to free up the address for testing...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail }
    });
    console.log("Email successfully freed! You can now sign up using the original email.");
  } else {
    console.log("User does not exist. The email is already free to use.");
  }
}

freeUpEmail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
