import { requireApproved } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireApproved();

  return (
    <div className="min-h-screen flex">
      <Sidebar isAdmin={profile.role === "admin"} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          email={profile.email}
          name={profile.name ?? ""}
          avatarUrl={profile.avatar_url ?? undefined}
        />
        <main className="flex-1 bg-bg">{children}</main>
      </div>
    </div>
  );
}
