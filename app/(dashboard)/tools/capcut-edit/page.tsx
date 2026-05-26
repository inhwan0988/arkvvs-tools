"use client";

import { useState } from "react";
import {
  useWizard,
  WizardProvider,
} from "@/components/tools/capcut-edit/WizardContext";
import SettingsBar from "@/components/tools/capcut-edit/SettingsBar";
import StepIndicator from "@/components/tools/capcut-edit/StepIndicator";
import Step1Upload from "@/components/tools/capcut-edit/Step1Upload";
import Step2Processing from "@/components/tools/capcut-edit/Step2Processing";
import Step3Review from "@/components/tools/capcut-edit/Step3Review";
import Step4Export from "@/components/tools/capcut-edit/Step4Export";
import HelperPanel from "@/components/tools/capcut-edit/helper-mode/HelperPanel";

type Mode = "helper" | "upload";

export default function CapcutEditPage() {
  const [mode, setMode] = useState<Mode>("helper");

  return (
    <WizardProvider>
      <div className="min-h-full flex flex-col">
        <SettingsBar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
          <ModeToggle mode={mode} onChange={setMode} />
          {mode === "helper" ? <HelperPanel /> : <Wizard />}
        </main>
      </div>
    </WizardProvider>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-1 flex gap-1 max-w-md">
      <button
        onClick={() => onChange("helper")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
          mode === "helper"
            ? "bg-brand text-white shadow-card"
            : "text-sub hover:text-ink"
        }`}
      >
        📡 캡컷 자동 연동 (Helper)
      </button>
      <button
        onClick={() => onChange("upload")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
          mode === "upload"
            ? "bg-brand text-white shadow-card"
            : "text-sub hover:text-ink"
        }`}
      >
        📁 mp3 직접 업로드
      </button>
    </div>
  );
}

function Wizard() {
  const { step } = useWizard();
  return (
    <>
      <StepIndicator current={step} />
      {step === 1 && <Step1Upload />}
      {step === 2 && <Step2Processing />}
      {step === 3 && <Step3Review />}
      {step === 4 && <Step4Export />}
    </>
  );
}
