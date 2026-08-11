import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devApi } from './dev-api-plugin.ts';

export default defineConfig({
  // devApi serve a pasta api/ no `npm run dev`; em produção é a Vercel.
  plugins: [react(), tailwindcss(), devApi()],
  // Absoluto: as rotas /admin e /conta quebrariam com base relativa.
  base: '/',
});
