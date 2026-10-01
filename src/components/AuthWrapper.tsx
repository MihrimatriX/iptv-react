"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "./LoginForm";

export function AuthWrapper({ children }: { children: ReactNode }) {
  const { isConfigured, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return isConfigured ? children : <LoginForm />;
}
