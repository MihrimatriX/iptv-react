import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAProvider } from "@/components/PWAProvider";
import { BASE_PATH } from "@/lib/deploy";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "React IPTV Client",
  description: "Xtream Codes destekli modern IPTV arayuzu",
  icons: {
    icon: [
      {
        url: `${BASE_PATH}/icons/icon-192x192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: `${BASE_PATH}/icons/icon-512x512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: `${BASE_PATH}/icons/icon-152x152.svg`,
        sizes: "152x152",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: `${BASE_PATH}/manifest.json`,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "React IPTV Client",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": `${BASE_PATH}/browserconfig.xml`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#2563eb" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${grotesk.variable} font-sans`}>
        <PWAProvider />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
