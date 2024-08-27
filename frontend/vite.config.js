import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 8001,
        proxy: {
            "/game": "http://localhost:42925",
            "/room": "http://localhost:42925",
            "/players": "http://localhost:42925",
            "/login": "http://localhost:42925",
        },
    },
});
