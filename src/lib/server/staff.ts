import { connection } from "next/server";
import type { Employee } from "@/lib/types";
import { db, dbEnabled, ensureSchema } from "./db";

/** What a scanned staff QR code may show: never phone, salary or notes. */
export interface StaffCheck {
  name: string;
  role: string;
  joined: string;
  active: boolean;
}

/** The staff member with this verification code, or null (also when there is no database). */
export async function findStaff(code: string): Promise<StaffCheck | null> {
  await connection();
  if (!dbEnabled() || !/^[a-z0-9]{8,40}$/.test(code)) return null;
  try {
    await ensureSchema();
    const [row] = await db()<{ data: Employee }[]>`select data from gr_docs where kind = 'employee' and data->>'code' = ${code}`;
    if (!row || !row.data.name.trim()) return null;
    const e = row.data;
    return { name: e.name.trim(), role: e.role.trim(), joined: e.joined, active: e.active !== false };
  } catch (err) {
    console.error("staff verification failed", err);
    return null;
  }
}
