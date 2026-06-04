"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 세션 토큰 자동 갱신 — long-running 작업(vvs-planner Step3 등) 중 토큰 만료 방지.
 *
 *  - mount 시 1회 + visibility change(탭 복귀) 시 + 5분마다 getSession() 호출
 *  - supabase-js가 만료 임박이면 자동 refresh
 *  - 그래도 refresh 실패하면 onAuthStateChange가 SIGNED_OUT 발화 → /login 이동
 *
 * 이 컴포넌트는 dashboard 안 모든 페이지에서 동작.
 */
export default function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      supabase.auth.getSession().catch(() => {});
    };

    // 초기 1회
    refresh();

    // visibility change — 탭으로 돌아올 때 즉시 체크
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    // 주기적 (5분)
    const intervalId = window.setInterval(refresh, 5 * 60 * 1000);

    // 세션 만료 감지 시 자동 로그인 페이지로 (현재 페이지 복귀용 returnTo 포함)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
      }
    });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
