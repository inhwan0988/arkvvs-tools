"use client";

import { WizardProvider, useWizard } from "@/components/tools/vvs-planner/WizardContext";
import SettingsBar from "@/components/tools/vvs-planner/SettingsBar";
import StepIndicator from "@/components/tools/vvs-planner/StepIndicator";
import Step1KeywordSearch from "@/components/tools/vvs-planner/Step1KeywordSearch";
import Step2VideoSelect from "@/components/tools/vvs-planner/Step2VideoSelect";
import Step3TopicSelect from "@/components/tools/vvs-planner/Step3TopicSelect";
import Step4ScriptGenerate from "@/components/tools/vvs-planner/Step4ScriptGenerate";

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
  return (
    <>
      <StepIndicator current={step} />
      {step === 1 && <Step1KeywordSearch />}
      {step === 2 && <Step2VideoSelect />}
      {step === 3 && <Step3TopicSelect />}
      {step === 4 && <Step4ScriptGenerate />}
    </>
  );
}
