import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root:fileURLToPath(new URL('.',import.meta.url)),
  server:{host:'127.0.0.1',port:5174,strictPort:true,hmr:false},
  build:{outDir:'../../dist/ble-test',emptyOutDir:true},
  optimizeDeps:{include:['gan-web-bluetooth','aes-js','rxjs']},
});
