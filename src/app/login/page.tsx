"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Command } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      try {
        const pre = await fetch('/api/auth/precheck');
        if (pre.ok) {
          const json = await pre.json();
          if (json.allowed === false) {
            toast.error("Sign-up closed: monthly cap reached (100). Please try next month.");
            setIsLoading(false);
            return;
          }
        }
      } catch {}
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If login fails, try signup (dev convenience)
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });
        
        if (signUpError) throw error; // Throw original login error if signup also fails
        // Attempt login immediately after signup (for dev without email confirmation)
        const { error: loginAfterSignupError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginAfterSignupError) {
          toast.success("Account created! Please verify email or try logging in again.");
          setIsLoading(false);
          return;
        }
        toast.success("Welcome, account created and logged in.");
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } else {
        toast.success("Welcome back, Architect.");
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) return;
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo', // IMPORTANT: Ask for Write access to create repos
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white selection:bg-primary/20">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900/50 border border-white/10 rounded-xl backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Command className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Aether OS Access</h1>
          <p className="text-sm text-zinc-400">Enter your credentials to access the Neural Core.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="w-full py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </button>
          
          <div className="relative">
             <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
             </div>
             <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with email</span>
             </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase text-zinc-500">Email Identity</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="architect@aether.os"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase text-zinc-500">Passphrase</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate"}
          </button>
        </form>
        
        <div className="text-center text-xs text-zinc-600">
            Aether OS V2.0 Autonomous Architecture
        </div>
      </div>
    </div>
  );
}
