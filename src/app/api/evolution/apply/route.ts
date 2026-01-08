import { NextRequest, NextResponse } from "next/server";
import { createEvolutionPR } from "@/lib/github/service";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, repoName, changes, description } = body;

    if (!repoName || !changes || changes.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [owner, repo] = repoName.split("/");
    const branchName = `evolution-${Date.now()}`;
    
    // Create PR via GitHub Service
    const prResult = await createEvolutionPR(
      owner,
      repo,
      branchName,
      "Evolution X: Optimization Proposal",
      description || "Automated optimization by Aether OS Evolution Engine.",
      changes
    );

    if (!prResult.success) {
      return NextResponse.json({ error: prResult.error }, { status: 500 });
    }

    // Log to Evolution History in Supabase
    const { error: dbError } = await supabase
      .from("evolution_history")
      .insert({
        project_id: projectId,
        version: branchName,
        description: description,
        pr_number: prResult.prNumber,
        status: "pending"
      });

    if (dbError) {
        console.error("Failed to log evolution history:", dbError);
        // Don't fail the request, just log error
    }

    return NextResponse.json({ success: true, prUrl: prResult.prUrl });

  } catch (error: any) {
    console.error("Evolution API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
