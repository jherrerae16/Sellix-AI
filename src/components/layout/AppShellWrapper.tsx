"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

export function AppShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page renders without AppShell (no sidebar, no topbar)
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
