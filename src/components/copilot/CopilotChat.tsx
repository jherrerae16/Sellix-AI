"use client";

// =============================================================
// Sellix AI — Copilot Chat Panel
// Chat en lenguaje natural que ejecuta funciones del sistema
// =============================================================

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  X, Send, Loader2, Bot, User, Sparkles,
  ArrowRight, Table2, BarChart3,
} from "lucide-react";
import type { CopilotMessage, CopilotData } from "@/lib/types";

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Muéstrame los clientes con mayor riesgo de abandono",
  "¿Qué clientes necesitan reposición esta semana?",
  "¿Cuáles son los KPIs del negocio?",
  "¿Quiénes son mis clientes VIP?",
  "¿Qué productos se venden juntos?",
  "Quiero enviar un mensaje a los clientes en riesgo",
];

function DataBlock({ data }: { data: CopilotData }) {
  if (data.type === "kpi" && data.kpis) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-sm font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>
    );
  }

  if (data.type === "table" && data.rows && data.columns) {
    return (
      <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <Table2 className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{data.title}</span>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {data.columns.map((col) => (
                <th key={col} className="px-2 py-1.5 text-left font-semibold text-gray-500 uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {data.columns!.map((col) => (
                  <td key={col} className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
                    {typeof row[col] === "number"
                      ? row[col].toLocaleString("es-CO")
                      : String(row[col] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.type === "actions" && data.actions) {
    return (
      <div className="mt-3 space-y-2">
        {data.actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 px-3 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            {action.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ))}
      </div>
    );
  }

  return null;
}

export function CopilotChat({ isOpen, onClose }: CopilotChatProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: CopilotMessage = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const assistantMsg: CopilotMessage = {
        role: "assistant",
        content: data.response,
        data: data.data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Hubo un error procesando tu consulta. Intenta de nuevo.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-brand-blue to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Copiloto Sellix AI</h2>
              <p className="text-blue-200 text-xs">Pregunta lo que necesites</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">¡Hola! Soy tu copiloto</p>
                <p className="text-xs text-gray-400 mt-1">
                  Pregúntame sobre clientes, ventas, churn o reposiciones
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  Prueba preguntar:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-sm text-gray-600 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-brand-blue transition-colors border border-transparent hover:border-blue-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 bg-brand-blue rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-blue text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.data && <DataBlock data={msg.data} />}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 bg-brand-blue rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Escribe tu consulta..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 bg-brand-blue text-white rounded-xl flex items-center justify-center hover:bg-blue-800 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
            <BarChart3 className="w-3 h-3" />
            Powered by Gemini · Datos en tiempo real
          </p>
        </div>
      </div>
    </>
  );
}
