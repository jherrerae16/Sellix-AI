"use client";

import {
  UserPlus, PhoneCall, UserCheck, ShoppingCart, Heart,
  Phone, Package, CreditCard, ArrowRight,
} from "lucide-react";
import type { Conversation, ConversationStage } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface FunnelProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAction: (id: string, action: string, data?: Record<string, unknown>) => void;
}

const STAGES: {
  key: ConversationStage;
  label: string;
  icon: React.ReactNode;
  color: string;
  headerBg: string;
}[] = [
  { key: "lead", label: "Lead inicial", icon: <UserPlus className="w-4 h-4" />, color: "border-t-gray-400", headerBg: "bg-gray-50" },
  { key: "seguimiento", label: "Seguimiento", icon: <PhoneCall className="w-4 h-4" />, color: "border-t-blue-500", headerBg: "bg-blue-50" },
  { key: "potencial", label: "Cliente potencial", icon: <UserCheck className="w-4 h-4" />, color: "border-t-violet-500", headerBg: "bg-violet-50" },
  { key: "venta", label: "Venta", icon: <ShoppingCart className="w-4 h-4" />, color: "border-t-emerald-500", headerBg: "bg-emerald-50" },
  { key: "postventa", label: "Postventa", icon: <Heart className="w-4 h-4" />, color: "border-t-amber-500", headerBg: "bg-amber-50" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function ConvCard({
  conv,
  onSelect,
  onMoveNext,
  nextStage,
}: {
  conv: Conversation;
  onSelect: () => void;
  onMoveNext?: () => void;
  nextStage?: string;
}) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            conv.unread > 0 ? "bg-red-500" : "bg-brand-blue"
          }`}>
            {conv.cliente.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{conv.cliente.nombre}</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" />{conv.cliente.telefono}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
      </div>

      {/* Last message */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
        {conv.messages[conv.messages.length - 1]?.text.slice(0, 80)}
      </p>

      {/* Tags + Order badge */}
      <div className="flex items-center gap-1 flex-wrap">
        {conv.unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{conv.unread} nuevo</span>
        )}
        {conv.order && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${
            conv.order.payment?.status === "pagado" ? "bg-emerald-100 text-emerald-700" :
            conv.order.payment?.status === "pendiente" ? "bg-orange-100 text-orange-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {conv.order.payment?.status === "pagado" ? <CreditCard className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
            {conv.order.payment?.status === "pagado"
              ? formatCOP(conv.order.total)
              : conv.order.status}
          </span>
        )}
        {conv.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
        ))}
      </div>

      {/* Move to next stage */}
      {onMoveNext && nextStage && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveNext(); }}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-brand-blue bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100"
        >
          Mover a {nextStage} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function Funnel({ conversations, onSelect, onAction }: FunnelProps) {
  return (
    <div className="flex-1 flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage, stageIdx) => {
        const stageConvs = conversations.filter((c) => c.stage === stage.key);
        const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
        const totalValue = stageConvs
          .filter((c) => c.order)
          .reduce((s, c) => s + (c.order?.total || 0), 0);

        return (
          <div
            key={stage.key}
            className={`flex-1 min-w-[220px] bg-gray-50 rounded-xl border border-gray-200 border-t-4 ${stage.color} flex flex-col overflow-hidden`}
          >
            {/* Stage header */}
            <div className={`px-3 py-3 ${stage.headerBg} flex items-center justify-between flex-shrink-0`}>
              <div className="flex items-center gap-2">
                {stage.icon}
                <div>
                  <p className="text-xs font-bold text-gray-800">{stage.label}</p>
                  <p className="text-[10px] text-gray-500">{stageConvs.length} chats</p>
                </div>
              </div>
              {totalValue > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {formatCOP(totalValue)}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {stageConvs.map((conv) => (
                <ConvCard
                  key={conv.id}
                  conv={conv}
                  onSelect={() => onSelect(conv.id)}
                  onMoveNext={nextStage ? () => onAction(conv.id, "update_stage", { stage: nextStage.key }) : undefined}
                  nextStage={nextStage?.label}
                />
              ))}
              {stageConvs.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">Sin chats</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
