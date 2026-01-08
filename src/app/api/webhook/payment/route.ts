import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, amount, gateway, userId } = body;

    console.log(`[Payment Webhook] Received from ${gateway}:`, body);

    // 1. Validation Logic
    if (!content || !amount) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 2. Parse Plan from Content (e.g., AETHER-PRO-001)
    let plan = 'free';
    if (content.includes('PRO')) plan = 'pro';
    if (content.includes('ENTERPRISE')) plan = 'enterprise';

    // 3. Simulation: If we had a Service Role Key, we would update the DB here.
    // Since we don't, we just acknowledge the receipt.
    // In a real app, this is where you'd verify the bank signature (e.g., Casso/SePay).

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: `txn_${Math.random().toString(36).substr(2, 9)}`,
        plan_upgraded_to: plan,
        user_id: userId || 'anonymous',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Payment Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
