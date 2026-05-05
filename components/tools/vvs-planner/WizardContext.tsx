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
  ChannelSize,
  Period,
  SearchFilters,
  Topic,
  VideoFormat,
  VideoResult,
  WizardStep,
} from "@/lib/tools/vvs-planner/types";

type State = {
  step: WizardStep;
  keyword: string;
  filters: SearchFilters;
  videos: VideoResult[];
  selectedVideo: VideoResult | null;
  transcript: string | null;
  topics: Topic[];
  selectedTopic: Topic | null;
  script: string;
  isLoading: boolean;
  error: string | null;
  youtubeApiKey: string;
  anthropicApiKey: string;
};

type Actions = {
  setKeyword: (k: string) => void;
  setPeriod: (p: Period) => void;
  setMinViews: (v: number) => void;
  setChannelSize: (c: ChannelSize) => void;
  setVideoFormat: (f: VideoFormat) => void;
  setDeepSearch: (b: boolean) => void;
  setVideos: (vs: VideoResult[]) => void;
  setSelectedVideo: (v: VideoResult | null) => void;
  setTranscript: (t: string | null) => void;
  setTopics: (ts: Topic[]) => void;
  setSelectedTopic: (t: Topic | null) => void;
  setScript: (s: string) => void;
  appendScript: (chunk: string) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  goToStep: (s: WizardStep) => void;
  reset: () => void;
  setYoutubeApiKey: (k: string) => void;
  setAnthropicApiKey: (k: string) => void;
};

const Ctx = createContext<(State & Actions) | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [minViews, setMinViews] = useState(0);
  const [channelSize, setChannelSize] = useState<ChannelSize>("all");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("all");
  const [deepSearch, setDeepSearch] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [script, setScript] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");

  const appendScript = useCallback(
    (chunk: string) => setScript((s) => s + chunk),
    [],
  );

  const goToStep = useCallback((s: WizardStep) => {
    setStep(s);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setKeyword("");
    setVideos([]);
    setSelectedVideo(null);
    setTranscript(null);
    setTopics([]);
    setSelectedTopic(null);
    setScript("");
    setError(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      step,
      keyword,
      filters: {
        period,
        minViews,
        channelSize,
        videoFormat,
        deepSearch,
      } as SearchFilters,
      videos,
      selectedVideo,
      transcript,
      topics,
      selectedTopic,
      script,
      isLoading,
      error,
      youtubeApiKey,
      anthropicApiKey,
      setKeyword,
      setPeriod,
      setMinViews,
      setChannelSize,
      setVideoFormat,
      setDeepSearch,
      setVideos,
      setSelectedVideo,
      setTranscript,
      setTopics,
      setSelectedTopic,
      setScript,
      appendScript,
      setLoading,
      setError,
      goToStep,
      reset,
      setYoutubeApiKey,
      setAnthropicApiKey,
    }),
    [
      step,
      keyword,
      period,
      minViews,
      channelSize,
      videoFormat,
      deepSearch,
      videos,
      selectedVideo,
      transcript,
      topics,
      selectedTopic,
      script,
      isLoading,
      error,
      youtubeApiKey,
      anthropicApiKey,
      appendScript,
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
