import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/node_modules/lucide-react/")) return "icons";
          if (id.includes("/node_modules/react-dom/") || id.includes("/node_modules/react/") || id.includes("/node_modules/scheduler/")) return "react-vendor";
          if (id.includes("/node_modules/@firebase/firestore/") || id.includes("/node_modules/firebase/firestore/")) return "firebase-firestore";
          if (id.includes("/node_modules/@firebase/auth/") || id.includes("/node_modules/firebase/auth/")) return "firebase-auth";
          if (id.includes("/node_modules/@firebase/functions/") || id.includes("/node_modules/firebase/functions/")) return "firebase-functions";
          if (id.includes("/node_modules/@firebase/app/") || id.includes("/node_modules/firebase/app/")) return "firebase-app";
          if (id.includes("/node_modules/@firebase/") || id.includes("/node_modules/firebase/")) return "firebase-core";
          return undefined;
        }
      }
    }
  }
});
