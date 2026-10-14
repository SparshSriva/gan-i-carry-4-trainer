import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxy={ '/api/bridge': { target:'http://127.0.0.1:2015',rewrite:(path:string)=>path.replace(/^\/api\/bridge/,'') }, '/api/tnoodle': { target:'http://127.0.0.1:2014',rewrite:(path:string)=>path.replace(/^\/api\/tnoodle/,'') } };

export default defineConfig({
  server:{proxy},
  preview:{proxy},
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['gan-web-bluetooth', 'aes-js', 'rxjs'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/cubing')) {
            return 'cubing';
          }
        },
      },
    },
  },
})
