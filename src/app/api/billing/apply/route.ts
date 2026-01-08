import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing env vars for billing apply");
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan || "pro";

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in transaction" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert to subscriptions table
    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan: plan,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days dummy
      updated_at: new Date().toISOString()
    });

    if (error) {
        console.error("Supabase Update Error:", error);
        return NextResponse.json({ error: "Failed to update subscription in database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("Billing Apply Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
