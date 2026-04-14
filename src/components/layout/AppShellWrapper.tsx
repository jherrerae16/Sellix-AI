"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

const PUBLIC_PATHS = ["/auth/", "/welcome"];

export function AppShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public pages render without AppShell (no sidebar, no topbar)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
