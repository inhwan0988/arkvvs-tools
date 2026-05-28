"use client";

import { useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";

export default function PairingPanel({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function formatCode(v: string) {
    return v.replace(/\D/g, "").slice(0, 6);
  }

  async function submit() {
    const clean = formatCode(code);
    if (clean.length !== 6) {
      setErr("6자리 숫자 코드를 입력해주세요.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/tools/capcut-helper/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, deviceName: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "페어링 실패");
      onPaired();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl2 border-2 border-dashed border-brand/40 bg-brandSoft/30 p-6 sm:p-8 text-center">
      <p className="text-4xl mb-3">📡</p>
      <h3 className="text-base font-bold text-ink mb-1">Helper와 페어링</h3>
      <p className="text-[12px] text-sub mb-5 leading-relaxed">
        본인 PC에서 <b>ARK CapCut Helper</b> 앱을 켜고,
        <br />앱 화면에 표시된 <b>6자리 코드</b>를 아래 입력하세요.
      </p>

      <div className="max-w-xs mx-auto space-y-3">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          placeholder="123456"
          maxLength={6}
          className="w-full bg-white border-2 border-line rounded-xl px-4 py-3 text-2xl font-bold text-ink text-center tracking-[0.3em] font-mono focus:outline-none focus:border-brand"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="기기 이름 (옵션, 예: joshua의 Mac)"
          className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
        >
          {loading ? "페어링 중..." : "페어링하기"}
        </button>
        {err && (
          <ErrorWithHint
            message={err}
            toolSlug="capcut-helper"
            route="/api/tools/capcut-helper/pair"
            onDismiss={() => setErr(null)}
          />
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-line/40 text-left max-w-md mx-auto">
        <h4 className="text-[11px] font-bold text-mute uppercase tracking-wider mb-2">
          Helper 앱이 없으신가요?
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <a
            href="https://github.com/inhwan0988/arkvvs-capcut-helper/releases/latest/download/ARK-CapCut-Helper-0.2.0-arm64.dmg"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-brand bg-white px-3 py-2.5 text-center hover:bg-brandSoft transition shadow-card"
          >
            <p className="text-[10px] font-bold text-mute uppercase">🍎 Mac (Apple Silicon)</p>
            <p className="text-[12px] font-bold text-brand mt-0.5">.dmg 다운로드</p>
            <p className="text-[10px] text-mute">M1 / M2 / M3 / M4</p>
          </a>
          <a
            href="https://github.com/inhwan0988/arkvvs-capcut-helper/releases/latest/download/ARK-CapCut-Helper-0.2.0.dmg"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-white px-3 py-2.5 text-center hover:bg-chip transition shadow-card"
          >
            <p className="text-[10px] font-bold text-mute uppercase">🖥️ Mac (Intel)</p>
            <p className="text-[12px] font-bold text-sub mt-0.5">.dmg 다운로드</p>
            <p className="text-[10px] text-mute">Intel x64</p>
          </a>
        </div>
        <ol className="text-[12px] text-sub space-y-1 list-decimal list-inside">
          <li>위 버튼 클릭 → dmg 다운로드</li>
          <li>dmg 열고 응용 프로그램으로 드래그</li>
          <li>응용 프로그램에서 <b>우클릭 → 열기</b> (첫 실행만, 확인되지 않은 개발자 경고 우회)</li>
          <li>앱 화면의 6자리 코드를 위 입력란에 입력</li>
        </ol>
        <p className="text-[11px] text-sub mt-3">
          🪟 Windows 빌드는 준비 중 ·{" "}
          <a
            href="https://github.com/inhwan0988/arkvvs-capcut-helper/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            전체 release 보기
          </a>
        </p>
        <p className="text-[10px] text-mute mt-2 italic">
          ⚠️ Helper는 본인 PC에만 설치. 영상은 PC 밖으로 안 나가고 audio 분석만 우리 서버를 거쳐요.
        </p>
      </div>
    </div>
  );
}
