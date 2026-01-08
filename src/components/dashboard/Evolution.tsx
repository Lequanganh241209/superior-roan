"use client";

import { useState, useEffect } from "react";
import { Activity, Zap, MousePointer2, Server, ArrowUpRight, AlertTriangle, History, RotateCcw, GitCommit } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { toast } from "sonner";

export function EvolutionDashboard() {
  const { previewUrl, repoUrl } = useProjectStore();
  const [stats, setStats] = useState<any>({
      health: "99.0",
      latency: 0,
      status: "unknown",
      proposals: []
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchStats = async () => {
        try {
            let q = "";
            if (previewUrl) q += `?url=${encodeURIComponent(previewUrl)}`;
            
            if (repoUrl) {
                const parts = repoUrl.replace("https://github.com/", "").split("/");
                const repoName = `${parts[0]}/${parts[1]}`;
                q += `${q ? '&' : '?'}repo=${encodeURIComponent(repoName)}`;
            }

            const res = await fetch('/api/evolution/stats' + q, { signal: controller.signal });
            if (!res.ok) return;
            const data = await res.json();
            setStats(data);
            setLoading(false);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Failed to fetch evolution stats", err);
            }
        }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Live update every 5s
    
    return () => {
        controller.abort();
        clearInterval(interval);
    };
  }, [previewUrl, repoUrl]);

  useEffect(() => {
      const fetchHistory = async () => {
          if (!repoUrl) return;
          try {
              setLoadingHistory(true);
              // Extract repo name from URL (e.g., https://github.com/owner/repo)
              const parts = repoUrl.replace("https://github.com/", "").split("/");
              const repoName = `${parts[0]}/${parts[1]}`;
              
              const res = await fetch(`/api/evolution/history?repo=${encodeURIComponent(repoName)}`);
              if (res.ok) {
                  const data = await res.json();
                  setHistory(data.history || []);
              }
          } catch (e) {
              console.error("Failed to fetch history", e);
          } finally {
              setLoadingHistory(false);
          }
      };
      fetchHistory();
  }, [repoUrl]);

  const handleRollback = async (sha: string) => {
      if (!confirm("Are you sure you want to rollback to this version? This will create a new commit reverting changes.")) return;
      
      try {
          setIsRollingBack(true);
          const parts = repoUrl!.replace("https://github.com/", "").split("/");
          const repoName = `${parts[0]}/${parts[1]}`;

          const res = await fetch('/api/evolution/rollback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repoName, sha })
          });

          if (!res.ok) throw new Error("Rollback failed");
          
          toast.success("Rollback initiated successfully. Deploying...");
          // Refresh history
          const histRes = await fetch(`/api/evolution/history?repo=${encodeURIComponent(repoName)}`);
          if (histRes.ok) {
              const data = await histRes.json();
              setHistory(data.history || []);
          }

      } catch (e: any) {
          toast.error(e.message || "Rollback failed");
      } finally {
          setIsRollingBack(false);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-xs font-mono text-green-500">LIVE ANALYTICS FEED</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
                Region: sin1 (Singapore)
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                    Health Score
                    <Activity className="w-3 h-3" />
                </h3>
                <div className="text-2xl font-bold text-green-500">{stats.health}%</div>
                <div className="mt-2 h-1 w-full bg-muted overflow-hidden rounded-full">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.health}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-green-500" 
                    />
                </div>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                    System Status
                    <Zap className="w-3 h-3" />
                </h3>
                <div className={cn("text-2xl font-bold", 
                    stats.evolution?.pending > 0 ? "text-yellow-500" : "text-primary"
                )}>
                    {stats.evolution?.pending > 0 ? "Evolving" : (stats.status === "error" ? "Error" : "Active")}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <ArrowUpRight className="w-3 h-3" /> 
                    {stats.evolution?.total ? `${stats.evolution.total} Evolutions Logged` : "Live Monitor"}
                </div>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                    System Latency
                    <Server className="w-3 h-3" />
                </h3>
                <div className={cn("text-2xl font-bold transition-colors", 
                    stats.latency < 100 ? "text-blue-500" : "text-yellow-500"
                )}>
                    {stats.latency}ms
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    Global Edge Network
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-accent mb-4">
                    <Activity className="w-5 h-5" /> Autonomous Evolution Engine
                </h2>
                <div className="grid grid-cols-1 gap-6">
                    <div className="aspect-video rounded-md bg-zinc-900/50 border border-border/50 relative overflow-hidden group">
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="text-xs text-muted-foreground font-mono bg-black/50 px-2 py-1 rounded backdrop-blur">Heatmap Visualization</span>
                        </div>
                        <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                        <div className="absolute bottom-1/3 right-1/3 w-32 h-32 bg-blue-500/10 blur-xl rounded-full animate-pulse delay-75" />
                        <div className="absolute inset-0 bg-grid-white/[0.02]" />
                    </div>
                    
                    <div className="space-y-3">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            Evolutionary Proposals
                        </h3>
                        
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {stats.proposals.map((prop: any, idx: number) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 rounded-md border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 rounded bg-accent/20 text-accent mt-0.5 group-hover:scale-110 transition-transform">
                                            {prop.type === 'performance' ? <Server className="w-3 h-3" /> : 
                                            prop.type === 'scale' ? <AlertTriangle className="w-3 h-3" /> :
                                            <MousePointer2 className="w-3 h-3" />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground">{prop.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {prop.desc}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-primary mb-4">
                    <History className="w-5 h-5" /> Version History
                </h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingHistory ? (
                        <div className="text-sm text-muted-foreground animate-pulse">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No history available yet.</div>
                    ) : (
                        history.map((commit: any, idx: number) => (
                            <div key={commit.sha} className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-background/30 hover:bg-background/50 transition-colors">
                                <div className="mt-1">
                                    <GitCommit className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate">{commit.message}</p>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {new Date(commit.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="text-xs text-muted-foreground font-mono">
                                            {commit.sha.substring(0, 7)} • {commit.author}
                                        </div>
                                        {idx > 0 && (
                                            <button 
                                                onClick={() => handleRollback(commit.sha)}
                                                disabled={isRollingBack}
                                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Restore
                                            </button>
                                        )}
                                        {idx === 0 && (
                                            <span className="text-xs text-green-500 font-medium px-2 py-0.5 bg-green-500/10 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
