"use client";

import { useSidebar } from "./SidebarContext";

export default function SidebarToggleButton() {
  const { isOpen, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sub hover:bg-chip hover:text-ink transition"
      aria-label={isOpen ? "사이드바 접기" : "사이드바 펴기"}
      title={isOpen ? "사이드바 접기" : "사이드바 펴기"}
    >
      <svg
        width="18"
        height="18"
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
