import { requireApproved } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { SidebarProvider } from "@/components/dashboard/SidebarContext";
import SidebarOpenFloatingButton from "@/components/dashboard/SidebarOpenFloatingButton";
import ChannelTalk from "@/components/ChannelTalk";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireApproved();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex">
        <Sidebar
          isAdmin={profile.role === "admin"}
          isPremium={profile.tier === "premium"}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            email={profile.email}
            name={profile.name ?? ""}
            avatarUrl={profile.avatar_url ?? undefined}
          />
          <main className="flex-1 bg-bg">{children}</main>
        </div>
        <SidebarOpenFloatingButton />
      </div>
      <ChannelTalk
        profile={{
          id: profile.id,
          email: profile.email,
          name: profile.name,
        }}
      />
    </SidebarProvider>
  );
}
