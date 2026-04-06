"use client";

// =============================================================
// Sellix AI — Inbox CRM WhatsApp
// Pestañas: Chats (inbox) + Embudo (kanban por etapa)
// =============================================================

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Filter, Loader2, BarChart3,
  Users, DollarSign, AlertCircle, Clock,
  Bot, UserCog, Hand,
} from "lucide-react";
import type { Conversation, CRMSummary } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";
import { ChatList } from "@/components/inbox/ChatList";
import { Funnel } from "@/components/inbox/Funnel";
import { ChatDetail } from "@/components/inbox/ChatDetail";

type Tab = "chats" | "embudo";
type BotMode = "auto" | "copilot" | "manual";

const MODE_CONFIG: { key: BotMode; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { key: "auto", label: "Automático", icon: <Bot className="w-3.5 h-3.5" />, desc: "IA responde sola", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { key: "copilot", label: "Co-piloto", icon: <UserCog className="w-3.5 h-3.5" />, desc: "IA sugiere, tú apruebas", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { key: "manual", label: "Manual", icon: <Hand className="w-3.5 h-3.5" />, desc: "Tú respondes todo", color: "text-gray-700 bg-gray-50 border-gray-200" },
];

export default function InboxPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [summary, setSummary] = useState<CRMSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [botMode, setBotMode] = useState<BotMode>("auto");

  const loadData = useCallback(async () => {
    const res = await fetch("/api/crm");
    const data = await res.json();
    setConvs(data.conversations);
    setSummary(data.summary);
    setLoading(false);
  }, []);

  const loadBotConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/bot");
      const data = await res.json();
      setBotMode(data.mode || "auto");
    } catch { /* ignore */ }
  }, []);

  const changeBotMode = async (mode: BotMode) => {
    setBotMode(mode);
    await fetch("/api/bot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
  };

  useEffect(() => {
    loadData();
    loadBotConfig();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData, loadBotConfig]);

  const selectedConv = convs.find((c) => c.id === selectedId) || null;

  const handleAction = async (id: string, action: string, data?: Record<string, unknown>) => {
    const res = await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...data }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.deleted) {
        // Remove from local state
        setConvs((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) setSelectedId(null);
      } else if (result.conversation) {
        // Update locally without refetching
        setConvs((prev) =>
          prev.map((c) => (c.id === result.conversation.id ? result.conversation : c))
        );
      } else {
        await loadData();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header + KPIs */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Inbox WhatsApp
            </h1>
            <p className="text-sm text-gray-500">{summary?.total_conversaciones} conversaciones</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Bot mode toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {MODE_CONFIG.map((m) => (
                <button
                  key={m.key}
                  onClick={() => changeBotMode(m.key)}
                  title={m.desc}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
                    botMode === m.key ? m.color : "text-gray-400 bg-white hover:bg-gray-50"
                  }`}
                >
                  {m.icon}{m.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: "chats" as Tab, label: "Chats", icon: <MessageCircle className="w-4 h-4" /> },
                { key: "embudo" as Tab, label: "Embudo", icon: <Filter className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        {summary && (
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500 bg-red-50 rounded-lg p-1.5" />
              <div>
                <p className="text-lg font-bold text-red-700">{summary.no_respondidos}</p>
                <p className="text-xs text-gray-500">Sin responder</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500 bg-orange-50 rounded-lg p-1.5" />
              <div>
                <p className="text-lg font-bold text-orange-700">{summary.pendientes_pago}</p>
                <p className="text-xs text-gray-500">Pago pendiente</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-blue bg-blue-50 rounded-lg p-1.5" />
              <div>
                <p className="text-lg font-bold text-brand-blue">{summary.total_conversaciones}</p>
                <p className="text-xs text-gray-500">Total chats</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5" />
              <div>
                <p className="text-lg font-bold text-emerald-700">{summary.ventas_hoy}</p>
                <p className="text-xs text-gray-500">Ventas</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5" />
              <div>
                <p className="text-lg font-bold text-emerald-700">{formatCOP(summary.ingresos_hoy)}</p>
                <p className="text-xs text-gray-500">Ingresos</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {activeTab === "chats" ? (
          <>
            <ChatList
              conversations={convs}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {selectedConv ? (
              <ChatDetail
                conversation={selectedConv}
                onAction={handleAction}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Seleccione una conversación</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <Funnel conversations={convs} onSelect={setSelectedId} onAction={handleAction} />
        )}
      </div>
    </div>
  );
}
