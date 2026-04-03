"use client";

// =============================================================
// Sellix AI — Cotizador / Comparador de Precios
// Busca producto → muestra nuestro precio vs competencia
// → envía comparación por WhatsApp al cliente
// =============================================================

import { useState, useCallback } from "react";
import {
  Search, Loader2, Tag, TrendingDown, Send,
  CheckCircle2, ShieldCheck, MessageCircle, Mail,
  ArrowDown, Package, X, AlertCircle,
} from "lucide-react";
import type { ProductPrice, CampaignResult } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

function debounce(fn: (q: string) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (q: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(q), ms);
  };
}

function PriceCard({ product, onSend }: { product: ProductPrice; onSend: (p: ProductPrice) => void }) {
  const maxCompPrice = Math.max(...product.competidores.map((c) => c.precio));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="text-xs text-gray-400 font-mono">{product.codigo}</span>
            <h3 className="font-semibold text-gray-900 text-sm mt-0.5 leading-snug">{product.nombre}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Package className="w-3 h-3" />
                {product.categoria}
              </span>
              {product.transacciones && (
                <span className="text-xs text-gray-400">{product.transacciones} ventas</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-green-600 font-medium">Ahorro hasta</p>
            <p className="text-lg font-bold text-green-700">{product.ahorro_max_pct}%</p>
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div className="px-5 pb-4 space-y-2">
        {/* Our price — highlighted */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-blue" />
              <div>
                <p className="text-sm font-bold text-brand-blue">Droguería Super Ofertas</p>
                <p className="text-xs text-blue-500">Precio real de venta</p>
              </div>
            </div>
            <p className="text-xl font-bold text-brand-blue">{formatCOP(product.precio_nuestro)}</p>
          </div>
          {product.precio_caja && product.precio_caja > 0 && product.precio_unidad && product.precio_unidad !== product.precio_caja && (
            <div className="flex gap-3 mt-2 pt-2 border-t border-blue-200">
              <span className="text-xs text-blue-600">Unidad: <strong>{formatCOP(product.precio_unidad)}</strong></span>
              <span className="text-xs text-blue-600">Caja: <strong>{formatCOP(product.precio_caja)}</strong></span>
            </div>
          )}
        </div>

        {/* Competitors */}
        {product.competidores.map((comp) => (
          <div key={comp.nombre} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">{comp.nombre}</p>
                <p className="text-xs text-red-500">+{comp.diferencia_pct}% más caro</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-600 line-through decoration-red-400">
                {formatCOP(comp.precio)}
              </p>
            </div>
          </div>
        ))}

        {/* Savings summary */}
        <div className="flex items-center gap-2 pt-2">
          <ArrowDown className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700 font-medium">
            Ahorra hasta <strong>{formatCOP(product.ahorro_max)}</strong> comprando con nosotros
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <button
          onClick={() => onSend(product)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar por WhatsApp
        </button>
        <button
          onClick={() => onSend(product)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors"
        >
          <Mail className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SendModal({
  product,
  onClose,
}: {
  product: ProductPrice;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<"whatsapp" | "email" | "ambos">("whatsapp");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [customerName, setCustomerName] = useState("");

  const messageBody = `Cordial saludo${customerName ? ` ${customerName}` : ""},

Gracias por su consulta sobre *${product.nombre}*.

Nuestro precio: *${formatCOP(product.precio_nuestro)}*

Comparación con otras farmacias:
${product.competidores.map((c) => `• ${c.nombre}: ${formatCOP(c.precio)} (+${c.diferencia_pct}%)`).join("\n")}

Ahorra hasta *${formatCOP(product.ahorro_max)}* (${product.ahorro_max_pct}%) comprando con nosotros.

Lo esperamos en Droguería Super Ofertas o responda este mensaje para hacer su pedido.

Su salud, nuestra prioridad.`;

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reposicion",
          channel,
          templateId: "cotizacion-precio",
          subject: `Cotización: ${product.nombre}`,
          body: messageBody,
          recipients: [{
            cedula: "cotizacion",
            nombre: customerName || "Cliente",
            telefono: null,
          }],
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, sent: 0, errors: ["Error de conexión"] });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-xs font-medium uppercase">Enviar cotización</p>
              <h2 className="font-bold">{product.nombre}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {/* Customer name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Nombre del cliente (opcional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: María López"
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Channel */}
            <div className="flex gap-2">
              {[
                { value: "whatsapp" as const, label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
                { value: "email" as const, label: "Email", icon: <Mail className="w-4 h-4" /> },
                { value: "ambos" as const, label: "Ambos", icon: <Send className="w-4 h-4" /> },
              ].map((ch) => (
                <button
                  key={ch.value}
                  onClick={() => setChannel(ch.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    channel === ch.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {ch.icon}{ch.label}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Vista previa del mensaje</label>
              <div className="mt-1 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900 whitespace-pre-line leading-relaxed">
                {messageBody}
              </div>
            </div>

            {/* Demo notice */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Modo demo:</strong> El mensaje se enviará a tu email/WhatsApp personal configurado en .env.local
              </p>
            </div>

            {/* Result */}
            {result && (
              <div className={`flex items-center gap-2 rounded-lg p-3 ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                {result.success
                  ? <><CheckCircle2 className="w-5 h-5 text-green-600" /><p className="text-sm font-medium text-green-700">Cotización enviada</p></>
                  : <><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm font-medium text-red-700">{result.errors[0]}</p></>
                }
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800">{result?.success ? "Cerrar" : "Cancelar"}</button>
            {!result?.success && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Enviando..." : "Enviar cotización"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CotizadorPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductPrice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductPrice | null>(null);

  const searchProducts = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) { setResults([]); setTotal(0); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=20`);
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300),
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          Cotizador de Precios
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Busque un producto, compare precios con la competencia y envíe la cotización al cliente
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); searchProducts(e.target.value); }}
          placeholder="Buscar medicamento... ej: losartan, acetaminofen, omeprazol"
          className="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
          autoFocus
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />}
      </div>

      {/* Results count */}
      {query.length >= 2 && !loading && (
        <p className="text-sm text-gray-500">
          {total} {total === 1 ? "producto encontrado" : "productos encontrados"}
          {total > 20 && " (mostrando los 20 más relevantes)"}
        </p>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {results.map((product) => (
            <PriceCard
              key={product.codigo}
              product={product}
              onSend={setSelectedProduct}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No se encontraron productos para &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-1">Intente con otro nombre o término genérico</p>
        </div>
      )}

      {/* Initial state */}
      {!query && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <TrendingDown className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-emerald-800 font-medium">
            Escriba el nombre de un medicamento para ver nuestro precio vs la competencia
          </p>
          <p className="text-xs text-emerald-600 mt-2">
            Ideal para responder consultas de clientes por WhatsApp con datos concretos de ahorro
          </p>
        </div>
      )}

      {/* Send modal */}
      {selectedProduct && (
        <SendModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
