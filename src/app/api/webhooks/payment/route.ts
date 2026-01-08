import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) {
      return NextResponse.json({ message: "Service disabled" });
    }
    const supabaseAdmin = createClient(url, key);
    const body = await req.json();

    // SePay/VietQR webhook payload structure (example)
    // {
    //   "gateway": "VietQR",
    //   "transactionDate": "2024-01-07 10:00:00",
    //   "accountNumber": "...",
    //   "subAccount": null,
    //   "transferAmount": 500000,
    //   "transferType": "in",
    //   "transferContent": "AETHER UPGRADE USER123",
    //   "referenceCode": "..."
    // }

    const { transferContent, transferAmount } = body;

    if (!transferContent) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    // Parse User ID from content (Format: AETHER UPGRADE <UUID>)
    // Regex to find UUID
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = transferContent.match(uuidRegex);

    if (!match) {
      console.log("No User ID found in transaction content:", transferContent);
      return NextResponse.json({ message: "Ignored: No User ID found" });
    }

    const userId = match[0];
    let newPlan = "free";

    // Determine plan based on amount
    if (transferAmount >= 2000000) {
      newPlan = "enterprise";
    } else if (transferAmount >= 200000) {
      newPlan = "pro";
    } else {
       console.log("Amount too small for upgrade:", transferAmount);
       return NextResponse.json({ message: "Ignored: Insufficient amount" });
    }

    // Update User Profile
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ 
        plan_type: newPlan,
        subscription_status: "active",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) {
      console.error("Supabase Update Error:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    // Optional: Send Real-time notification via Supabase Channel
    await supabaseAdmin.channel(`user-notifications:${userId}`).send({
        type: "broadcast",
        event: "payment_success",
        payload: { plan: newPlan, amount: transferAmount }
    });

    return NextResponse.json({ success: true, upgraded_to: newPlan, user_id: userId });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
