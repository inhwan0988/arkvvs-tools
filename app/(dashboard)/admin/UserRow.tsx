"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/profile";
import { setUserStatus, setUserTier } from "./actions";

export default function UserRow({ user }: { user: Profile }) {
  const router = useRouter();
  const [statusPending, startStatusTransition] = useTransition();
  const [tierPending, startTierTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleStatus() {
    const next = user.status === "approved" ? "banned" : "approved";
    if (next === "banned" && !confirm(`${user.email} 계정을 차단할까요?`)) return;
    startStatusTransition(async () => {
      const result = await setUserStatus(user.id, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleTier() {
    const next = user.tier === "premium" ? "free" : "premium";
    const label = next === "premium" ? "회원전용 권한 부여" : "회원전용 권한 해제";
    if (!confirm(`${user.email}에게 ${label} 할까요?`)) return;
    startTierTransition(async () => {
      const result = await setUserTier(user.id, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const display = user.name || user.email.split("@")[0];
  const isAdmin = user.role === "admin";

  return (
    <div className="px-6 py-4 flex items-center gap-4 hover:bg-chip/40 transition">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full bg-chip"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center">
          {display.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-ink truncate">{display}</p>
          {isAdmin && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brandSoft text-brand">
              ADMIN
            </span>
          )}
          {user.tier === "premium" && !isAdmin && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-premiumSoft text-premium">
              ⭐ PREMIUM
            </span>
          )}
          {user.status === "banned" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-dangerSoft text-danger">
              BANNED
            </span>
          )}
        </div>
        <p className="text-xs text-mute truncate">{user.email}</p>
        <p className="text-[11px] text-mute mt-0.5">
          가입: {new Date(user.created_at).toLocaleDateString("ko-KR")}
        </p>
      </div>

      {error && <p className="text-xs text-danger mr-2">{error}</p>}

      {!isAdmin && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTier}
            disabled={tierPending}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
              user.tier === "premium"
                ? "bg-premiumSoft text-premium hover:bg-premium hover:text-white"
                : "bg-chip text-sub hover:bg-premium hover:text-white"
            }`}
          >
            {tierPending
              ? "..."
              : user.tier === "premium"
                ? "회원전용 해제"
                : "회원전용 부여"}
          </button>
          <button
            onClick={toggleStatus}
            disabled={statusPending}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
              user.status === "approved"
                ? "bg-dangerSoft text-danger hover:bg-danger hover:text-white"
                : "bg-successSoft text-success hover:bg-success hover:text-white"
            }`}
          >
            {statusPending
              ? "..."
              : user.status === "approved"
                ? "차단"
                : "차단 해제"}
          </button>
        </div>
      )}
    </div>
  );
}
