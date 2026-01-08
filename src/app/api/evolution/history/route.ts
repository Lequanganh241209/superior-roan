import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Octokit } from "@octokit/rest";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoName = searchParams.get("repo");

    if (!repoName) {
      return NextResponse.json({ error: "Missing repo name" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Commits from GitHub
    // Use User's PAT or Admin PAT
    const token = process.env.GITHUB_PAT; 
    const octokit = new Octokit({ auth: token });
    const [owner, repo] = repoName.split("/");

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 20
    });

    const history = commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.author?.date,
      author: c.commit.author?.name
    }));

    return NextResponse.json({ history });

  } catch (error: any) {
    console.error("History API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
