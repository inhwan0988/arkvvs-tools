"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl3 shadow-card p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand flex items-center justify-center text-white font-bold text-lg mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-ink">arkvvs.tools</h1>
          <p className="text-sm text-mute mt-1">크리에이터를 위한 AI 툴킷</p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full py-3.5 rounded-xl2 bg-white border border-line text-ink font-bold text-[15px] hover:bg-chip transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.62z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A8.98 8.98 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.17 6.66 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? "이동 중..." : "Google로 시작하기"}
        </button>

        <p className="text-center text-xs text-mute mt-8 leading-relaxed">
          로그인 시 <a className="underline">이용약관</a> 및{" "}
          <a className="underline">개인정보처리방침</a>에 동의합니다.
        </p>
      </div>
    </div>
  );
}
