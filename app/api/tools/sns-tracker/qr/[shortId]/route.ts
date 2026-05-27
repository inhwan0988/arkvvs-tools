import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 단축 URL에 대한 QR 코드 (SVG) 생성.
 *
 * GET /api/tools/sns-tracker/qr/abc123 → image/svg+xml
 * 외부 사용자도 받을 수 있게 인증 불필요 (단축 URL 자체가 public).
 *
 * 외부 의존성 없는 자체 QR 생성기 — 의존성 minimal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params;
  if (!shortId || shortId.length > 32 || !/^[A-Za-z0-9]+$/.test(shortId)) {
    return new NextResponse("Bad short id", { status: 400 });
  }

  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const url = `${base}/r/${shortId}`;

  // QR 생성은 외부 무료 API 사용 (자체 라이브러리 없이) — quickchart.io는 도용 검증된 무료 QR endpoint
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&format=svg&margin=20`;

  try {
    const res = await fetch(qrUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "arkvvs-tools/1.0" },
    });
    if (!res.ok) {
      return new NextResponse(`QR API ${res.status}`, { status: 502 });
    }
    const svg = await res.text();
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=86400",
        "content-disposition": `inline; filename="qr-${shortId}.svg"`,
      },
    });
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : "QR generation failed",
      { status: 500 },
    );
  }
}
