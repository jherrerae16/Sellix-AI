"use client";

// =============================================================
// Sellix AI — Promotion Modal
// Admin genera oferta de producto → sistema identifica clientes
// con mayor probabilidad de comprar → envía campaña
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Search, Package, Sparkles, Phone, PhoneOff, Loader2,
  Send, CheckCircle2, AlertCircle, TrendingUp, Tag, ArrowRight,
} from "lucide-react";
import type { PromotionMatch, ProductPrice, CampaignResult } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "producto" | "config" | "clientes" | "mensaje" | "enviado";

// Confirm bulk send if recipients exceed this threshold
const BULK_CONFIRM_THRESHOLD = 20;

/**
 * Returns the most representative price for a product:
 * box price if available, else unit price, else 0.
 */
function getBasePrice(p: ProductPrice | null): number {
  if (!p) return 0;
  return p.precio_caja || p.precio_unidad || 0;
}

/**
 * Sanitize a string used in WhatsApp messages.
 * - Trims whitespace
 * - Falls back to "Cliente" if empty
 * - Removes characters that could break formatting (backticks, asterisks at edges)
 */
function safeName(name: string | null | undefined): string {
  if (!name) return "Cliente";
  const cleaned = name
    .replace(/[`]/g, "")            // remove backticks
    .replace(/^\*+|\*+$/g, "")     // strip leading/trailing asterisks
    .trim();
  return cleaned || "Cliente";
}

export function PromotionModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>("producto");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductPrice[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductPrice | null>(null);

  // Config
  const [cantidadDisponible, setCantidadDisponible] = useState(50);
  const [precioPromo, setPrecioPromo] = useState(0);
  const [vigencia, setVigencia] = useState("7");

  // Matches
  const [matches, setMatches] = useState<PromotionMatch[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [onlyContactables, setOnlyContactables] = useState(true);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Message
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email" | "ambos">("whatsapp");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep("producto");
      setQuery("");
      setResults([]);
      setSelectedProduct(null);
      setMatches([]);
      setSelectedClients(new Set());
      setResult(null);
    }
  }, [isOpen]);

  // Search products with AbortController to prevent stale results
  const searchAbortRef = useRef<AbortController | null>(null);

  const searchProducts = useCallback(async (q: string, signal: AbortSignal) => {
    if (q.length < 2) { setResults([]); return; }
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(q)}&limit=8&online=false`,
        { signal },
      );
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      setResults(data.results || []);
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      if (!signal.aborted) setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    // Cancel previous in-flight request
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;

    const t = setTimeout(() => searchProducts(query, ctrl.signal), 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, searchProducts]);

  const selectProduct = (p: ProductPrice) => {
    setSelectedProduct(p);
    setPrecioPromo(Math.round(getBasePrice(p) * 0.85)); // 15% default discount
    setStep("config");
  };

  const findMatches = async () => {
    if (!selectedProduct) return;
    setLoadingMatch(true);
    setStep("clientes");
    try {
      const res = await fetch("/api/promotions/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: selectedProduct.codigo,
          nombre: selectedProduct.nombre,
        }),
      });
      const data = await res.json();
      const allMatches = data.matches || [];
      setMatches(allMatches);
      // Auto-select all contactables
      const contactables = allMatches.filter((m: PromotionMatch) => m.contactable);
      setSelectedClients(new Set(contactables.map((m: PromotionMatch) => m.cedula)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatch(false);
    }
  };

  const filteredMatches = onlyContactables
    ? matches.filter((m) => m.contactable)
    : matches;

  const toggleClient = (cedula: string) => {
    const next = new Set(selectedClients);
    if (next.has(cedula)) next.delete(cedula);
    else next.add(cedula);
    setSelectedClients(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedClients);
    filteredMatches.forEach((m) => { if (m.contactable) next.add(m.cedula); });
    setSelectedClients(next);
  };

  const clearAll = () => setSelectedClients(new Set());

  const goToMessage = () => {
    if (!selectedProduct) return;
    const basePrice = getBasePrice(selectedProduct);
    const descuento = basePrice > 0 ? Math.round(((basePrice - precioPromo) / basePrice) * 100) : 0;
    const ahorro = Math.max(0, basePrice - precioPromo);

    const tpl = `¡Hola {{nombre}}! 👋

Tenemos una oferta especial para ti en *${selectedProduct.nombre}*

💰 Precio especial: *${formatCOP(precioPromo)}* (${descuento}% OFF)
📦 Antes: ${formatCOP(basePrice)}
🎁 Te ahorras: ${formatCOP(ahorro)}

⏰ Oferta válida por ${vigencia} días. Solo ${cantidadDisponible} unidades disponibles.

Responde SÍ si quieres que te lo separemos 🛒

Droguería Super Ofertas 💊`;
    setMessage(tpl);
    setStep("mensaje");
  };

  const sendCampaign = async () => {
    const recipients = matches
      .filter((m) => selectedClients.has(m.cedula))
      .map((m) => ({
        cedula: m.cedula,
        nombre: safeName(m.nombre),
        telefono: m.telefono,
      }));

    // Confirm bulk sends to prevent accidental mass campaigns
    if (recipients.length > BULK_CONFIRM_THRESHOLD) {
      const ok = window.confirm(
        `Vas a enviar mensajes a ${recipients.length} clientes. ¿Confirmas?`
      );
      if (!ok) return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reposicion",
          channel,
          templateId: "promocion-custom",
          subject: `Oferta especial: ${selectedProduct?.nombre}`,
          body: message,
          recipients,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) setStep("enviado");
    } catch {
      setResult({ success: false, sent: 0, errors: ["Error de conexión"] });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const contactablesCount = matches.filter((m) => m.contactable).length;
  const selectedCount = selectedClients.size;
  const potentialRevenue = selectedCount * precioPromo;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Generar oferta</p>
                <h2 className="text-lg font-bold">
                  {step === "producto" && "Selecciona el producto en oferta"}
                  {step === "config" && "Configura la promoción"}
                  {step === "clientes" && "Clientes que deberías contactar"}
                  {step === "mensaje" && "Personaliza el mensaje"}
                  {step === "enviado" && "¡Oferta enviada!"}
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 flex-shrink-0">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{
                width: step === "producto" ? "20%"
                  : step === "config" ? "40%"
                  : step === "clientes" ? "60%"
                  : step === "mensaje" ? "80%"
                  : "100%",
              }}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* STEP 1: Select product */}
            {step === "producto" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar producto... (ej: dolex, acetaminofén)"
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                  />
                  {loadingSearch && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
                  )}
                </div>

                <div className="space-y-2">
                  {results.map((p) => (
                    <button
                      key={p.codigo}
                      onClick={() => selectProduct(p)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                          <p className="text-xs text-gray-500">{p.categoria}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-gray-900">{formatCOP(getBasePrice(p))}</p>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 ml-auto mt-1" />
                      </div>
                    </button>
                  ))}
                  {query.length >= 2 && !loadingSearch && results.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">No se encontraron productos</p>
                  )}
                  {query.length < 2 && (
                    <p className="text-center text-sm text-gray-400 py-8">Escribe al menos 2 letras para buscar</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Configure */}
            {step === "config" && selectedProduct && (() => {
              const basePrice = getBasePrice(selectedProduct);
              return (
              <div className="space-y-5">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Producto</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{selectedProduct.nombre}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Precio actual: {formatCOP(basePrice)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cantidad disponible
                    </label>
                    <input
                      type="number"
                      value={cantidadDisponible}
                      onChange={(e) => setCantidadDisponible(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Vigencia (días)
                    </label>
                    <input
                      type="number"
                      value={vigencia}
                      onChange={(e) => setVigencia(e.target.value)}
                      className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Precio en promoción
                  </label>
                  <input
                    type="number"
                    value={precioPromo}
                    onChange={(e) => setPrecioPromo(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-semibold"
                  />
                  {basePrice > 0 && precioPromo > 0 && precioPromo < basePrice && (
                    <p className="mt-2 text-xs text-emerald-600 font-semibold">
                      Descuento: {Math.round(((basePrice - precioPromo) / basePrice) * 100)}%
                      — Ahorro cliente: {formatCOP(basePrice - precioPromo)}
                    </p>
                  )}
                </div>
              </div>
              );
            })()}

            {/* STEP 3: Clients */}
            {step === "clientes" && (
              <div className="space-y-4">
                {loadingMatch ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Identificando clientes con mayor probabilidad...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-12">
                    No se encontraron clientes con alta probabilidad de comprar este producto
                  </p>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-indigo-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-indigo-600 font-semibold uppercase">Total coincidencias</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{matches.length}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-emerald-600 font-semibold uppercase">Contactables</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{contactablesCount}</p>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-violet-600 font-semibold uppercase">Seleccionados</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{selectedCount}</p>
                      </div>
                    </div>

                    {potentialRevenue > 0 && (
                      <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 rounded-xl p-4 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Ingreso potencial</p>
                          <p className="text-lg font-bold text-emerald-700">
                            {formatCOP(potentialRevenue)} si todos compran
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Filter toggle + bulk actions */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setOnlyContactables(!onlyContactables)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          onlyContactables
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {onlyContactables ? <Phone className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}
                        Solo contactables
                      </button>
                      <div className="flex gap-2 text-xs">
                        <button onClick={selectAllVisible} className="text-indigo-600 hover:underline font-medium">
                          Seleccionar todos
                        </button>
                        <span className="text-gray-300">·</span>
                        <button onClick={clearAll} className="text-gray-500 hover:underline">
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {/* Client list */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      {filteredMatches.map((m) => (
                        <label
                          key={m.cedula}
                          className={`flex items-center gap-3 p-3 border-b border-gray-50 last:border-b-0 cursor-pointer transition-colors ${
                            selectedClients.has(m.cedula) ? "bg-indigo-50/50" : "hover:bg-gray-50"
                          } ${!m.contactable ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClients.has(m.cedula)}
                            onChange={() => toggleClient(m.cedula)}
                            disabled={!m.contactable}
                            className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{m.nombre || "(sin nombre)"}</p>
                              {m.contactable ? (
                                <Phone className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <PhoneOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {m.razones.slice(0, 2).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                              m.score >= 70 ? "bg-emerald-100 text-emerald-700" :
                              m.score >= 40 ? "bg-indigo-100 text-indigo-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              <TrendingUp className="w-3 h-3" />{m.score}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 4: Message */}
            {step === "mensaje" && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Enviando a <span className="font-bold">{selectedCount} clientes</span>
                      {" · "}
                      Ingreso potencial <span className="font-bold text-emerald-700">{formatCOP(potentialRevenue)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[
                    { v: "whatsapp", label: "WhatsApp" },
                    { v: "email", label: "Email" },
                    { v: "ambos", label: "Ambos" },
                  ].map((c) => (
                    <button
                      key={c.v}
                      onClick={() => setChannel(c.v as typeof channel)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${
                        channel === c.v
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Mensaje personalizable
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={10}
                    className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Variables: <code>{`{{nombre}}`}</code> se reemplaza con el nombre del cliente
                  </p>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Modo demo:</strong> Los mensajes se envían al email/teléfono configurado en .env.local,
                    no a los clientes reales.
                  </p>
                </div>

                {result && !result.success && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700">{result.errors[0]}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Sent */}
            {step === "enviado" && result?.success && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Campaña enviada</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Se enviaron <span className="font-semibold">{result.sent} mensajes</span> a tus clientes objetivo
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  Puedes seguir el progreso desde el Inbox de WhatsApp
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50">
            {step === "producto" && (
              <>
                <span className="text-xs text-gray-400">Paso 1 de 4</span>
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Cancelar
                </button>
              </>
            )}
            {step === "config" && (
              <>
                <button onClick={() => setStep("producto")} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Cambiar producto
                </button>
                <button
                  onClick={findMatches}
                  disabled={precioPromo <= 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  Buscar clientes <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
            {step === "clientes" && (
              <>
                <button onClick={() => setStep("config")} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Volver
                </button>
                <button
                  onClick={goToMessage}
                  disabled={selectedCount === 0 || loadingMatch}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  Continuar con {selectedCount} clientes <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
            {step === "mensaje" && (
              <>
                <button onClick={() => setStep("clientes")} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Volver
                </button>
                <button
                  onClick={sendCampaign}
                  disabled={sending || !message.trim() || selectedCount === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar a {selectedCount}</>
                  )}
                </button>
              </>
            )}
            {step === "enviado" && (
              <button
                onClick={onClose}
                className="ml-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
