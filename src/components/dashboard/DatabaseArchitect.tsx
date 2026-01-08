"use client";

import { useState, useEffect } from "react";
import { Layers, ArrowRight, Code, Database, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { parseNaturalLanguageToSQL } from "@/lib/sql-parser";
import { useProjectStore } from "@/store/project-store";

export function DatabaseArchitect() {
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState<string | null>(null);
  const { generatedSQL: globalSQL, setGeneratedSQL: setGlobalSQL } = useProjectStore();

  useEffect(() => {
    if (globalSQL) {
      setGeneratedSQL(globalSQL);
    }
  }, [globalSQL]);

  const handleSQLChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSQL = e.target.value;
      setGeneratedSQL(newSQL);
      setGlobalSQL(newSQL); // Sync to global store
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsGenerating(true);
    
    // Call the AI Architect API
    try {
        const response = await fetch('/api/ai/architect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input }),
        });
        
        const data = await response.json();
        
        if (data.sql) {
            setGeneratedSQL(data.sql);
            // Also sync to global store so other components can see it
            useProjectStore.getState().setGeneratedSQL(data.sql);
            if (data.nodes && data.edges) {
                 useProjectStore.getState().setWorkflow({ nodes: data.nodes, edges: data.edges });
            }
        }
    } catch (error) {
        // Silently fail or show toast
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Input Panel */}
        <div className="flex flex-col space-y-4 p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-accent">
                <Database className="w-5 h-5" /> Natural Language Architect
            </h2>
            <p className="text-muted-foreground text-sm">
                Describe your data model in plain English. Aether will generate the optimal Supabase Schema and SQL Migrations.
            </p>
            
            <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-background/50 border border-input rounded-md p-4 text-sm focus:ring-1 focus:ring-accent outline-none resize-none font-mono leading-relaxed"
                placeholder="e.g. A marketplace with Users, Products, and Orders. Users can buy products..."
            />
            
            <button 
                onClick={handleGenerate}
                disabled={isGenerating || !input.trim()}
                className="w-full py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
                {isGenerating ? <Wand2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isGenerating ? "Architecting Schema..." : "Generate Schema"}
            </button>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col border border-border/50 rounded-lg bg-zinc-950 overflow-hidden relative">
            <div className="h-10 border-b border-border/50 bg-muted/20 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Code className="w-4 h-4" />
                    generated_migration.sql
                </div>
                {generatedSQL && (
                    <span className="text-[10px] text-green-500 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        Valid SQL
                    </span>
                )}
            </div>
            
            <div className="flex-1 p-0 overflow-hidden">
                {generatedSQL ? (
                    <textarea 
                        value={generatedSQL} 
                        onChange={handleSQLChange}
                        className="w-full h-full bg-zinc-950 text-blue-300 font-mono text-sm p-4 outline-none resize-none border-none focus:ring-0"
                        spellCheck={false}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-2">
                        <Layers className="w-12 h-12 opacity-20" />
                        <p className="text-sm">Waiting for input...</p>
                    </div>
                )}
            </div>

            {isGenerating && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                        </div>
                        <span className="text-xs text-accent font-mono">Analyzing Relationships...</span>
                     </div>
                </div>
            )}
        </div>
    </div>
  );
}
