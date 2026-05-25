import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Instagram CDN 이미지 proxy.
 * Instagram CDN URL을 브라우저가 직접 요청하면 referer / hotlink 차단 +
 * 1시간 expiry로 깨짐. 우리 서버가 fetch + 반환해서 안정적으로 표시.
 *
 * 사용: <img src="/api/image-proxy?url=https://scontent.cdninstagram.com/..." />
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  // 보안: 허용된 도메인만 (open proxy 방지)
  const allowedHosts = [
    "cdninstagram.com",
    "fbcdn.net",
    "instagram.com",
  ];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (!allowedHosts.some((h) => parsed.hostname.includes(h))) {
    return new Response("Domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) {
      return new Response(`Upstream ${res.status}`, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    return new Response(
      e instanceof Error ? e.message : "fetch failed",
      { status: 500 },
    );
  }
}
