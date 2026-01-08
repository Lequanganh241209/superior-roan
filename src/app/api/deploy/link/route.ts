import { NextRequest, NextResponse } from "next/server";
import { linkGitRepository } from "@/lib/vercel/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawName = (body.name || "").toString();
    const name = rawName.toLowerCase().replace(/\s+/g, "-");
    const repo = (body.repo || "").toString();
    const accessToken = body.accessToken || undefined;

    if (!name) {
      return NextResponse.json({ error: "Missing project name" }, { status: 400 });
    }
    if (!repo || !repo.includes("/")) {
      return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
    }

    await linkGitRepository(name, repo, accessToken);

    return NextResponse.json({
      success: true,
      message: "Repository linked. Pushes to main will auto-deploy."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
