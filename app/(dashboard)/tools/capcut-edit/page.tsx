"use client";

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

export default function CapcutEditPage() {
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
      {step === 1 && <Step1Upload />}
      {step === 2 && <Step2Processing />}
      {step === 3 && <Step3Review />}
      {step === 4 && <Step4Export />}
    </>
  );
}
