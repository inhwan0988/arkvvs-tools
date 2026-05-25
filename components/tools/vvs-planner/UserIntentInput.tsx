"use client";

import {
  APPROACH_LABELS,
  type UserIntent,
} from "@/lib/tools/vvs-planner/types";

/**
 * 사용자 의도 입력 — "이 영상에서 어떤 부분을 빌리고 싶은지" 명시.
 * 옵션(클릭) + 자유 텍스트 둘 다 제공. 자유 텍스트가 가장 중요.
 */
export default function UserIntentInput({
  intent,
  onChange,
}: {
  intent: UserIntent;
  onChange: (i: UserIntent) => void;
}) {
  const approaches = Object.keys(APPROACH_LABELS) as Array<
    NonNullable<UserIntent["approach"]>
  >;

  return (
    <div className="rounded-xl2 border-2 border-brand/30 bg-brandSoft/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">✍️</span>
        <h3 className="text-sm font-bold text-ink">
          어떤 방향으로 만들고 싶으세요?
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand text-white rounded">
          필수
        </span>
      </div>
      <p className="text-xs text-sub mb-4 leading-relaxed">
        이 영상에서 영감 받은 부분과, 본인 채널에서 어떤 방향으로
        만들고 싶은지 알려주세요. AI가 그 의도를 100% 반영해서 주제를 추천합니다.
      </p>

      {/* 빠른 선택 옵션 */}
      <p className="text-[11px] font-bold text-sub mb-2">
        빠른 선택 (선택)
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {approaches.map((key) => (
          <button
            key={key}
            onClick={() =>
              onChange({
                ...intent,
                approach: intent.approach === key ? undefined : key,
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              intent.approach === key
                ? "bg-brand text-white"
                : "bg-surface text-sub border border-line hover:border-brand hover:text-ink"
            }`}
          >
            {APPROACH_LABELS[key]}
          </button>
        ))}
      </div>

      {/* 자유 텍스트 (가장 중요) */}
      <p className="text-[11px] font-bold text-sub mb-2">
        구체적 의도 (자유 서술 — 필수, 더 구체적일수록 정확함) ⭐
      </p>
      <textarea
        value={intent.freeText}
        onChange={(e) => onChange({ ...intent, freeText: e.target.value })}
        placeholder="예) 이 영상의 '체크리스트 구조'를 빌리고 싶어요. 내 채널은 부동산 초보자 대상이라 더 쉬운 용어로 풀어주세요. 실제 사례 위주로 구성하고 싶어요."
        rows={4}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none resize-y"
      />
      <p className="mt-1.5 text-[11px] text-mute">
        {intent.freeText.length === 0
          ? "💡 한 줄이라도 적어주세요. AI가 generic 추천을 안 하게 됩니다."
          : `${intent.freeText.length}자 작성됨`}
      </p>
    </div>
  );
}
