"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  name?: string;
  avatarUrl?: string;
};

export default function Header({ email, name, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const display = name || email.split("@")[0];

  return (
    <header className="h-16 bg-surface border-b border-line flex items-center px-6">
      <div className="ml-auto relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-chip transition"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full bg-chip"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
              {display.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-ink hidden sm:inline">
            {display}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-56 bg-surface rounded-xl2 shadow-pop border border-line py-2 z-20">
            <div className="px-4 py-2 border-b border-line">
              <p className="text-sm font-semibold text-ink truncate">{display}</p>
              <p className="text-xs text-mute truncate">{email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm font-semibold text-danger hover:bg-chip"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
