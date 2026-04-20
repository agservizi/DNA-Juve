import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/football': {
          target: 'https://api.football-data.org/v4',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/football/, ''),
          headers: {
            'X-Auth-Token': env.VITE_FOOTBALL_API_KEY || env.FOOTBALL_API_KEY || '',
          },
        },
        '/api/news': {
          target: 'https://newsapi.org/v2',
          changeOrigin: true,
          rewrite: (p) => {
            const url = new URL(p, 'http://localhost')
            url.searchParams.set('apiKey', env.NEWS_API_KEY || '')
            return url.pathname.replace(/^\/api\/news/, '') + url.search
          },
        },
        '/api/rss/gazzetta': {
          target: 'https://www.gazzetta.it/rss/calcio.xml',
          changeOrigin: true,
          rewrite: () => '',
        },
        '/api/rss/tuttosport': {
          target: 'https://www.tuttosport.com/rss/calcio/serie-a/juventus',
          changeOrigin: true,
          rewrite: () => '',
        },
        '/api/rss/tuttojuve': {
          target: 'https://www.tuttojuve.com/rss/?section=6',
          changeOrigin: true,
          rewrite: () => '',
        },
        '/api/rss/juventusnews24': {
          target: 'https://www.juventusnews24.com/feed/',
          changeOrigin: true,
          rewrite: () => '',
        },
        '/api/rss/juvenews': {
          target: 'https://www.juvenews.eu/feed/rss.xml',
          changeOrigin: true,
          rewrite: () => '',
        },
        '/api/brevo': {
          target: 'https://api.brevo.com/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/brevo/, ''),
          headers: {
            'api-key': env.BREVO_API_KEY || '',
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],
            'motion-vendor': ['framer-motion'],
            'editor-vendor': [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/extension-underline',
              '@tiptap/extension-link',
              '@tiptap/extension-image',
              '@tiptap/extension-text-align',
              '@tiptap/extension-placeholder',
            ],
            'charts-vendor': ['recharts'],
            'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'share-vendor': ['react-share', 'react-intersection-observer', 'react-helmet-async'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
