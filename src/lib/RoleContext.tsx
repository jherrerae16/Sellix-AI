"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "admin" | "cajero" | "nextaitech";

interface RoleContextType {
  role: Role | null;
  setRole: (role: Role | null) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  logout: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sellix-role") as Role) || null;
    }
    return null;
  });

  function setRole(r: Role | null) {
    setRoleState(r);
    if (typeof window !== "undefined") {
      if (r) localStorage.setItem("sellix-role", r);
      else localStorage.removeItem("sellix-role");
    }
  }

  function logout() {
    setRole(null);
  }

  return (
    <RoleContext.Provider value={{ role, setRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
