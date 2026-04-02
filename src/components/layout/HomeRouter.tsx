"use client";

import { useRole } from "@/lib/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CajeroHome } from "@/components/cajero/CajeroHome";
import type { VentaCruzada, ReposicionPendiente, ClienteChurn } from "@/lib/types";
import type { ReactNode } from "react";

interface HomeRouterProps {
  adminView: ReactNode;
  ventasCruzadas: VentaCruzada[];
  reposiciones: ReposicionPendiente[];
  churn: ClienteChurn[];
}

export function HomeRouter({ adminView, ventasCruzadas, reposiciones, churn }: HomeRouterProps) {
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role === "nextaitech") router.replace("/comisiones");
  }, [role, router]);

  if (role === "cajero") {
    return <CajeroHome ventasCruzadas={ventasCruzadas} reposiciones={reposiciones} churn={churn} />;
  }

  if (role === "nextaitech") return null;

  return <>{adminView}</>;
}
