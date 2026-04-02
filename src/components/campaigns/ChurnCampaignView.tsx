"use client";

// =============================================================
// Sellix AI — Wrapper de campaña para módulo Churn
// Agrega selección de filas + botón "Crear Campaña" + modal
// =============================================================

import { useState, useMemo } from "react";
import { Megaphone, X } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";
import type { ClienteChurn, CampaignRecipient } from "@/lib/types";
import { ChurnTable } from "@/components/tables/ChurnTable";
import { CampaignModal } from "@/components/ui/CampaignModal";

interface ChurnCampaignViewProps {
  data: ClienteChurn[];
}

export function ChurnCampaignView({ data }: ChurnCampaignViewProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [modalOpen, setModalOpen] = useState(false);

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  const selectedRecipients: CampaignRecipient[] = useMemo(() => {
    return data
      .filter((c) => rowSelection[c.cedula])
      .map((c) => ({
        cedula: c.cedula,
        nombre: c.nombre,
        telefono: c.telefono,
        nivel_riesgo: c.nivel_riesgo,
        dias_sin_comprar: c.dias_sin_comprar,
        accion_sugerida: c.accion_sugerida,
      }));
  }, [data, rowSelection]);

  return (
    <>
      <ChurnTable
        data={data}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableSelection
      />

      {/* Barra flotante de selección */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white border border-gray-200 shadow-2xl rounded-2xl px-5 py-3">
          <span className="text-sm font-semibold text-gray-700">
            {selectedCount} {selectedCount === 1 ? "cliente" : "clientes"}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Crear Campaña
          </button>
          <button
            onClick={() => setRowSelection({})}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Limpiar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <CampaignModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type="churn"
        recipients={selectedRecipients}
      />
    </>
  );
}
