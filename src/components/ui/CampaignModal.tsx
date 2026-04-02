"use client";

// =============================================================
// Sellix AI — Modal de creación de campaña
// Template selector → editor de mensaje → selector de canal → envío
// =============================================================

import { useState, useMemo, useCallback } from "react";
import {
  X, Mail, MessageCircle, Send, Check, AlertCircle,
  ChevronDown, ChevronUp, Users, Loader2,
} from "lucide-react";
import type {
  CampaignType, CampaignChannel, CampaignRecipient, CampaignResult,
} from "@/lib/types";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaignTemplates";

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CampaignType;
  recipients: CampaignRecipient[];
}

const typeLabels: Record<CampaignType, string> = {
  churn: "Recuperación de Clientes",
  reposicion: "Recordatorio de Reposición",
};

const channelConfig: {
  value: CampaignChannel;
  label: string;
  icon: typeof Mail;
  desc: string;
}[] = [
  { value: "email", label: "Email", icon: Mail, desc: "Correo electrónico" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, desc: "Mensaje de WhatsApp" },
  { value: "ambos", label: "Ambos", icon: Send, desc: "Email + WhatsApp" },
];

function replacePlaceholders(template: string, recipient: CampaignRecipient): string {
  return template
    .replace(/\{\{nombre\}\}/g, recipient.nombre)
    .replace(/\{\{producto\}\}/g, recipient.producto ?? "—")
    .replace(/\{\{proxima_reposicion\}\}/g, recipient.proxima_reposicion ?? "—")
    .replace(/\{\{dias_sin_comprar\}\}/g, String(recipient.dias_sin_comprar ?? "—"))
    .replace(/\{\{ciclo_dias\}\}/g, String(Math.round(recipient.ciclo_dias ?? 0)))
    .replace(/\{\{estado\}\}/g, recipient.estado ?? "—")
    .replace(/\{\{nivel_riesgo\}\}/g, recipient.nivel_riesgo ?? "—");
}

export function CampaignModal({ isOpen, onClose, type, recipients }: CampaignModalProps) {
  const templates = useMemo(
    () => CAMPAIGN_TEMPLATES.filter((t) => t.type === type),
    [type]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [editedSubject, setEditedSubject] = useState(templates[0]?.subject ?? "");
  const [editedBody, setEditedBody] = useState(templates[0]?.body ?? "");
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);

  const previewRecipient = recipients[0];

  const preview = useMemo(() => {
    if (!previewRecipient) return { subject: editedSubject, body: editedBody };
    return {
      subject: replacePlaceholders(editedSubject, previewRecipient),
      body: replacePlaceholders(editedBody, previewRecipient),
    };
  }, [editedSubject, editedBody, previewRecipient]);

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      setSelectedTemplateId(templateId);
      setEditedSubject(tpl.subject);
      setEditedBody(tpl.body);
      setResult(null);
    },
    [templates]
  );

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          channel,
          templateId: selectedTemplateId,
          subject: editedSubject,
          body: editedBody,
          recipients,
        }),
      });

      const data: CampaignResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, sent: 0, errors: ["Error de conexión con el servidor"] });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-brand-blue px-6 py-5 text-white flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">
                Crear Campaña
              </p>
              <h2 className="text-lg font-bold">{typeLabels[type]}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
            {/* Destinatarios */}
            <div className="bg-gray-50 rounded-xl p-4">
              <button
                onClick={() => setShowRecipients(!showRecipients)}
                className="flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Users className="w-4 h-4 text-brand-blue" />
                  {recipients.length} {recipients.length === 1 ? "cliente seleccionado" : "clientes seleccionados"}
                </span>
                {showRecipients ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showRecipients && (
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {recipients.map((r) => (
                    <div key={r.cedula + (r.producto ?? "")} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2 h-2 bg-brand-blue rounded-full flex-shrink-0" />
                      <span className="font-medium">{r.nombre}</span>
                      {r.producto && <span className="text-gray-400">— {r.producto}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selector de plantilla */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Plantilla de mensaje
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Canal de envío */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Canal de envío
              </label>
              <div className="grid grid-cols-3 gap-3">
                {channelConfig.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => { setChannel(ch.value); setResult(null); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      channel === ch.value
                        ? "border-brand-blue bg-blue-50 text-brand-blue"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <ch.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Asunto (solo email) */}
            {(channel === "email" || channel === "ambos") && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Asunto del email
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => { setEditedSubject(e.target.value); setResult(null); }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>
            )}

            {/* Cuerpo del mensaje */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Mensaje (editable)
              </label>
              <textarea
                value={editedBody}
                onChange={(e) => { setEditedBody(e.target.value); setResult(null); }}
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables disponibles: {"{{nombre}}"}, {"{{producto}}"}, {"{{proxima_reposicion}}"}, {"{{dias_sin_comprar}}"}, {"{{ciclo_dias}}"}
              </p>
            </div>

            {/* Vista previa */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Vista previa ({previewRecipient?.nombre ?? "—"})
              </label>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                {(channel === "email" || channel === "ambos") && (
                  <p className="text-xs text-green-700">
                    <strong>Asunto:</strong> {preview.subject}
                  </p>
                )}
                <p className="text-sm text-green-900 whitespace-pre-line leading-relaxed">
                  {preview.body}
                </p>
              </div>
            </div>

            {/* Aviso demo */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Modo demo:</strong> Todos los mensajes se enviarán al email y teléfono
                configurados en las variables de entorno, no a los clientes reales.
              </p>
            </div>

            {/* Resultado */}
            {result && (
              <div
                className={`flex items-start gap-2 rounded-lg p-4 ${
                  result.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {result.success ? (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${result.success ? "text-green-700" : "text-red-700"}`}>
                    {result.success
                      ? `Campaña enviada: ${result.sent} mensaje(s)`
                      : "Hubo errores en el envío"}
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-red-600">{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              {result?.success ? "Cerrar" : "Cancelar"}
            </button>
            {!result?.success && (
              <button
                onClick={handleSend}
                disabled={sending || recipients.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Campaña ({recipients.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
