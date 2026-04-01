"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "admin" | "cajero";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "admin",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sellix-role") as Role) || "admin";
    }
    return "admin";
  });

  function handleSetRole(r: Role) {
    setRole(r);
    if (typeof window !== "undefined") localStorage.setItem("sellix-role", r);
  }

  return (
    <RoleContext.Provider value={{ role, setRole: handleSetRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
