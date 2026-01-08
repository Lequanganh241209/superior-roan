import { NextRequest, NextResponse } from "next/server";
import { bindCanonicalAlias } from "@/lib/vercel/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").toLowerCase().replace(/\s+/g, "-");
    if (!name) {
      return NextResponse.json({ error: "Missing project name" }, { status: 400 });
    }
    await bindCanonicalAlias(name);
    return NextResponse.json({ success: true, alias: `${name}.vercel.app` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
