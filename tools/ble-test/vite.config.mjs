import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root:fileURLToPath(new URL('.',import.meta.url)),
  server:{host:'127.0.0.1',port:5174,strictPort:true,hmr:false,proxy:{'/api/bridge':{target:'http://127.0.0.1:2015',rewrite:path=>path.replace(/^\/api\/bridge/,'')}}},
  build:{outDir:'../../dist/ble-test',emptyOutDir:true},
  optimizeDeps:{include:['gan-web-bluetooth','aes-js','rxjs']},
});
