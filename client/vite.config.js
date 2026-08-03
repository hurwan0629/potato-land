import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 백엔드 주소는 .env(.local) 의 VITE_API_TARGET 으로 지정 (기본값: localhost:8080)
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // 프론트(import.meta.env.VITE_API_BASE_URL="/api")로 보낸 요청을
        // 백엔드로 그대로 전달. 브라우저 입장에선 같은 origin으로 보여서
        // 쿠키 기반 인증에서 SameSite/CORS 문제를 신경 안 써도 됨.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
