"use client";

import { useWizard, WizardProvider } from "@/components/tools/insta-planner/WizardContext";
import SettingsBar from "@/components/tools/insta-planner/SettingsBar";
import StepIndicator from "@/components/tools/insta-planner/StepIndicator";
import Step1ChannelInput from "@/components/tools/insta-planner/Step1ChannelInput";
import Step2ReelSelect from "@/components/tools/insta-planner/Step2ReelSelect";
import Step3Analysis from "@/components/tools/insta-planner/Step3Analysis";
import Step4Generate from "@/components/tools/insta-planner/Step4Generate";

export default function InstaPlannerPage() {
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
      {step === 1 && <Step1ChannelInput />}
      {step === 2 && <Step2ReelSelect />}
      {step === 3 && <Step3Analysis />}
      {step === 4 && <Step4Generate />}
    </>
  );
}
