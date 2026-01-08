import { NextRequest, NextResponse } from "next/server";
import { parseNaturalLanguageToSQL, parseEntities } from "@/lib/sql-parser";
import { ContextOracle } from "@/lib/oracle/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, projectId } = body as { prompt: string; projectId: string };
    if (!prompt || !projectId) {
      return NextResponse.json({ error: "Missing prompt or projectId" }, { status: 400 });
    }

    const sql = parseNaturalLanguageToSQL(prompt);
    const entities = parseEntities(prompt);

    let existing: any = null;
    try {
      existing = await ContextOracle.getMetadata(projectId);
    } catch {
      existing = null;
    }

    const knownTables: string[] = Array.isArray(existing?.schema_tables) ? existing.schema_tables : [];
    const conflicts = entities.tables.filter(t => knownTables.includes(t));
    const toCreate = entities.tables.filter(t => !knownTables.includes(t));
    const operations = [
      ...conflicts.map(t => ({ table: t, action: "alter" })),
      ...toCreate.map(t => ({ table: t, action: "create" })),
    ];

    const nodes = [
      { id: "n1", label: "User Prompt", x: 120, y: 40, type: "input" },
      { id: "n2", label: "Planning", x: 120, y: 140 },
      { id: "n3", label: "Visual Architect", x: 320, y: 140 },
      { id: "n4", label: "Coding Loop", x: 520, y: 140 },
      { id: "n5", label: "Sync GitHub/Vercel", x: 720, y: 140, type: "output" },
    ];
    const edges = [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
      { id: "e4", source: "n4", target: "n5" },
    ];

    const updatedTables = Array.from(new Set([...knownTables, ...toCreate]));
    await ContextOracle.saveMetadata({
      project_id: projectId,
      name: existing?.name || "project",
      structure: existing?.structure || {},
      dependencies: existing?.dependencies || [],
      env_vars: existing?.env_vars || {},
      schema_tables: updatedTables,
    });

    return NextResponse.json({
      success: true,
      plan: {
        nodes,
        edges,
        sql,
        operations,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
