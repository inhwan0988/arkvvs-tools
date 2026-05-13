import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/profile";
import UserRow from "./UserRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  const list = users ?? [];
  const approved = list.filter((u) => u.status === "approved").length;
  const banned = list.filter((u) => u.status === "banned").length;
  const premium = list.filter(
    (u) => u.tier === "premium" && u.role !== "admin",
  ).length;
  const admins = list.filter((u) => u.role === "admin").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">사용자 관리</h1>
        <p className="text-sm text-mute mt-1">
          차단 시 즉시 모든 툴 사용이 중단됩니다. 회원전용 권한은 수강생에게만
          부여하세요.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="전체" value={list.length} />
        <Stat label="활성" value={approved} tone="success" />
        <Stat label="회원전용" value={premium} tone="premium" />
        <Stat label="차단" value={banned} tone="danger" />
      </div>

      <div className="bg-surface rounded-xl3 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">사용자 ({list.length})</h2>
          <span className="text-xs font-semibold text-mute">관리자 {admins}명</span>
        </div>
        <div className="divide-y divide-line">
          {list.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-mute">
              아직 가입한 사용자가 없습니다.
            </p>
          ) : (
            list.map((u) => <UserRow key={u.id} user={u} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "premium";
}) {
  const colorMap = {
    default: "text-ink",
    success: "text-success",
    danger: "text-danger",
    premium: "text-premium",
  };
  return (
    <div className="bg-surface rounded-xl2 shadow-card p-5">
      <p className="text-xs font-semibold text-mute mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[tone]}`}>{value}</p>
    </div>
  );
}
