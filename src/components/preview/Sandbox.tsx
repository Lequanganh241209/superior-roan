"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { useProjectStore } from "@/store/project-store";

const OVERRIDES: Record<string, string> = {
  writingtask2: "https://writingtask2-646deiwnu-le-quang-tons-projects.vercel.app"
};

export function Sandbox() {
  const { previewUrl, projectName, setPreviewUrl } = useProjectStore();
  const [frameKey, setFrameKey] = useState(0);
  const active = Boolean(previewUrl);
  const displayUrl = previewUrl || "Waiting for build...";
  const resolveOverride = useCallback((url: string) => {
    if ((url || "").toLowerCase().includes("writingtask2.vercel.app")) return OVERRIDES.writingtask2;
    const tail = (projectName || "").split("/").pop()?.toLowerCase() || "";
    return OVERRIDES[tail] || null;
  }, [projectName]);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const target = (resolveOverride(previewUrl || "") || previewUrl || "");
  const usingProxy = Boolean(active && blocked);
  const frameSrc = active ? (usingProxy ? `/api/preview/proxy?url=${encodeURIComponent(target)}` : target) : "about:blank";
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!previewUrl) return;
      setChecking(true);
      try {
        const ov = resolveOverride(previewUrl);
        const target = ov || previewUrl;
        const res = await fetch(`/api/preview/check?url=${encodeURIComponent(target)}`);
        if (res.ok) {
          const json = await res.json();
          if (!ignore) setBlocked(Boolean(json.blocked));
        }
      } catch {
        if (!ignore) setBlocked(false);
      } finally {
        if (!ignore) setChecking(false);
      }
    })();
    return () => { ignore = true; };
  }, [previewUrl, projectName, resolveOverride]);
  const healNow = async () => {
    try {
      if (!previewUrl) return;
      const ov = resolveOverride(previewUrl);
      if (ov) {
        setPreviewUrl(ov);
        setFrameKey(k => k + 1);
        setBlocked(false);
        return;
      }
      try {
        const head = await fetch(previewUrl, { method: "HEAD" });
        if (head.ok) {
          setFrameKey(k => k + 1);
          setBlocked(false);
          return;
        }
      } catch {}
      const res = await fetch("/api/projects/list");
      if (res.ok) {
        const json = await res.json();
        const match = json.projects?.find((p: any) => p.repo_name === projectName) || json.projects?.[0];
        if (match?.deployment_url) {
          const ov2 = resolveOverride(match.deployment_url);
          setPreviewUrl(ov2 || match.deployment_url);
          setFrameKey(k => k + 1);
          setBlocked(false);
          return;
        }
      }
    } catch {}
  };

  return (
    <div className="flex flex-col h-[600px] border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-10 border-b border-border/50 bg-muted/20 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="ml-4 px-3 py-0.5 rounded-full bg-background border border-border/50 text-[10px] font-mono text-muted-foreground w-64 truncate">
                    {displayUrl}
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                  className="p-1 hover:text-primary transition-colors"
                  onClick={() => setFrameKey(k => k + 1)}
                  title="Refresh Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {active && (
                  <button
                    className="p-1 hover:text-primary transition-colors"
                    onClick={healNow}
                    title="Heal Link"
                  >
                    <RefreshCw className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
                {active && (
                  <a 
                    className="p-1 hover:text-primary transition-colors"
                    href={previewUrl!}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
            </div>
        </div>
        <div className="flex-1 bg-white relative">
            {!active && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
                  <div className="text-center space-y-2">
                      <div className="w-16 h-16 border-4 border-zinc-200 border-t-zinc-400 rounded-full animate-spin mx-auto" />
                      <p className="font-mono text-sm text-zinc-500">Waiting for build output...</p>
                  </div>
              </div>
            )}
            {active && (blocked || usingProxy) && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-400 z-10 bg-white/80">
                <div className="text-center space-y-3">
                  {!usingProxy ? (
                    <p className="font-mono text-sm text-zinc-700">
                      Trang này không cho phép nhúng iframe (X-Frame-Options/CSP).
                    </p>
                  ) : (
                    <p className="font-mono text-sm text-zinc-700">
                      Trang này yêu cầu xác thực và có thể không hoạt động qua proxy.
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      className="px-3 py-1.5 text-xs rounded-md border border-zinc-300 hover:bg-zinc-100"
                      onClick={healNow}
                    >
                      Thử khôi phục
                    </button>
                    <a 
                      className="px-3 py-1.5 text-xs rounded-md border border-zinc-300 hover:bg-zinc-100"
                      href={previewUrl!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở tab mới
                    </a>
                  </div>
                  {checking && <p className="text-[10px] text-zinc-500">Đang kiểm tra khả năng nhúng…</p>}
                </div>
              </div>
            )}
            <iframe 
                key={frameKey}
                src={frameSrc}
                className={`w-full h-full transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                title="Sandbox Preview"
                onError={healNow}
            />
            {usingProxy && (
              <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-zinc-900/70 text-zinc-200 border border-zinc-700">
                Đang hiển thị qua proxy
              </div>
            )}
        </div>
    </div>
  );
}
