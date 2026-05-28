import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// 외부 앱(vvs-youtube-tool, ark-clipper, capcut-helper Electron)에서 cross-origin POST 받기
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface ClientErrorBody {
  toolSlug?: string;
  route?: string;
  source?: "client" | "helper";
  message?: string;
  stack?: string;
  context?: Record<string, unknown>;
  statusCode?: number;
}

// 메모리 기반 단순 rate limit — 같은 ip_hash당 1분에 20회
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 20;

function hitLimit(ipHash: string): boolean {
  const now = Date.now();
  const arr = (recent.get(ipHash) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  recent.set(ipHash, arr);
  // 메모리 누수 방지 — 1000개 넘으면 가장 오래된 것 제거
  if (recent.size > 1000) {
    const firstKey = recent.keys().next().value;
    if (firstKey) recent.delete(firstKey);
  }
  return arr.length > LIMIT;
}

function fingerprintOf(message: string, route?: string): string {
  const key = `${route ?? ""}::${message.slice(0, 80)}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

/**
 * 클라이언트에서 잡힌 에러를 받아 error_logs에 저장.
 * 익명 허용 — middleware의 PUBLIC_PATHS에 등록되어 있음.
 */
export async function POST(req: NextRequest) {
  let body: ClientErrorBody;
  try {
    body = (await req.json()) as ClientErrorBody;
  } catch {
    return NextResponse.json(
      { error: "invalid json" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "message 필요" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // rate limit — IP 해시 (raw 저장 X)
  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = createHash("sha256").update(rawIp).digest("hex").slice(0, 16);
  if (hitLimit(ipHash)) {
    return NextResponse.json(
      { ok: true, throttled: true },
      { headers: CORS_HEADERS },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("error_logs").insert({
    user_id: user?.id ?? null,
    tool_slug: body.toolSlug ?? null,
    route: body.route ?? null,
    source: body.source ?? "client",
    level: "error",
    message: body.message.slice(0, 2000),
    stack: body.stack?.slice(0, 5000) ?? null,
    context: body.context ?? {},
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    status_code: body.statusCode ?? null,
    ip_hash: ipHash,
    fingerprint: fingerprintOf(body.message, body.route),
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
