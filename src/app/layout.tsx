import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/lib/RoleContext";
import { AppShellWrapper } from "@/components/layout/AppShellWrapper";

export const metadata: Metadata = {
  title: "Sellix AI — Inteligencia de Ventas",
  description: "Plataforma de análisis de ventas para droguerías",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <RoleProvider>
          <AppShellWrapper>{children}</AppShellWrapper>
        </RoleProvider>
      </body>
    </html>
  );
}
