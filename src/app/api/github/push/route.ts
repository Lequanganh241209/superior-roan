import { NextRequest, NextResponse } from "next/server";
import { pushFilesToRepo } from "@/lib/github/service";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repo = (body.repo || "").toString(); // owner/name
    const accessToken = body.accessToken || undefined;
    const message = body.message || "Automated commit by Orchestrator";
    if (!repo || !repo.includes("/")) {
      return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
    }
    const [owner, name] = repo.split("/");

    const base = process.cwd();
    const includeExt = new Set([".js", ".ts", ".tsx", ".json", ".css", ".md", ".sql", ".svg"]);
    const ignoreDirs = new Set(["node_modules", ".next", ".git", ".vercel"]);
    const ignoreFiles = [/^\.env/i, /^\.DS_Store$/i];
    const files: { path: string; content: string }[] = [];
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
          files.push({ path: rel, content });
        }
      }
    };
    walk(base);

    const result = await pushFilesToRepo(owner, name, message, files, accessToken);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, sha: result.sha });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
