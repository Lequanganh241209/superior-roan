import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function parseBlocked(headers: Headers) {
  const xfo = headers.get("x-frame-options") || headers.get("X-Frame-Options") || "";
  const csp = headers.get("content-security-policy") || headers.get("Content-Security-Policy") || "";
  let blocked = false;
  if (xfo) {
    const v = xfo.toLowerCase();
    if (v.includes("deny") || v.includes("sameorigin")) blocked = true;
  }
  if (csp) {
    const v = csp.toLowerCase();
    if (v.includes("frame-ancestors")) {
      const idx = v.indexOf("frame-ancestors");
      const tail = v.substring(idx);
      const seg = tail.split(";")[0];
      // If explicitly 'none' or only 'self', consider blocked
      if (seg.includes("'none'")) blocked = true;
      if (seg.includes("'self'") && !seg.includes("*")) blocked = true;
    }
  }
  return { blocked, xfo, csp };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    const { blocked, xfo, csp } = parseBlocked(res.headers);
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      blocked,
      headers: { xFrameOptions: xfo || null, csp: csp || null }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, blocked: false, error: e.message || "Request failed" }, { status: 200 });
  }
}
