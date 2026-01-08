import { NextRequest, NextResponse } from "next/server";
import { createDeployment, setProjectEnv } from "@/lib/vercel/service";
import { ContextOracle } from "@/lib/oracle/service";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, repoId, repoName, files, useWorkspace, accessToken } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const workspaceFiles: { path: string; content: string }[] = [];
    if (!files && useWorkspace) {
      const base = process.cwd();
      const includeExt = new Set([".js", ".ts", ".tsx", ".json", ".css", ".md", ".sql", ".svg"]);
      const ignoreDirs = new Set(["node_modules", ".next", ".git", ".vercel"]);
      const ignoreFiles = [/^\.env/i, /^\.DS_Store$/i];
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (ignoreDirs.has(e.name)) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            walk(full);
          } else {
            if (ignoreFiles.some(rx => rx.test(e.name))) continue;
            const ext = path.extname(e.name).toLowerCase();
            if (!includeExt.has(ext)) continue;
            const rel = path.relative(base, full).replace(/\\/g, "/");
            const content = fs.readFileSync(full, "utf-8");
            workspaceFiles.push({ path: rel, content });
          }
        }
      };
      walk(base);
    }

    const deployResult = await createDeployment({
      name: name.toLowerCase().replace(/\s+/g, "-"),
      repoId,
      repoName,
      files: files || workspaceFiles,
      accessToken
    });

    if (!deployResult.success) {
      return NextResponse.json(
        { error: deployResult.error },
        { status: 500 }
      );
    }
    
    try {
      const envs: Record<string, string> = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ""
      };
      await setProjectEnv((deployResult as any).projectName || name.toLowerCase().replace(/\s+/g, "-"), envs, accessToken);
    } catch {}

    // V2 Upgrade: Save Metadata to Context Oracle
    // In a real scenario, we would parse the actual project structure here.
    // For now, we initialize with a default template structure.
    try {
        await ContextOracle.saveMetadata({
            project_id: deployResult.projectId || (repoId ? repoId.toString() : name.toLowerCase().replace(/\s+/g, "-")),
            name: name,
            structure: { 
                "src": ["app", "components", "lib"],
                "public": ["assets"]
            },
            dependencies: ["next", "react", "tailwindcss", "framer-motion"],
            env_vars: { "NEXT_PUBLIC_API_URL": "Pending" }
        });
    } catch (oracleError) {
        console.warn("Oracle Metadata Save Failed (Non-critical):", oracleError);
        // Continue execution, do not fail deployment
    }

    return NextResponse.json({
      success: true,
      deployUrl: (deployResult as any).deployUrl,
      dashboardUrl: (deployResult as any).dashboardUrl,
      projectId: (deployResult as any).projectId,
      projectName: (deployResult as any).projectName
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
