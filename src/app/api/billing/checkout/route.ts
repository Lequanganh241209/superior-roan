import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });

    const { plan, userId } = await req.json();
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const priceMap: Record<string, { amount: number; name: string; features: string[] }> = {
      pro: { amount: 1200, name: "Pro Architect", features: ["Unlimited Projects", "Claude 3.5 Sonnet", "Priority Build Queue"] }, // $12.00
      enterprise: { amount: 4000, name: "Enterprise Core", features: ["Self-Healing Deployment", "GPT-4-Turbo Access", "Dedicated Oracle DB", "SLA 99.9%"] }, // $40.00
    };
    const selected = priceMap[plan] || priceMap.pro;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: selected.name },
            unit_amount: selected.amount,
          },
          quantity: 1,
        },
      ],
      metadata: { plan, userId: userId || "" },
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

