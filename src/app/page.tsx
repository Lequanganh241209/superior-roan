"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, Box, Layers, Activity, Cpu, Settings, Github, Zap, GitBranch, LogOut, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectInit } from "@/components/dashboard/ProjectInit";
import { Sandbox } from "@/components/preview/Sandbox";
import { EvolutionDashboard } from "@/components/dashboard/Evolution";
import { DatabaseArchitect } from "@/components/dashboard/DatabaseArchitect";
import { VisualWorkflow } from "@/components/dashboard/VisualWorkflow";
import { SmartBilling } from "@/components/billing/SmartBilling";
import { useProjectStore } from "@/store/project-store";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  repo_name: string;
  deployment_url: string;
  status: string;
}

const OVERRIDES: Record<string, string> = {
  writingtask2: "https://writingtask2-646deiwnu-le-quang-tons-projects.vercel.app"
};
const overrideFor = (p: Project) => {
  const key1 = (p.name || "").toLowerCase();
  const tail = (p.repo_name || "").split("/").pop() || "";
  const key2 = tail.toLowerCase();
  return OVERRIDES[key1] || OVERRIDES[key2] || null;
};
const healPreview = async (p: Project) => {
  const ov = overrideFor(p);
  if (ov) return ov;
  if ((p.deployment_url || "").toLowerCase().includes("writingtask2.vercel.app")) {
    return OVERRIDES.writingtask2;
  }
  try {
    const head = await fetch(p.deployment_url, { method: "HEAD" });
    if (head.ok) return p.deployment_url;
    const refetch = await fetch("/api/projects/list");
    if (refetch.ok) {
      const refreshed = await refetch.json();
      const match =
        refreshed.projects?.find((x: any) => x.repo_name === p.repo_name) ||
        refreshed.projects?.[0];
      if (match?.deployment_url) return match.deployment_url;
    }
  } catch {}
  return p.deployment_url;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("init");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  // Default to true to prevent flash of login screen, but fail open if needed
  const [hasSession, setHasSession] = useState<boolean>(true); 
  
  const { projectName, setProjectDetails, highlightedTab, setHighlightedTab } = useProjectStore();
  const router = useRouter();

  useEffect(() => {
    // FORCE TIMEOUT: Stop loading after 1s no matter what
    const forceTimer = setTimeout(() => setIsLoading(false), 1000);

    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
           setUser(session.user);
           setHasSession(true);
           setIsLoading(false); // Immediate unlock
        } else {
           // Double check - sometimes getSession is stale
           setHasSession(false);
        }

        // Background Data Load - Completely Independent
        if (session) {
            try {
                const res = await fetch('/api/projects/list');
                if (res.ok) {
                    const json = await res.json();
                    const list = json.projects || [];
                    setProjects(list);
                    if (list.length > 0 && !projectName) {
                        setProjectDetails(list[0].repo_name, `https://github.com/${list[0].repo_name}`);
                        try {
                          const fixed = await healPreview(list[0]);
                          useProjectStore.getState().setPreviewUrl(fixed);
                        } catch {}
                    }
                }
            } catch {}
        }
      } catch (err: any) {
         // Ignore AbortError from Supabase client (common during rapid nav/reloads)
         if (err.name === 'AbortError' || err.message?.includes('AbortError')) {
            return;
         }
         console.error("Auth check failed:", err);
         setIsLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
       if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setUser(session?.user);
          setHasSession(true);
          setIsLoading(false);
       } else if (event === "SIGNED_OUT") {
          setHasSession(false);
          setIsLoading(false);
          // Only redirect if explicitly signed out
          if (typeof window !== "undefined") {
             window.location.href = "/login";
          }
       }
    });

    return () => {
       subscription.unsubscribe();
       clearTimeout(forceTimer);
    };
  }, [projectName, setProjectDetails]);

  useEffect(() => {
    setActiveTab(highlightedTab);
  }, [highlightedTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-black text-primary">Loading Neural Core...</div>;
  if (!hasSession) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <a href="/login" className="px-4 py-2 bg-primary text-primary-foreground rounded">Go to Login</a>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border/40 bg-background/95 hidden md:flex flex-col">
        <nav className="flex flex-col gap-1 p-4 flex-1">
          <div className="mb-4 px-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Autonomous Core
            </div>
            {projects.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{projects.length} Projects</span>
            )}
          </div>

          {[
            { id: "init", label: "New Project", icon: Rocket },
            { id: "workflow", label: "Workflow Canvas", icon: GitBranch },
            { id: "database", label: "Visual Architect", icon: Layers },
            { id: "preview", label: "Sandbox Preview", icon: Box },
            { id: "evolution", label: "Evolution X", icon: Activity },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setHighlightedTab(item.id as any); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === item.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}

          {projects.length > 0 && (
            <div className="mt-6 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Your Projects
            </div>
          )}
          <div className="flex-1 overflow-y-auto max-h-[200px] space-y-1">
             {projects.map(p => (
                 <button 
                    key={p.id}
                    onClick={() => {
                        setProjectDetails(p.repo_name, `https://github.com/${p.repo_name}`);
                        (async () => {
                          try {
                            const fixed = await healPreview(p);
                            useProjectStore.getState().setPreviewUrl(fixed);
                          } catch {
                            useProjectStore.getState().setPreviewUrl(p.deployment_url);
                          }
                        })();
                        toast.success(`Switched to ${p.name}`);
                    }}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all w-full truncate",
                        projectName?.includes(p.repo_name) 
                            ? "text-primary bg-primary/5" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                 >
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate">{p.name}</span>
                 </button>
             ))}
          </div>

          <div className="mt-4 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Enterprise
          </div>
          <button 
             onClick={() => setActiveTab('billing')}
             className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all w-full",
                activeTab === 'billing' 
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
             )}
          >
             <Zap className="w-4 h-4" /> Smart Billing
          </button>
          
          <div className="mt-auto pt-4 border-t border-border/40">
             <div className="px-2 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{user?.email}</p>
                    <p className="text-[10px] text-muted-foreground">Architect Level 1</p>
                </div>
                <button onClick={handleLogout} className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors">
                    <LogOut className="w-4 h-4" />
                </button>
             </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-grid-white/[0.02]">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <header className="flex items-center justify-between pb-6 border-b border-border/40">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        {activeTab === 'init' && "Project Initialization"}
                        {activeTab === 'workflow' && "Visual Workflow Canvas"}
                        {activeTab === 'preview' && "Live Sandbox Environment"}
                        {activeTab === 'evolution' && "Evolution Dashboard"}
                        {activeTab === 'database' && "Database Architecture"}
                        {activeTab === 'billing' && "Enterprise Billing"}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Aether OS V2 / Main / {activeTab}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>AI: GPT-4 Turbo</span>
                    </div>
                </div>
            </header>

            <div className="min-h-[500px]">
                {activeTab === "init" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <ProjectInit />
                    </motion.div>
                )}
                
                {activeTab === "workflow" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <VisualWorkflow />
                    </motion.div>
                )}

                {activeTab === "preview" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                        <Sandbox />
                    </motion.div>
                )}

                {activeTab === "evolution" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <EvolutionDashboard />
                    </motion.div>
                )}
                
                {activeTab === "database" && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <DatabaseArchitect />
                     </motion.div>
                )}

                {activeTab === "billing" && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <SmartBilling />
                     </motion.div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}
