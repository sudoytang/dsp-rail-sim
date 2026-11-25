import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/examples/jsm/lines")) return "three-lines";
          if (id.includes("node_modules/three/examples/jsm/controls")) return "three-controls";
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/react")) return "react";
          if (id.includes("node_modules/zustand")) return "state";
        },
      },
    },
  },
});
