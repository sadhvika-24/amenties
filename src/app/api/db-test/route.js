
import { NextResponse } from "next/server";
import { getMasterPool } from "../../../lib/db.js";

export async function GET() {
  try {
    const pool = getMasterPool();

    const result = await pool.query(`
      SELECT current_database() AS database_name,
             EXISTS (
               SELECT 1
               FROM information_schema.tables
               WHERE table_schema = 'public'
                 AND table_name = 'master_user'
             ) AS master_user_exists
    `);

    return NextResponse.json({
      success: true,
      message: "Master database connected successfully",
      ...result.rows[0],
    });
  } catch (error) {
    console.error("Master database test failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Database connection failed" },
      { status: 500 }
    );
  }
}
