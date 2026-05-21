import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/__mockforge/",
  plugins: [react()],
  server: {
    port: 2668,
    proxy: {
      "/__mockforge/api": "http://localhost:3000",
      "/__mockforge/health": "http://localhost:3000"
    }
  }
});
