import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    environmentMatchGlobs: [["server/**/*.test.{ts,tsx}", "node"]],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/components/AgentCard.tsx",
        "src/components/AgentDashboard.tsx",
        "src/components/CreateAgentDialog.tsx",
        "server/**/*.js",
      ],
      thresholds: {
        lines: 90,
        functions: 60,
        statements: 90,
        branches: 60,
      },
    },
  },
}));
