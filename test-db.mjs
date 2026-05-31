import { Pool } from 'pg';

const url = "postgresql://postgres.izehyddpmvtyugumbcml:Cking%40904522@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function test() {
  console.log("Testing connection...");
  try {
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log("Success:", res.rows);
    client.release();
  } catch (e) {
    console.error("Connection failed:", e);
  }
}

test();
