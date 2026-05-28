"use client";

import { useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import SettingsBar, { type Provider } from "@/components/tools/youtube-setup/SettingsBar";
import ScriptInput from "@/components/tools/youtube-setup/ScriptInput";
import ResultPanel from "@/components/tools/youtube-setup/ResultPanel";
import type { ChannelStage } from "@/lib/tools/youtube-setup/prompts";
import type { GenerateResult } from "@/lib/tools/youtube-setup/types";

type Section = "titles" | "thumbnails" | "description" | "meta";
type SectionStatus = "pending" | "loading" | "done" | "error";

export default function YouTubeSetupPage() {
  const [provider, setProvider] = useState<Provider>("claude");
  const [apiKey, setApiKey] = useState("");
  const [stage, setStage] = useState<ChannelStage>("초기");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<GenerateResult> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<Section, SectionStatus>>({
    titles: "pending",
    thumbnails: "pending",
    description: "pending",
    meta: "pending",
  });

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({
      titles: "loading",
      thumbnails: "loading",
      description: "loading",
      meta: "loading",
    });

    try {
      const res = await fetch("/api/tools/youtube-setup/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, provider, apiKey, stage }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error ?? "생성 실패");
        } catch {
          throw new Error(`서버 오류 (${res.status})`);
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const accum: Partial<GenerateResult> = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          const lines = eventBlock.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;
          let data: unknown;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventName === "section") {
            const { section, data: payload } = data as {
              section: Section;
              data: Record<string, unknown>;
            };
            Object.assign(accum, payload);
            setResult({ ...accum });
            setProgress((p) => ({ ...p, [section]: "done" }));
          } else if (eventName === "section_error") {
            const { section, message } = data as {
              section: Section;
              message: string;
            };
            setProgress((p) => ({ ...p, [section]: "error" }));
            console.error(`Section ${section} failed:`, message);
          } else if (eventName === "error") {
            const { message } = data as { message: string };
            throw new Error(message);
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <SettingsBar
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        stage={stage}
        setStage={setStage}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScriptInput
          script={script}
          setScript={setScript}
          onGenerate={onGenerate}
          loading={loading}
        />
        <div className="flex flex-col min-h-[500px]">
          {error && (
            <div className="mb-3">
              <ErrorWithHint
                message={error}
                toolSlug="youtube-setup"
                route="/api/tools/youtube-setup/generate"
                onDismiss={() => setError(null)}
              />
            </div>
          )}
          {loading && (
            <ProgressBar progress={progress} />
          )}
          <ResultPanel result={result as GenerateResult | null} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: Record<Section, SectionStatus> }) {
  const labels: Record<Section, string> = {
    titles: "제목",
    thumbnails: "썸네일",
    description: "설명란",
    meta: "키워드 · 체크리스트",
  };
  const sections: Section[] = ["titles", "thumbnails", "description", "meta"];
  return (
    <div className="mb-3 p-4 rounded-xl2 bg-surface border border-line">
      <p className="text-sm font-bold text-ink mb-3">생성 중...</p>
      <div className="grid grid-cols-2 gap-2">
        {sections.map((s) => {
          const status = progress[s];
          const icon =
            status === "done"
              ? "✅"
              : status === "error"
              ? "⚠️"
              : status === "loading"
              ? "⏳"
              : "⚪";
          const color =
            status === "done"
              ? "text-success"
              : status === "error"
              ? "text-danger"
              : "text-sub";
          return (
            <div key={s} className={`text-sm font-semibold ${color}`}>
              {icon} {labels[s]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
