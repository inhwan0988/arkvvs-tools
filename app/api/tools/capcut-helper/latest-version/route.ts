import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300; // 5분 캐시

/**
 * GitHub Releases /latest 조회 → 최신 Helper 버전 + 다운로드 URL.
 * Vercel ISR로 5분 캐시 (rate limit 회피).
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/inhwan0988/arkvvs-capcut-helper/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      tag_name?: string;
      name?: string;
      html_url?: string;
      published_at?: string;
      assets?: Array<{ name: string; browser_download_url: string; size: number }>;
    };
    const version = (data.tag_name || "").replace(/^v/, "");
    const dmgArm64 = data.assets?.find((a) => /-arm64\.dmg$/i.test(a.name));
    const dmgX64 = data.assets?.find(
      (a) => /\.dmg$/i.test(a.name) && !/arm64/i.test(a.name),
    );
    return NextResponse.json({
      version,
      releaseUrl: data.html_url,
      publishedAt: data.published_at,
      downloads: {
        macArm64: dmgArm64
          ? { url: dmgArm64.browser_download_url, size: dmgArm64.size }
          : null,
        macIntel: dmgX64
          ? { url: dmgX64.browser_download_url, size: dmgX64.size }
          : null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
