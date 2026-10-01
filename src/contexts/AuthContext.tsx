"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { normalizeXtreamApiBase } from "@/lib/normalizeApiBase";

interface IPTVCredentials {
  apiBase: string;
  username: string;
  password: string;
  sessionCookie?: string;
  userAgent?: string;
  streamReferer?: string;
  /** UI showcase mode: local sample catalog, no Xtream server involved. */
  demo?: boolean;
}

interface AuthContextType {
  isConfigured: boolean;
  isDemo: boolean;
  credentials: IPTVCredentials | null;
  configureIPTV: (credentials: IPTVCredentials) => void;
  enterDemo: () => void;
  clearConfiguration: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IPTV_STORAGE_KEY = "react-iptv-credentials";
const DEMO_CREDENTIALS: IPTVCredentials = {
  apiBase: "demo://local",
  username: "demo",
  password: "demo",
  demo: true,
};

const normalize = (credentials: IPTVCredentials): IPTVCredentials =>
  credentials.demo
    ? DEMO_CREDENTIALS
    : { ...credentials, apiBase: normalizeXtreamApiBase(credentials.apiBase) };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<IPTVCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IPTV_STORAGE_KEY);
      if (stored) {
        const parsed: IPTVCredentials = JSON.parse(stored);
        const normalized = normalize(parsed);
        setCredentials(normalized);
        if (normalized.apiBase !== parsed.apiBase) {
          localStorage.setItem(IPTV_STORAGE_KEY, JSON.stringify(normalized));
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const configureIPTV = (newCredentials: IPTVCredentials) => {
    const normalized = normalize(newCredentials);
    setCredentials(normalized);
    try {
      localStorage.setItem(IPTV_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  };

  const clearConfiguration = () => {
    setCredentials(null);
    try {
      localStorage.removeItem(IPTV_STORAGE_KEY);
      localStorage.removeItem("react-iptv-categories-cache");
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured: credentials !== null,
        isDemo: credentials?.demo === true,
        credentials,
        configureIPTV,
        enterDemo: () => configureIPTV(DEMO_CREDENTIALS),
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
