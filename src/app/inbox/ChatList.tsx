"use client";

import { useState, useMemo } from "react";
import { Search, Phone, Tag, Circle } from "lucide-react";
import type { Conversation, ConversationStatus } from "@/lib/types";

interface ChatListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusFilters: { value: ConversationStatus | "todos"; label: string; color: string }[] = [
  { value: "todos", label: "Todos", color: "text-gray-600" },
  { value: "no_respondido", label: "Sin responder", color: "text-red-600" },
  { value: "activo", label: "Activos", color: "text-emerald-600" },
  { value: "pendiente_pago", label: "Pago pendiente", color: "text-orange-600" },
  { value: "postventa", label: "Postventa", color: "text-blue-600" },
  { value: "cerrado", label: "Cerrados", color: "text-gray-400" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ChatList({ conversations, selectedId, onSelect }: ChatListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "todos">("todos");

  const filtered = useMemo(() => {
    let list = conversations;
    if (statusFilter !== "todos") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.cliente.nombre.toLowerCase().includes(q) ||
        c.cliente.telefono.includes(q) ||
        c.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [conversations, statusFilter, search]);

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
        </div>
        {/* Status filter chips */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          const isSelected = conv.id === selectedId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-3 py-3 border-b border-gray-50 transition-colors ${
                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${
                  conv.status === "no_respondido" ? "bg-red-500" :
                  conv.status === "pendiente_pago" ? "bg-orange-500" :
                  conv.stage === "postventa" ? "bg-blue-500" : "bg-emerald-500"
                }`}>
                  {conv.cliente.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">{conv.cliente.nombre}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                  </div>

                  {/* Last message preview */}
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {lastMsg.from === "agente" && <span className="text-gray-400">Tú: </span>}
                    {lastMsg.from === "sistema" && <span className="text-blue-400">⚡ </span>}
                    {lastMsg.text.slice(0, 60)}
                  </p>

                  {/* Tags + unread badge */}
                  <div className="flex items-center gap-1 mt-1">
                    {conv.unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                    {conv.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        {tag}
                      </span>
                    ))}
                    {conv.order && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        conv.order.payment?.status === "pagado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {conv.order.payment?.status === "pagado" ? "Pagado" : "Pedido"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            Sin conversaciones
          </div>
        )}
      </div>
    </div>
  );
}
