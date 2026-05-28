import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/banned",
  "/privacy",
  "/terms",
  // Helper App endpoints — device-auth(Bearer secret) 기반, 사용자 세션 없이 호출됨
  "/api/tools/capcut-helper/register",
  "/api/tools/capcut-helper/ping",
  "/api/tools/capcut-helper/jobs",
  "/api/tools/capcut-helper/upload-url",
  "/api/tools/capcut-helper/latest-version",
  // 글로벌 에러 로그 — 익명 클라이언트 에러도 수집
  "/api/log-error",
  // 단축 URL redirect 라우트 — 익명 클릭도 받아야 함
  "/r/",
  // QR 코드 — 외부에서 접근 가능해야 (단축 URL과 함께 공유)
  "/api/tools/sns-tracker/qr/",
  // Vercel cron — Bearer auth로 보호됨
  "/api/tools/sns-tracker/cron/",
  "/api/tools/spread/cron/",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
