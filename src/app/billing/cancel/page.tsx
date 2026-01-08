"use client";

import { useRouter } from "next/navigation";

export default function BillingCancel() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-6 border border-yellow-500/30 rounded-lg bg-yellow-500/5 space-y-4 max-w-md w-full">
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p>Your payment was cancelled. You can try again from the Dashboard.</p>
        <button onClick={() => router.push("/")} className="px-4 py-2 bg-yellow-600 rounded-md">Return to Dashboard</button>
      </div>
    </div>
  );
}

