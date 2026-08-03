import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 백엔드 CLIENT_ORIGIN과 일치하도록 개발 서버 주소와 React 변환을 설정한다.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
