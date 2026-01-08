import { NextRequest, NextResponse } from "next/server";
import { setProjectEnv, bindCanonicalAlias, disableDeploymentProtection } from "@/lib/vercel/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawName = (body.name || "").toString();
    const name = rawName.toLowerCase().replace(/\s+/g, "-");
    const accessToken = body.accessToken || undefined;
    if (!name) {
      return NextResponse.json({ error: "Missing project name" }, { status: 400 });
    }

    const providedEnvs = (body.envs || {}) as Record<string, string>;
    const envs: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: providedEnvs.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: providedEnvs.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      SUPABASE_SERVICE_ROLE_KEY: providedEnvs.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      OPENAI_API_KEY: providedEnvs.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
      ...(providedEnvs.VERCEL_ACCESS_TOKEN ? { VERCEL_ACCESS_TOKEN: providedEnvs.VERCEL_ACCESS_TOKEN } : {})
    };

    const results = {
              env: false,
              protection: false,
              alias: false,
              errors: [] as string[]
            };

            try {
              await setProjectEnv(name, envs, accessToken);
              results.env = true;
            } catch (e: any) {
              console.error("Env error:", e);
              results.errors.push(`Env: ${e.message}`);
            }

            try {
              await disableDeploymentProtection(name, accessToken);
              results.protection = true;
            } catch (e: any) {
              console.error("Protection error:", e);
              results.errors.push(`Protection: ${e.message}`);
            }

            try {
              await bindCanonicalAlias(name, accessToken);
              results.alias = true;
            } catch (e: any) {
              console.error("Alias error:", e);
              results.errors.push(`Alias: ${e.message}`);
            }

            return NextResponse.json({
              success: true, // Return true even if partial failures, so client doesn't crash
              url: `https://${name}.vercel.app`,
              details: results
            });
          } catch (error: any) {
            console.error("Publish handler error:", error);
            return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
          }
}
