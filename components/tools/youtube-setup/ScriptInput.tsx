"use client";

type Props = {
  script: string;
  setScript: (s: string) => void;
  onGenerate: () => void;
  loading: boolean;
};

export default function ScriptInput({ script, setScript, onGenerate, loading }: Props) {
  return (
    <section className="flex flex-col h-full bg-surface rounded-xl3 shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold">스크립트 입력</h2>
          <p className="text-xs text-mute mt-0.5">
            영상 스크립트를 붙여넣어 주세요
          </p>
        </div>
        <span className="text-xs font-semibold text-sub bg-chip px-2.5 py-1 rounded-md">
          {script.length.toLocaleString()}자
        </span>
      </div>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="예: 오늘은 부자들이 절대 말하지 않는 3가지 습관에 대해 알려드리겠습니다..."
        className="flex-1 min-h-[500px] w-full p-4 rounded-xl2 bg-chip text-[15px] leading-relaxed resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/20 transition placeholder:text-mute"
      />
      <button
        onClick={onGenerate}
        disabled={loading || !script.trim()}
        className="mt-4 py-4 rounded-xl2 bg-brand hover:bg-brandHover text-white font-bold text-[15px] transition disabled:bg-chip disabled:text-mute disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> 생성 중... (30~60초)
          </span>
        ) : (
          "생성하기"
        )}
      </button>
    </section>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
