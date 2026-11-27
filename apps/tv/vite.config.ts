import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { devProxy } from "./scripts/dev-proxy.ts";
import pkg from "./package.json" with { type: "json" };

// webOS 5 ships Chromium 68 and Tizen 5.5 Chromium 69: the oldest TVs we target.
const TV_TARGET = "chrome68";

/**
 * Packaged TV apps open index.html from file://, where Chromium refuses
 * <script type="module"> and crossorigin requests. Ship one classic,
 * deferred IIFE bundle instead.
 */
function classicScripts(): Plugin {
  return {
    name: "classic-scripts",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, "<script defer")
        .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), classicScripts(), devProxy()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      "@iptv/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5180,
    fs: { allow: ["../.."] },
  },
  build: {
    target: TV_TARGET,
    cssTarget: TV_TARGET,
    modulePreload: false,
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 0,
    // One stylesheet next to app.js instead of CSS injected from JS.
    cssCodeSplit: false,
    rolldownOptions: {
      // import.meta only appears in Vite's unused preload helper.
      checks: { emptyImportMeta: false },
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
