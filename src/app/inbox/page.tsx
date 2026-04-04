"use client";

// =============================================================
// Sellix AI — Inbox CRM WhatsApp
// Pestañas: Chats (inbox) + Embudo (kanban por etapa)
// =============================================================

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Filter, Loader2, BarChart3,
  Users, DollarSign, AlertCircle, Clock,
} from "lucide-react";
import type { Conversation, CRMSummary, ConversationStage, ConversationStatus } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";
import { ChatList } from "./ChatList";
import { Funnel } from "./Funnel";
import { ChatDetail } from "./ChatDetail";

type Tab = "chats" | "embudo";

export default function InboxPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [summary, setSummary] = useState<CRMSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/crm");
    const data = await res.json();
    setConvs(data.conversations);
    setSummary(data.summary);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedConv = convs.find((c) => c.id === selectedId) || null;

  const handleAction = async (id: string, action: string, data?: Record<string, unknown>) => {
    const res = await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...data }),
    });
    if (res.ok) await loadData();
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
