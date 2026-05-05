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
    </div>
  );
}
