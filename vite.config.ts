import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const offlineMode = mode === "offline";
  const offlineEnvDir = process.env.REVHACKERS_OFFLINE_ENV_DIR;
  const offlineOutDir = process.env.REVHACKERS_OFFLINE_OUT_DIR;

  if (offlineMode && (!offlineEnvDir || !offlineOutDir)) {
    throw new Error("Offline mode must be launched through scripts/build-offline.mjs");
  }

  return {
    base: process.env.VITE_BASE_PATH || "/",
    ...(offlineMode ? { envDir: offlineEnvDir } : {}),
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      ...(offlineMode ? { outDir: offlineOutDir, emptyOutDir: true } : {}),
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Auxiliares de interop CJS do Rollup ficam junto do React, senao caem no 1o vendor que os usa (charts) e viram dependencia de toda pagina.
            if (id.includes('commonjsHelpers') || id.includes('\0commonjs')) return 'vendor-react';
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules\/(clsx|tailwind-merge|class-variance-authority)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(react|react-dom|react-router-dom|react-router|scheduler)\//.test(id)) return 'vendor-react';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (id.includes('@radix-ui/')) return 'vendor-ui';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@tiptap/')) return 'vendor-editor';
            if (id.includes('framer-motion')) return 'vendor-motion';
            return undefined;
          },
        },
      },
    },
  };
});
