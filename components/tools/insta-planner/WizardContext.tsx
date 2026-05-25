"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ContentIdea,
  ContentScript,
  InstaProfile,
  ReelAnalysis,
  ReelResult,
  UserIntent,
  WizardStep,
} from "@/lib/tools/insta-planner/types";

type State = {
  step: WizardStep;
  // Step 1: 영감 채널 입력 + 검색 필터
  channelInput: string;      // "@a, @b, @c" 형식 또는 줄바꿈
  channels: string[];        // normalized usernames
  minIvs: number;
  minFollowers: number;
  excludeKeywords: string;
  // Step 1 결과
  reels: ReelResult[];
  selectedReel: ReelResult | null;
  // Step 3: 분석 + 의도
  reelAnalysis: ReelAnalysis | null;
  userIntent: UserIntent;
  // Step 3 결과: 아이디어
  ideas: ContentIdea[];
  selectedIdea: ContentIdea | null;
  // Step 4: 대본
  script: ContentScript | null;
  scriptText: string;        // streaming buffer
  // 본인 프로필
  myProfile: InstaProfile | null;
  // API 키
  anthropicApiKey: string;
  // 공통
  isLoading: boolean;
  error: string | null;
};

type Actions = {
  setStep: (s: WizardStep) => void;
  setChannelInput: (v: string) => void;
  setChannels: (v: string[]) => void;
  setMinIvs: (v: number) => void;
  setMinFollowers: (v: number) => void;
  setExcludeKeywords: (v: string) => void;
  setReels: (v: ReelResult[]) => void;
  setSelectedReel: (v: ReelResult | null) => void;
  setReelAnalysis: (v: ReelAnalysis | null) => void;
  setUserIntent: (v: UserIntent) => void;
  setIdeas: (v: ContentIdea[]) => void;
  setSelectedIdea: (v: ContentIdea | null) => void;
  setScript: (v: ContentScript | null) => void;
  setScriptText: (v: string) => void;
  appendScriptText: (chunk: string) => void;
  setMyProfile: (v: InstaProfile | null) => void;
  setAnthropicApiKey: (v: string) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  goToStep: (s: WizardStep) => void;
  reset: () => void;
};

const Ctx = createContext<(State & Actions) | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [channelInput, setChannelInput] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [minIvs, setMinIvs] = useState(0);
  const [minFollowers, setMinFollowers] = useState(0);
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [reels, setReels] = useState<ReelResult[]>([]);
  const [selectedReel, setSelectedReel] = useState<ReelResult | null>(null);
  const [reelAnalysis, setReelAnalysis] = useState<ReelAnalysis | null>(null);
  const [userIntent, setUserIntent] = useState<UserIntent>({ freeText: "" });
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [script, setScript] = useState<ContentScript | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [myProfile, setMyProfile] = useState<InstaProfile | null>(null);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendScriptText = useCallback(
    (chunk: string) => setScriptText((s) => s + chunk),
    [],
  );

  const goToStep = useCallback((s: WizardStep) => {
    setStep(s);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setChannels([]);
    setReels([]);
    setSelectedReel(null);
    setReelAnalysis(null);
    setUserIntent({ freeText: "" });
    setIdeas([]);
    setSelectedIdea(null);
    setScript(null);
    setScriptText("");
    setLoading(false);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      step,
      channelInput,
      channels,
      minIvs,
      minFollowers,
      excludeKeywords,
      reels,
      selectedReel,
      reelAnalysis,
      userIntent,
      ideas,
      selectedIdea,
      script,
      scriptText,
      myProfile,
      anthropicApiKey,
      isLoading,
      error,
      setStep,
      setChannelInput,
      setChannels,
      setMinIvs,
      setMinFollowers,
      setExcludeKeywords,
      setReels,
      setSelectedReel,
      setReelAnalysis,
      setUserIntent,
      setIdeas,
      setSelectedIdea,
      setScript,
      setScriptText,
      appendScriptText,
      setMyProfile,
      setAnthropicApiKey,
      setLoading,
      setError,
      goToStep,
      reset,
    }),
    [
      step,
      channelInput,
      channels,
      minIvs,
      minFollowers,
      excludeKeywords,
      reels,
      selectedReel,
      reelAnalysis,
      userIntent,
      ideas,
      selectedIdea,
      script,
      scriptText,
      myProfile,
      anthropicApiKey,
      isLoading,
      error,
      appendScriptText,
      goToStep,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWizard must be used within WizardProvider");
  return v;
}
