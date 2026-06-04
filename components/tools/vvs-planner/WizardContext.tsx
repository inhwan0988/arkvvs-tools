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
  ChannelProfile,
  ChannelSize,
  DurationRange,
  InterviewAnswers,
  InterviewQuestion,
  Period,
  SearchFilters,
  SortBy,
  Topic,
  UserIntent,
  VideoAnalysis,
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
  // v2 personalization
  channelProfile: ChannelProfile | null;
  referenceVideoUrls: string[];
  // v3: 영상 분석 + 사용자 의도
  videoAnalysis: VideoAnalysis | null;
  userIntent: UserIntent;
  // v4: 인터뷰 (Step 3.5) + 세션 (history)
  interviewQuestions: InterviewQuestion[];
  interviewAnswers: InterviewAnswers;
  sessionId: string | null;
};

type Actions = {
  setKeyword: (k: string) => void;
  setPeriod: (p: Period) => void;
  setMinViews: (v: number) => void;
  setChannelSize: (c: ChannelSize) => void;
  setVideoFormat: (f: VideoFormat) => void;
  setDeepSearch: (b: boolean) => void;
  setMinVvs: (v: number) => void;
  setMinEngagementRate: (v: number) => void;
  setDurationRange: (d: DurationRange) => void;
  setCaptionsOnly: (b: boolean) => void;
  setExcludeKeywords: (s: string) => void;
  setSortBy: (s: SortBy) => void;
  setMaxResults: (n: number) => void;
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
  setChannelProfile: (p: ChannelProfile | null) => void;
  setReferenceVideoUrls: (urls: string[]) => void;
  setVideoAnalysis: (v: VideoAnalysis | null) => void;
  setUserIntent: (u: UserIntent) => void;
  setInterviewQuestions: (q: InterviewQuestion[]) => void;
  setInterviewAnswers: (a: InterviewAnswers) => void;
  setSessionId: (id: string | null) => void;
  loadSessionData: (data: Partial<RestorableSessionData>) => void;
};

/** 세션 복원 시 한 번에 주입할 수 있는 데이터 모음 */
export interface RestorableSessionData {
  step: WizardStep;
  keyword: string;
  selectedVideo: VideoResult | null;
  transcript: string | null;
  channelProfile: ChannelProfile | null;
  referenceVideoUrls: string[];
  userIntent: UserIntent;
  selectedTopic: Topic | null;
  interviewQuestions: InterviewQuestion[];
  interviewAnswers: InterviewAnswers;
  script: string;
  sessionId: string | null;
  videoAnalysis: VideoAnalysis | null;
  topics: Topic[];
}

const Ctx = createContext<(State & Actions) | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [minViews, setMinViews] = useState(0);
  const [channelSize, setChannelSize] = useState<ChannelSize>("all");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("all");
  const [deepSearch, setDeepSearch] = useState(false);
  // v3 강화 필터
  const [minVvs, setMinVvs] = useState(0);
  const [minEngagementRate, setMinEngagementRate] = useState(0);
  const [durationRange, setDurationRange] = useState<DurationRange>("any");
  const [captionsOnly, setCaptionsOnly] = useState(false);
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [maxResults, setMaxResults] = useState(30);
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
  const [channelProfile, setChannelProfile] = useState<ChannelProfile | null>(null);
  const [referenceVideoUrls, setReferenceVideoUrls] = useState<string[]>([]);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [userIntent, setUserIntent] = useState<UserIntent>({ freeText: "" });
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswers>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const loadSessionData = useCallback((data: Partial<RestorableSessionData>) => {
    if (data.step !== undefined) setStep(data.step);
    if (data.keyword !== undefined) setKeyword(data.keyword);
    if (data.selectedVideo !== undefined) setSelectedVideo(data.selectedVideo);
    if (data.transcript !== undefined) setTranscript(data.transcript);
    if (data.channelProfile !== undefined) setChannelProfile(data.channelProfile);
    if (data.referenceVideoUrls !== undefined)
      setReferenceVideoUrls(data.referenceVideoUrls);
    if (data.userIntent !== undefined) setUserIntent(data.userIntent);
    if (data.selectedTopic !== undefined) setSelectedTopic(data.selectedTopic);
    if (data.interviewQuestions !== undefined)
      setInterviewQuestions(data.interviewQuestions);
    if (data.interviewAnswers !== undefined)
      setInterviewAnswers(data.interviewAnswers);
    if (data.script !== undefined) setScript(data.script);
    if (data.sessionId !== undefined) setSessionId(data.sessionId);
    if (data.videoAnalysis !== undefined) setVideoAnalysis(data.videoAnalysis);
    if (data.topics !== undefined) setTopics(data.topics);
    setError(null);
  }, []);

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
    setVideoAnalysis(null);
    setUserIntent({ freeText: "" });
    setInterviewQuestions([]);
    setInterviewAnswers({});
    setSessionId(null);
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
        minVvs,
        minEngagementRate,
        durationRange,
        captionsOnly,
        excludeKeywords,
        sortBy,
        maxResults,
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
      channelProfile,
      referenceVideoUrls,
      videoAnalysis,
      userIntent,
      interviewQuestions,
      interviewAnswers,
      sessionId,
      setKeyword,
      setPeriod,
      setMinViews,
      setChannelSize,
      setVideoFormat,
      setDeepSearch,
      setMinVvs,
      setMinEngagementRate,
      setDurationRange,
      setCaptionsOnly,
      setExcludeKeywords,
      setSortBy,
      setMaxResults,
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
      setChannelProfile,
      setReferenceVideoUrls,
      setVideoAnalysis,
      setUserIntent,
      setInterviewQuestions,
      setInterviewAnswers,
      setSessionId,
      loadSessionData,
    }),
    [
      step,
      keyword,
      period,
      minViews,
      channelSize,
      videoFormat,
      deepSearch,
      minVvs,
      minEngagementRate,
      durationRange,
      captionsOnly,
      excludeKeywords,
      sortBy,
      maxResults,
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
      channelProfile,
      referenceVideoUrls,
      videoAnalysis,
      userIntent,
      interviewQuestions,
      interviewAnswers,
      sessionId,
      appendScript,
      goToStep,
      reset,
      loadSessionData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWizard must be used within WizardProvider");
  return v;
}
