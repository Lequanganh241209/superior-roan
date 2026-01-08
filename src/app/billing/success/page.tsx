"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function Content() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [plan, setPlan] = useState<string>("pro");

  useEffect(() => {
    const run = async () => {
      const sessionId = search.get("session_id");
      if (!sessionId) return setStatus("failed");
      const res = await fetch(`/api/billing/verify?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok || !data.paid) {
        setStatus("failed");
        return;
      }
      setPlan(data.plan || "pro");
      setStatus("success");

      // Apply subscription securely
      try {
        const applyRes = await fetch('/api/billing/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        if (!applyRes.ok) {
           console.error("Failed to apply subscription");
        }
      } catch (e) {
        console.error("Apply error", e);
      }
    };
    run();
  }, [search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-6 border border-green-500/30 rounded-lg bg-green-500/5 space-y-4 max-w-md w-full">
        <h1 className="text-2xl font-bold">Payment {status === "success" ? "Successful" : status === "failed" ? "Failed" : "Verifying..."}</h1>
        {status === "success" && (
          <>
            <p>Your plan has been upgraded to: <span className="font-semibold">{plan}</span></p>
            <button onClick={() => router.push("/")} className="px-4 py-2 bg-green-600 rounded-md">Return to Dashboard</button>
          </>
        )}
        {status === "failed" && (
          <>
            <p>We could not verify your payment. Please try again.</p>
            <button onClick={() => router.push("/")} className="px-4 py-2 bg-red-600 rounded-md">Return to Dashboard</button>
          </>
        )}
        {status === "verifying" && (
          <p>Please wait while we verify your payment...</p>
        )}
      </div>
    </div>
  );
}

export default function BillingSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>}>
      <Content />
    </Suspense>
  );
}
