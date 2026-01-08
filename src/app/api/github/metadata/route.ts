import { NextResponse } from "next/server";
import { pushFilesToRepo } from "@/lib/github/service";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { repoName, accessToken, metadata } = await req.json();
    if (!repoName || !metadata) {
      return NextResponse.json({ error: "Missing repoName or metadata" }, { status: 400 });
    }

    const [owner, repo] = String(repoName).split("/");
    const files = [
      {
        path: ".aether/project.json",
        content: JSON.stringify(metadata, null, 2),
      },
    ];

    const result = await pushFilesToRepo(
      owner,
      repo,
      "Add Aether project metadata",
      files,
      accessToken
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Github Metadata Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

