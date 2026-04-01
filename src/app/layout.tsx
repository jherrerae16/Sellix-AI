import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/lib/RoleContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Sellix AI — Inteligencia de Ventas",
  description: "Plataforma de análisis de ventas para droguerías",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <RoleProvider>
          <AppShell>{children}</AppShell>
        </RoleProvider>
      </body>
    </html>
  );
}
