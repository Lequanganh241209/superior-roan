import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const cap = 100;
    if (!url || !key) {
      return NextResponse.json({ allowed: true, reason: "no_service_role" });
    }
    const admin = createClient(url, key);
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    let page = 1;
    let total = 0;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200
      } as any);
      if (error) {
        break;
      }
      const users = (data?.users || []) as any[];
      const monthUsers = users.filter(u => {
        const created = new Date(u.created_at || u.createdAt || 0);
        return created >= start;
      });
      total += monthUsers.length;
      if (users.length < 200 || total >= cap) break;
      page += 1;
    }
    const allowed = total < cap;
    return NextResponse.json({ allowed, usage: total, cap });
  } catch (e: any) {
    return NextResponse.json({ allowed: true, reason: e.message || "error" });
  }
}
