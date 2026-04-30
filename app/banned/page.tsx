"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BannedPage() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isMissingProfile = reason === "missing-profile";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl3 shadow-card p-8 text-center">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-4 ${
            isMissingProfile ? "bg-warnSoft" : "bg-dangerSoft"
          }`}
        >
          {isMissingProfile ? "⚙️" : "🚫"}
        </div>
        {isMissingProfile ? (
          <>
            <h1 className="text-xl font-bold text-ink mb-2">DB 초기화가 필요해요</h1>
            <p className="text-sm text-mute leading-relaxed mb-6">
              Supabase SQL Editor 에서 <code className="px-1.5 py-0.5 rounded bg-chip">supabase/schema.sql</code> 을 먼저 실행해주세요.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink mb-2">접근이 제한된 계정입니다</h1>
            <p className="text-sm text-mute leading-relaxed mb-6">
              이 계정은 더 이상 툴을 사용할 수 없습니다.
              <br />
              문의:{" "}
              <a className="underline" href="mailto:joshua@arkstudio.kr">
                joshua@arkstudio.kr
              </a>
            </p>
          </>
        )}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl2 bg-chip text-ink font-bold text-sm hover:bg-lineStrong transition"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
