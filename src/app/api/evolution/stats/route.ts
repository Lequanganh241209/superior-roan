import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const repo = searchParams.get("repo");

    // 1. Live Check (if url provided)
    let liveStatus = "unknown";
    let latency = 0;
    let health = 100;

    if (url) {
        const start = Date.now();
        try {
            const res = await fetch(url, { 
                method: "GET", 
                headers: { "User-Agent": "Aether-OS-Evolution" },
                signal: AbortSignal.timeout(5000) // 5s timeout
            });
            latency = Date.now() - start;
            liveStatus = `${res.status} ${res.statusText}`;
            if (!res.ok) health -= 20;
        } catch (e: any) {
            latency = Date.now() - start;
            liveStatus = "error";
            health -= 40;
        }
    }

    // Adjust health based on latency
    if (latency > 500) health -= 10;
    if (latency > 1000) health -= 20;
    if (latency > 2000) health -= 30;
    if (health < 0) health = 0;


    // 2. DB Stats (if repo provided)
    let evolutionStats = { total: 0, pending: 0, last_active: null };
    const proposals: any[] = [];

    if (repo) {
        const supabase = createClient();
        
        // Find project first
        const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('repo_name', repo)
            .single();

        if (project) {
            const { data: history, error } = await supabase
                .from('evolution_history')
                .select('status, created_at, description')
                .eq('project_id', project.id)
                .order('created_at', { ascending: false })
                .limit(10); // Check last 10

            if (history && history.length > 0) {
                evolutionStats.total = history.length;
                evolutionStats.pending = history.filter((h: any) => h.status === 'pending').length;
                evolutionStats.last_active = history[0].created_at;

                // Create proposals from pending items
                history.filter((h: any) => h.status === 'pending').forEach((h: any) => {
                    proposals.push({
                        type: 'scale',
                        title: 'Pending Evolution',
                        desc: h.description || 'System optimization pending review.'
                    });
                });
            }
        }
    }

    // Default proposals if empty
    if (proposals.length === 0) {
        if (liveStatus === "error" || liveStatus.startsWith("5")) {
             proposals.push({
                type: "performance",
                title: "Critical Health Check",
                desc: `Service is unreachable (${liveStatus}). Immediate investigation required.`
            });
        } else if (latency > 300) {
            proposals.push({
                type: "performance",
                title: "Latency Optimization",
                desc: `Response time ${latency}ms is suboptimal. Consider caching strategy.`
            });
        } else {
             proposals.push({
                type: "ux",
                title: "System Optimized",
                desc: "Performance is optimal. Ready for traffic scaling."
            });
        }
    }

    return NextResponse.json({
      health: health.toFixed(1),
      latency,
      status: liveStatus,
      proposals: proposals.slice(0, 3), // Limit to 3
      evolution: evolutionStats
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
