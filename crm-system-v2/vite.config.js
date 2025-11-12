import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://10.20.10.192', // عنوان السيرفر الخلفي
        changeOrigin: true,
        secure: false, // تجاهل التحقق من الشهادة في حالة https داخلي
        rewrite: (path) => {
          const newPath = path.replace(/^\/api/, '');
          console.log(`🔄 Proxy: ${path} -> ${newPath}`);
          return newPath;
        },
      },
    },
  },
})
