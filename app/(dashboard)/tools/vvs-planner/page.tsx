"use client";

import { WizardProvider, useWizard } from "@/components/tools/vvs-planner/WizardContext";
import SettingsBar from "@/components/tools/vvs-planner/SettingsBar";
import StepIndicator from "@/components/tools/vvs-planner/StepIndicator";
import Step1KeywordSearch from "@/components/tools/vvs-planner/Step1KeywordSearch";
import Step2VideoSelect from "@/components/tools/vvs-planner/Step2VideoSelect";
import Step3TopicSelect from "@/components/tools/vvs-planner/Step3TopicSelect";
import Step35Interview from "@/components/tools/vvs-planner/Step35Interview";
import Step4ScriptGenerate from "@/components/tools/vvs-planner/Step4ScriptGenerate";
import { useSessionAutoSave } from "@/components/tools/vvs-planner/useSessionAutoSave";

export default function VvsPlannerPage() {
  return (
    <WizardProvider>
      <div className="min-h-full flex flex-col">
        <SettingsBar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          <Wizard />
        </main>
      </div>
    </WizardProvider>
  );
}

function Wizard() {
  const { step } = useWizard();
  useSessionAutoSave();
  // StepIndicator는 정수 step만 받음 — 3.5는 시각적으로 3과 동일 표시
  const indicatorStep = (step === 3.5 ? 3 : step) as 1 | 2 | 3 | 4;
  return (
    <>
      <StepIndicator current={indicatorStep} />
      {step === 1 && <Step1KeywordSearch />}
      {step === 2 && <Step2VideoSelect />}
      {step === 3 && <Step3TopicSelect />}
      {step === 3.5 && <Step35Interview />}
      {step === 4 && <Step4ScriptGenerate />}
    </>
  );
}
