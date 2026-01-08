import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revertCommit } from "@/lib/github/service";

export async function POST(req: NextRequest) {
  try {
    const { repoName, sha } = await req.json();

    if (!repoName || !sha) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [owner, repo] = repoName.split("/");

    // 2. Perform Rollback
    // Use User's PAT or Admin PAT fallback inside service
    const result = await revertCommit(owner, repo, sha);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, newSha: result.sha });

  } catch (error: any) {
    console.error("Rollback API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
