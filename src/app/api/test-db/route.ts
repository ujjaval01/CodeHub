import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL is not set!" }, { status: 500 });
    }

    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();

    return NextResponse.json({ 
      success: true, 
      time: res.rows[0],
      dbUrlLength: dbUrl.length,
      hasQuotes: dbUrl.includes('"') || dbUrl.includes("'"),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    }, { status: 500 });
  }
}
