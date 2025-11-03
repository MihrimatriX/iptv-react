"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface IPTVCredentials {
  apiBase: string;
  username: string;
  password: string;
  sessionCookie?: string;
  userAgent?: string;
  streamReferer?: string;
}

interface AuthContextType {
  isConfigured: boolean;
  credentials: IPTVCredentials | null;
  configureIPTV: (credentials: IPTVCredentials) => void;
  clearConfiguration: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IPTV_STORAGE_KEY = "react-iptv-credentials";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentials, setCredentials] = useState<IPTVCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const storedCredentials = localStorage.getItem(IPTV_STORAGE_KEY);
      if (storedCredentials) {
        const parsedCredentials = JSON.parse(storedCredentials);
        setCredentials(parsedCredentials);
        setIsConfigured(true);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const configureIPTV = (newCredentials: IPTVCredentials) => {
    setCredentials(newCredentials);
    setIsConfigured(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(IPTV_STORAGE_KEY, JSON.stringify(newCredentials));
      } catch {}
    }
  };

  const clearConfiguration = () => {
    setCredentials(null);
    setIsConfigured(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(IPTV_STORAGE_KEY);
        localStorage.removeItem("react-iptv-categories-cache");
      } catch {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured,
        credentials,
        configureIPTV,
        clearConfiguration,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export type { IPTVCredentials };
