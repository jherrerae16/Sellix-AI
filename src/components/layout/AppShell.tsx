"use client";

import { useRole } from "@/lib/RoleContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { LandingPage } from "@/components/landing/LandingPage";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useRole();

  // No role selected → show landing page
  if (!role) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
