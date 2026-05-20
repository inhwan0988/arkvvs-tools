"use client";

import type { Topic } from "@/lib/tools/vvs-planner/types";
import { cn } from "@/lib/tools/vvs-planner/utils";

export default function TopicCard({
  topic,
  selected,
  onClick,
}: {
  topic: Topic;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl2 border bg-surface p-4 transition-all hover:shadow-pop hover:-translate-y-0.5",
        selected ? "border-brand ring-2 ring-brand/20" : "border-line",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug text-ink">
          {topic.title}
        </h3>
        <span className="shrink-0 rounded-full bg-brandSoft px-2 py-0.5 text-xs font-bold text-brand">
          #{topic.id}
        </span>
      </div>

      {/* 풍부 메타데이터 (v2): 예상 조회수 + 난이도 */}
      {(topic.expectedViewsRange || topic.difficulty) && (
        <div className="mb-2 flex items-center gap-2 flex-wrap text-[10px]">
          {topic.expectedViewsRange && (
            <span className="px-1.5 py-0.5 bg-brand/15 text-brand rounded font-bold">
              📊 {topic.expectedViewsRange}회 예상
            </span>
          )}
          {topic.difficulty && (
            <span className="px-1.5 py-0.5 bg-chip text-sub rounded font-semibold">
              🎬 촬영 {"★".repeat(topic.difficulty.filming)}
              {"☆".repeat(3 - topic.difficulty.filming)}
              {" / 편집 "}
              {"★".repeat(topic.difficulty.editing)}
              {"☆".repeat(3 - topic.difficulty.editing)}
            </span>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-sub">{topic.description}</p>

      <div className="mt-3 space-y-1">
        <div className="text-xs">
          <span className="font-bold text-warn">독특한 각도:</span>{" "}
          <span className="text-sub">{topic.angle}</span>
        </div>
        <div className="text-xs">
          <span className="font-bold text-success">매력 포인트:</span>{" "}
          <span className="text-sub">{topic.appeal}</span>
        </div>
      </div>

      {/* v2: 제목 후보 + 썸네일 텍스트 + 후킹 라인 — 선택 시 펼침 */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          {topic.hookLine && (
            <div className="rounded-lg bg-dangerSoft/40 p-2">
              <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-0.5">
                🎯 후킹 라인 (영상 첫 15초)
              </p>
              <p className="text-[12px] text-ink leading-relaxed">
                &ldquo;{topic.hookLine}&rdquo;
              </p>
            </div>
          )}
          {topic.titleCandidates && topic.titleCandidates.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
                📝 영상 제목 후보
              </p>
              <ul className="space-y-0.5">
                {topic.titleCandidates.slice(0, 3).map((t, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-ink bg-chip rounded px-2 py-1"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {topic.thumbnailText && (
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
                🖼️ 썸네일 텍스트
              </p>
              <p className="text-[14px] font-bold text-ink bg-warnSoft/40 rounded px-2 py-1 inline-block">
                {topic.thumbnailText}
              </p>
            </div>
          )}
          {topic.difficulty?.note && (
            <p className="text-[10px] text-mute italic">
              💡 {topic.difficulty.note}
            </p>
          )}
          {topic.relatedTags && topic.relatedTags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {topic.relatedTags.map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 bg-chip text-mute rounded"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
