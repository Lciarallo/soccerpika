import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devApi } from './dev-api-plugin.ts';

function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css-plugin',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      let newHtml = html;
      for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.css') && 'source' in chunk) {
          const cssContent =
            typeof chunk.source === 'string'
              ? chunk.source
              : new TextDecoder().decode(chunk.source);
          newHtml = newHtml.replace(
            new RegExp(`<link[^>]*href="[^"]*${fileName}"[^>]*>`, 'g'),
            `<style>${cssContent}</style>`,
          );
        }
      }
      return newHtml;
    },
  };
}

export default defineConfig({
  // devApi serve a pasta api/ no `npm run dev`; em produção é a Vercel.
  plugins: [react(), tailwindcss(), inlineCssPlugin(), devApi()],
  // Absoluto: as rotas /admin e /conta quebrariam com base relativa.
  base: '/',
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-vendor';
          }
        },
      },
    },
  },
});
