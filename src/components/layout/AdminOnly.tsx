"use client";

import { useRole } from "@/lib/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function AdminOnly({ children }: { children: ReactNode }) {
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role !== "admin") router.replace("/");
  }, [role, router]);

  if (role !== "admin") return null;
  return <>{children}</>;
}
