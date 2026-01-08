"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, CreditCard, Zap, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

export function SmartBilling() {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [isChecking, setIsChecking] = useState(false);
  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
      const getUser = async () => {
          try {
              const { data: { user }, error } = await supabase.auth.getUser();
              if (error) throw error;
              
              setUser(user);
              
              // Check if user already has a subscription
              if (user) {
                  const { data } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single();
                  if (data?.plan) {
                      setCurrentTier(data.plan as any);
                  }
              }
          } catch (e: any) {
              if (e.name === 'AbortError' || e.message?.includes('AbortError')) return;
              console.warn("SmartBilling Auth check failed", e);
          }
      };
      getUser();
  }, []);

  const plans = {
    pro: {
        name: "Pro Architect",
        price: 299000,
        features: ["Unlimited Projects", "Claude 3.5 Sonnet", "Priority Build Queue"]
    },
    enterprise: {
        name: "Enterprise Core",
        price: 990000,
        features: ["Self-Healing Deployment", "GPT-4-Turbo Access", "Dedicated Oracle DB", "SLA 99.9%"]
    }
  };

  const currentPlan = plans[selectedPlan];

  if (currentTier === selectedPlan) {
      return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-[500px] border border-green-500/30 rounded-lg bg-green-500/5 space-y-6"
          >
              <div className="p-4 bg-green-500/20 rounded-full">
                  <ShieldCheck className="w-16 h-16 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-green-500">Plan Active: {plans[currentTier].name}</h2>
                  <p className="text-muted-foreground">Your Neural Core is running at maximum capacity.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="px-4 py-2 bg-background/50 rounded border border-green-500/20">Unlimited Builds</div>
                  <div className="px-4 py-2 bg-background/50 rounded border border-green-500/20">Priority Support</div>
              </div>
          </motion.div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5" /> Upgrade Plan (Stripe Test)
            </h2>
            <p className="text-muted-foreground text-sm">
                Secure checkout via Stripe (test mode). No real charge.
            </p>

            <div className="grid grid-cols-2 gap-4">
                {(Object.keys(plans) as Array<'pro' | 'enterprise'>).map((key) => (
                    <button
                        key={key}
                        onClick={() => setSelectedPlan(key)}
                        className={cn(
                            "p-4 rounded-lg border text-left transition-all",
                            selectedPlan === key 
                                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                                : "border-border hover:border-primary/50"
                        )}
                    >
                        <div className="font-semibold">{plans[key].name}</div>
                        <div className="text-sm text-muted-foreground mt-1">{plans[key].price.toLocaleString()} VND</div>
                    </button>
                ))}
            </div>

            <ul className="space-y-2">
                {currentPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-border space-y-4 relative overflow-hidden">
            {isChecking && (
                <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-medium text-zinc-600">Preparing Checkout...</span>
                </div>
            )}
            
            <div className="text-center space-y-1">
                <div className="text-sm font-semibold text-zinc-900">Selected Plan</div>
                <div className="text-xs text-zinc-500">{currentPlan.name}</div>
            </div>
            
            <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-zinc-900">{currentPlan.price.toLocaleString()} VND</div>
                <div className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                    Stripe Test • USD pricing internally
                </div>
            </div>
            
            <button 
                onClick={async () => {
                    try {
                        setIsChecking(true);
                        const res = await fetch('/api/billing/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                plan: selectedPlan,
                                userId: user?.id 
                            })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.url) throw new Error(data.error || "Failed to init checkout");
                        window.location.href = data.url;
                    } catch (e: any) {
                        toast.error(e.message);
                        setIsChecking(false);
                    }
                }}
                disabled={isChecking}
                className="w-full py-2 mt-2 text-sm font-medium text-white bg-primary hover:opacity-90 rounded"
            >
                Pay with Stripe
            </button>
        </div>
    </div>
  );
}
