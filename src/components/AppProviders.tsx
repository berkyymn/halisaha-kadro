"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AppBootstrapGate } from "@/components/AppBootstrapGate";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppBootstrapGate>{children}</AppBootstrapGate>
      <AuthModal />
    </AuthProvider>
  );
}
