"use client";

// =============================================================
// Sellix AI — Next Best Action (Approval-driven)
// Cards muestran acciones pre-armadas con mensaje IA + destinatarios.
// Manager revisa → aprueba → envío masivo en un clic.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, AlertTriangle, Target, Users, Flame, TrendingUp,
  Phone, RefreshCcw, ShoppingCart, Star, Zap, Sparkles,
  CheckCircle2, ChevronDown, ChevronUp, Send, AlertCircle,
} from "lucide-react";
import { formatCOP } from "@/lib/formatters";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { PromotionModal } from "@/components/ui/PromotionModal";

interface PreparedRecipient {
  cedula: string;
  nombre: string;
  telefono: string | null;
  contactable: boolean;
  score: number;
  razon: string;
  producto?: string;
}

interface PreparedAction {
  id: string;
  category: string;
  priority: "critica" | "alta" | "media" | "baja";
  title: string;
  description: string;
  recipients: PreparedRecipient[];
  suggested_message: string;
  channel: string;
  offer: { description?: string } | null;
  ingreso_estimado: number;
  ingreso_realista: number;
  status: string;
  computed_at: string;
}

const priorityConfig = {
  critica: { label: "Crítica", pill: "bg-red-50 text-red-700 border-red-200", stripe: "bg-red-500" },
  alta:    { label: "Alta",    pill: "bg-orange-50 text-orange-700 border-orange-200", stripe: "bg-orange-500" },
  media:   { label: "Media",   pill: "bg-indigo-50 text-indigo-700 border-indigo-200", stripe: "bg-indigo-500" },
  baja:    { label: "Baja",    pill: "bg-gray-50 text-gray-600 border-gray-200", stripe: "bg-gray-400" },
};

const categoryConfig: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  churn:         { icon: <AlertTriangle className="w-4 h-4" />, bg: "bg-red-50", text: "text-red-600" },
  reposicion:    { icon: <RefreshCcw className="w-4 h-4" />,    bg: "bg-blue-50", text: "text-blue-600" },
  venta_cruzada: { icon: <ShoppingCart className="w-4 h-4" />,  bg: "bg-emerald-50", text: "text-emerald-600" },
  vip:           { icon: <Star className="w-4 h-4" />,          bg: "bg-amber-50", text: "text-amber-600" },
  gancho:        { icon: <Zap className="w-4 h-4" />,           bg: "bg-violet-50", text: "text-violet-600" },
};

export default function AccionesPage() {
  const [actions, setActions] = useState<PreparedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; type: "ok" | "err" } | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/actions/prepared");
      const data = await res.json();
      setActions(data.actions ?? []);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function prepareNow() {
    setPreparing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/actions/prepare");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error preparando");
      setFeedback({
        id: "_global",
        type: "ok",
        msg: `${data.stats?.actions_prepared ?? 0} acciones armadas con ${data.stats?.recipients_total ?? 0} destinatarios`,
      });
      await load();
    } catch (e) {
      setFeedback({ id: "_global", type: "err", msg: e instanceof Error ? e.message : "Error" });
    } finally {
      setPreparing(false);
    }
  }

  async function approve(action: PreparedAction) {
    if (!confirm(`Enviar ${action.recipients.length} mensajes WhatsApp ahora? Esta acción registra una campaña real.`)) return;
    setApproving(action.id);
    setFeedback(null);
    try {
      const message = editedMessages[action.id] ?? action.suggested_message;
      const res = await fetch("/api/actions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: action.id, edited_message: message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error enviando");
      setFeedback({
        id: action.id,
        type: "ok",
        msg: `Enviado: ${data.sent} ok, ${data.failed} fallaron`,
      });
      await load();
    } catch (e) {
      setFeedback({
        id: action.id,
        type: "err",
        msg: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setApproving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalRecipients = actions.reduce((s, a) => s + a.recipients.length, 0);
  const totalRealista = actions.reduce((s, a) => s + a.ingreso_realista, 0);
  const totalEstimado = actions.reduce((s, a) => s + a.ingreso_estimado, 0);
  const criticas = actions.filter((a) => a.priority === "critica").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Next Best Action"
        subtitle="Acciones pre-armadas con mensaje, destinatarios y oferta. Apruebe en un clic."
        icon={<Target className="w-5 h-5" />}
        badge={
          criticas > 0 && (
            <span className="text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
              {criticas} críticas
            </span>
          )
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={prepareNow}
              disabled={preparing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 disabled:opacity-50"
            >
              {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {preparing ? "Armando…" : "Armar acciones"}
            </button>
            <button
              onClick={() => setPromotionOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl"
            >
              <Sparkles className="w-4 h-4" />
              Generar oferta
            </button>
          </div>
        }
      />

      {feedback?.id === "_global" && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            feedback.type === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No hay acciones armadas todavía</p>
          <p className="text-xs text-gray-500 mt-1">
            Click "Armar acciones" para que Sellix AI prepare las próximas mejores acciones con mensaje + destinatarios listos.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Acciones listas"
              value={actions.length}
              sublabel={`${criticas} críticas`}
              icon={<Target className="w-4 h-4" />}
              accent="indigo"
            />
            <StatCard
              label="Destinatarios"
              value={totalRecipients}
              sublabel="contactables seleccionados"
              icon={<Phone className="w-4 h-4" />}
              accent="emerald"
            />
            <StatCard
              label="Ingreso realista"
              value={formatCOP(totalRealista)}
              sublabel={`vs ${formatCOP(totalEstimado)} teórico`}
              icon={<TrendingUp className="w-4 h-4" />}
              accent="emerald"
            />
            <StatCard
              label="Tiempo de ejecución"
              value="1 clic"
              sublabel="por acción"
              icon={<Zap className="w-4 h-4" />}
              accent="violet"
            />
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {actions.map((action, i) => {
              const priority = priorityConfig[action.priority];
              const category = categoryConfig[action.category] ?? categoryConfig.churn;
              const isOpen = expanded === action.id;
              const isApproving = approving === action.id;
              const myFeedback = feedback?.id === action.id ? feedback : null;
              const editedMsg = editedMessages[action.id] ?? action.suggested_message;

              return (
                <div
                  key={action.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                    action.priority === "critica" ? "border-red-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex">
                    <div className={`w-1 flex-shrink-0 ${priority.stripe}`} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-300">#{i + 1}</span>
                            <span className={`w-7 h-7 ${category.bg} ${category.text} rounded-lg flex items-center justify-center`}>
                              {category.icon}
                            </span>
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priority.pill}`}>
                              {priority.label}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 tracking-tight">{action.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">{action.description}</p>

                          <div className="flex items-center gap-5 mt-3 flex-wrap">
                            <span className="flex items-center gap-1.5 text-sm">
                              <Phone className="w-3.5 h-3.5 text-emerald-500" />
                              <strong className="text-emerald-700">{action.recipients.length}</strong>
                              <span className="text-gray-500">contactables</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-gray-500">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              <strong className="text-emerald-700">{formatCOP(action.ingreso_realista)}</strong>
                              <span className="text-xs text-gray-400">realista</span>
                            </span>
                            <span className="text-xs text-gray-400">canal: {action.channel}</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => setExpanded(isOpen ? null : action.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                          >
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isOpen ? "Cerrar" : "Revisar"}
                          </button>
                          <button
                            onClick={() => approve(action)}
                            disabled={isApproving}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                              action.priority === "critica"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isApproving ? "Enviando…" : "Aprobar y enviar"}
                          </button>
                        </div>
                      </div>

                      {myFeedback && (
                        <div
                          className={`mt-3 px-3 py-2 rounded-lg text-xs ${
                            myFeedback.type === "ok"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {myFeedback.msg}
                        </div>
                      )}

                      {isOpen && (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                          {/* Mensaje editable */}
                          <div>
                            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Mensaje sugerido (editable)
                            </label>
                            <textarea
                              value={editedMsg}
                              onChange={(e) => setEditedMessages((p) => ({ ...p, [action.id]: e.target.value }))}
                              className="mt-1.5 w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono"
                              rows={4}
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              {`{{nombre}} se reemplaza por el nombre real del cliente al enviar.`}
                            </p>
                          </div>

                          {action.offer?.description && (
                            <div>
                              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Oferta sugerida</label>
                              <p className="mt-1 text-sm text-gray-600">{action.offer.description}</p>
                            </div>
                          )}

                          {/* Top 5 recipients preview */}
                          <div>
                            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Top destinatarios ({action.recipients.length} total)
                            </label>
                            <ul className="mt-1.5 divide-y divide-gray-100 bg-gray-50 rounded-lg">
                              {action.recipients.slice(0, 5).map((r) => (
                                <li key={r.cedula} className="flex items-center gap-3 px-3 py-2 text-xs">
                                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold flex items-center justify-center">
                                    {r.score}
                                  </span>
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-medium text-gray-900 flex-shrink-0">{r.nombre}</span>
                                  <span className="text-gray-500 truncate">{r.razon}</span>
                                </li>
                              ))}
                              {action.recipients.length > 5 && (
                                <li className="px-3 py-2 text-xs text-gray-500">
                                  +{action.recipients.length - 5} más…
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Flame className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">Cómo funciona</p>
            <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
              Cada 6 horas (o al click en "Armar acciones") Sellix AI analiza tus datos y prepara las próximas mejores acciones:
              selecciona top destinatarios contactables, genera mensaje WhatsApp con IA, y calcula impacto realista.
              Tú revisas, ajustas si quieres, y apruebas. Un clic = campaña enviada.
            </p>
          </div>
        </div>
      </div>

      <PromotionModal isOpen={promotionOpen} onClose={() => setPromotionOpen(false)} />
    </div>
  );
}
