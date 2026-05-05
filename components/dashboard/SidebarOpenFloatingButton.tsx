"use client";

import { useSidebar } from "./SidebarContext";

/**
 * 사이드바가 닫혀있을 때 화면 좌상단에 떠있는 펴기 버튼.
 * 데스크탑·모바일 모두 노출 (모바일은 드로어를 다시 여는 트리거).
 */
export default function SidebarOpenFloatingButton() {
  const { isOpen, toggle } = useSidebar();
  if (isOpen) return null;
  return (
    <button
      onClick={toggle}
      className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-line shadow-pop text-sub hover:bg-chip hover:text-ink transition"
      aria-label="사이드바 펴기"
      title="사이드바 펴기"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  );
}
