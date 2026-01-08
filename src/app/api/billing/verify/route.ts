import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid";
    const plan = session.metadata?.plan || "pro";

    return NextResponse.json({ paid, plan });
  } catch (error: any) {
    console.error("Stripe Verify Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

