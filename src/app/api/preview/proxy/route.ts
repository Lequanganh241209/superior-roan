import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function sanitizeHeaders(headers: Headers) {
  const out = new Headers();
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "x-frame-options" || k === "content-security-policy") {
      return;
    }
    // Avoid setting hop-by-hop headers
    if (["connection", "transfer-encoding"].includes(k)) return;
    out.set(key, value);
  });
  // Force safe embedding
  out.set("X-Frame-Options", "ALLOWALL");
  out.delete("Content-Security-Policy");
  return out;
}

function injectBase(html: string, baseHref: string) {
  try {
    const hasHead = /<head[^>]*>/i.test(html);
    const hasBase = /<base\s+/i.test(html);
    const cleaned = html.replace(
      /<meta\s+http-equiv=["']content-security-policy["'][^>]*>/ig,
      ""
    );
    if (!hasHead) return `<head><base href="${baseHref}"></head>` + cleaned;
    if (hasBase) return cleaned;
    return cleaned.replace(/<head[^>]*>/i, (m) => `${m}<base href="${baseHref}">`);
  } catch {
    return html;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    const upstream = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Aether-OS-Preview-Proxy" }
    });
    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const safeHeaders = sanitizeHeaders(upstream.headers);
    safeHeaders.set("content-type", contentType);

    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const u = new URL(url);
      const baseHref = `${u.protocol}//${u.host}/`;
      const patched = injectBase(html, baseHref);
      return new NextResponse(patched, { headers: safeHeaders, status: upstream.status });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(Buffer.from(buf), { headers: safeHeaders, status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Proxy failed" }, { status: 500 });
  }
}
