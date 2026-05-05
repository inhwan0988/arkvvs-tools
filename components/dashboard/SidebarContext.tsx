"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "arkvvs.sidebarOpen";

const SidebarCtx = createContext<{
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
} | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (saved !== null) {
      // 저장된 값이 있으면 그대로
      setIsOpen(saved === "1");
    } else if (isMobile) {
      // 모바일 첫 방문 — 드로어 닫힌 상태로 시작
      setIsOpen(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // private mode 등 무시
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // ignore
    }
  }, []);

  return (
    <SidebarCtx.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export function useSidebar() {
  const v = useContext(SidebarCtx);
  if (!v) throw new Error("useSidebar must be used within SidebarProvider");
  return v;
}
