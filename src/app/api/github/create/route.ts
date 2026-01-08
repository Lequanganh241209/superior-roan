import { NextRequest, NextResponse } from "next/server";
import { createRepository } from "@/lib/github/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name;
    const description = body.description || "Created by Orchestrator";
    const isPrivate = body.private !== false; // Default true
    const accessToken = body.accessToken;

    if (!name) {
      return NextResponse.json({ error: "Missing repo name" }, { status: 400 });
    }

    const result = await createRepository({
      name,
      description,
      private: isPrivate,
      accessToken
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
