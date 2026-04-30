"use client";

import { useState } from "react";
import SettingsBar, { type Provider } from "@/components/tools/youtube-setup/SettingsBar";
import ScriptInput from "@/components/tools/youtube-setup/ScriptInput";
import ResultPanel from "@/components/tools/youtube-setup/ResultPanel";
import type { ChannelStage } from "@/lib/tools/youtube-setup/prompts";
import type { GenerateResult } from "@/lib/tools/youtube-setup/types";

export default function YouTubeSetupPage() {
  const [provider, setProvider] = useState<Provider>("claude");
  const [apiKey, setApiKey] = useState("");
  const [stage, setStage] = useState<ChannelStage>("초기");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tools/youtube-setup/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, provider, apiKey, stage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "생성 실패");
      setResult(json.data as GenerateResult);
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
            <div className="mb-3 p-4 rounded-xl2 bg-dangerSoft text-sm font-semibold text-danger flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          <ResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}
