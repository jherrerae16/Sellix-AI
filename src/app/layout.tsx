import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { RoleProvider } from "@/lib/RoleContext";
import { AppShellWrapper } from "@/components/layout/AppShellWrapper";

export const metadata: Metadata = {
  title: "Sellix AI — Inteligencia de Ventas",
  description: "Agente comercial autónomo e inteligencia de ventas",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El rol viaja del servidor al cliente desde la sesión firmada, nunca
  // desde localStorage (PRD v4.0 §4). El cliente lo usa solo para decidir
  // qué mostrar; la autorización real ocurre en cada página y endpoint.
  const session = await auth();

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <RoleProvider
          role={session?.user?.rol ?? null}
          tenantId={session?.user?.tenantId ?? null}
        >
          <AppShellWrapper>{children}</AppShellWrapper>
        </RoleProvider>
      </body>
    </html>
  );
}
