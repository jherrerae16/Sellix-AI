// =============================================================
// Sellix AI — Comisiones (server component)
//
// El control de acceso ocurre aquí, en el servidor, contra la sesión
// firmada. Antes vivía en el cliente leyendo localStorage, donde
// bastaba con escribir `sellix-role = nextaitech` en la consola del
// navegador para entrar (PRD v4.0 §4).
//
// Defensa en profundidad: además de este guard, /api/campaigns/attribution
// valida el mismo rol por su cuenta. Ninguna de las dos capas confía
// en la otra.
// =============================================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ComisionesClient from "./ComisionesClient";

export const dynamic = "force-dynamic";

export default async function ComisionesPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (session.user.rol !== "nextaitech") redirect("/");

  return <ComisionesClient />;
}
