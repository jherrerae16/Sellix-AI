"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Phone, User, Package, CreditCard, Truck,
  Tag, StickyNote, ChevronDown, CheckCircle2,
  Link2, MessageCircle, Bot,
} from "lucide-react";
import type { Conversation, ConversationStage } from "@/lib/types";
import { formatCOP, formatDate } from "@/lib/formatters";

interface ChatDetailProps {
  conversation: Conversation;
  onAction: (id: string, action: string, data?: Record<string, unknown>) => void;
}

const STAGE_LABELS: Record<ConversationStage, { label: string; color: string }> = {
  lead: { label: "Lead inicial", color: "bg-gray-100 text-gray-700" },
  seguimiento: { label: "Seguimiento", color: "bg-blue-100 text-blue-700" },
  potencial: { label: "Cliente potencial", color: "bg-violet-100 text-violet-700" },
  venta: { label: "Venta", color: "bg-emerald-100 text-emerald-700" },
  postventa: { label: "Postventa", color: "bg-amber-100 text-amber-700" },
};

const STAGES: ConversationStage[] = ["lead", "seguimiento", "potencial", "venta", "postventa"];

export function ChatDetail({ conversation: conv, onAction }: ChatDetailProps) {
  const [message, setMessage] = useState("");
  const [newNote, setNewNote] = useState(conv.notes);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv.messages.length]);

  useEffect(() => { setNewNote(conv.notes); }, [conv.notes]);

  const sendMessage = () => {
    if (!message.trim()) return;
    onAction(conv.id, "send_message", { text: message });
    setMessage("");
  };

  const stageInfo = STAGE_LABELS[conv.stage];

  return (
    <div className="flex-1 flex overflow-hidden rounded-xl border border-gray-200">
      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-bold">
              {conv.cliente.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{conv.cliente.nombre}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />{conv.cliente.telefono}
              </p>
            </div>
          </div>

          {/* Stage selector */}
          <div className="relative flex items-center gap-2">
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5" title="El embudo se actualiza automáticamente según la conversación">
              <Bot className="w-3 h-3" />auto
            </span>
            <button
              onClick={() => setShowStageMenu(!showStageMenu)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${stageInfo.color}`}
            >
              {stageInfo.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStageMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 w-44">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { onAction(conv.id, "update_stage", { stage: s }); setShowStageMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 ${
                        conv.stage === s ? "text-brand-blue bg-blue-50" : "text-gray-700"
                      }`}
                    >
                      {STAGE_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
          {conv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "cliente" ? "justify-start" : msg.from === "sistema" ? "justify-center" : "justify-end"}`}
            >
              {msg.from === "sistema" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                  <Bot className="w-3 h-3 text-blue-500" />
                  <p className="text-xs text-blue-700 whitespace-pre-wrap">{msg.text}</p>
                </div>
              ) : (
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.from === "cliente"
                    ? "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                    : "bg-brand-blue text-white rounded-br-md"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === "cliente" ? "text-gray-400" : "text-blue-200"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right sidebar — Order + Actions */}
      <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Client info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Cliente
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{conv.cliente.nombre}</p>
              <p className="text-gray-500">{conv.cliente.telefono}</p>
              {conv.cliente.cedula && <p className="text-gray-400 text-xs">CC {conv.cliente.cedula}</p>}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Etiquetas
            </h3>
            <div className="flex flex-wrap gap-1">
              {conv.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                  <button
                    onClick={() => onAction(conv.id, "remove_tag", { tag })}
                    className="ml-1 text-gray-400 hover:text-red-500"
                  >×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" /> Notas
            </h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onBlur={() => { if (newNote !== conv.notes) onAction(conv.id, "update_notes", { notes: newNote }); }}
              placeholder="Notas internas..."
              rows={2}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg resize-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Order */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Pedido
            </h3>
            {conv.order ? (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {conv.order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700 truncate flex-1">{item.cantidad}x {item.nombre}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">{formatCOP(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-emerald-700">{formatCOP(conv.order.total)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    conv.order.status === "pagado" || conv.order.status === "entregado"
                      ? "bg-emerald-100 text-emerald-700"
                      : conv.order.status === "confirmado"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {conv.order.status}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  // Quick demo order with random product
                  const p = [
                    { codigo: "100012356", nombre: "LOSARTAN 50 MG 30 TAB", cantidad: 1, precio_unidad: 12000, subtotal: 12000 },
                  ];
                  onAction(conv.id, "create_order", { items: p });
                }}
                className="w-full py-2 text-xs font-medium text-brand-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                + Crear pedido
              </button>
            )}
          </div>

          {/* Payment actions */}
          {conv.order && !conv.order.payment && (
            <button
              onClick={() => onAction(conv.id, "generate_payment_link")}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" /> Generar link de pago
            </button>
          )}

          {conv.order?.payment?.status === "pendiente" && (
            <button
              onClick={() => onAction(conv.id, "confirm_payment", { method: "Nequi" })}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" /> Confirmar pago
            </button>
          )}

          {conv.order?.status === "pagado" && (
            <button
              onClick={() => onAction(conv.id, "mark_delivered")}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" /> Marcar como entregado
            </button>
          )}

          {conv.order?.status === "entregado" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">Pedido entregado</p>
              </div>
              <button
                onClick={() => onAction(conv.id, "reset_conversation")}
                className="w-full py-2 text-xs font-medium text-brand-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Nuevo pedido (reiniciar ciclo)
              </button>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              {(conv.stage !== "lead" || conv.order) && (
                <button
                  onClick={() => { if (confirm("¿Reiniciar conversación? Se borrará el pedido actual.")) onAction(conv.id, "reset_conversation"); }}
                  className="flex-1 py-2 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  Reiniciar
                </button>
              )}
              <button
                onClick={() => { if (confirm("¿Eliminar esta conversación permanentemente?")) onAction(conv.id, "delete_conversation"); }}
                className="flex-1 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
