"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CopilotChat } from "@/components/copilot/CopilotChat";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useRole();
  const [copilotOpen, setCopilotOpen] = useState(false);

  // If authenticated but no role selected, default to admin
  useEffect(() => {
    if (!role) {
      setRole("admin");
    }
  }, [role, setRole]);

  // Show nothing while role is being set
  if (!role) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Copilot FAB — only for admin */}
      {role === "admin" && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-gradient-to-br from-brand-blue to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all"
          title="Abrir Copiloto"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      <CopilotChat isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
