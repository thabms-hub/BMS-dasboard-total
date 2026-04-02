/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import http from 'node:http'
import https from 'node:https'
import type { Plugin } from 'vite'

// ---------------------------------------------------------------------------
// Dev-only CORS proxy plugin
// Starts an HTTP server on port 3001 that forwards BMS API requests,
// bypassing browser CORS restrictions during local development.
//
// Frontend sends:
//   POST http://localhost:3001/proxy
//   Header: x-target-url: https://<bms_url>
//   Header: Authorization: Bearer <token>
//   Body: { sql, app }
// ---------------------------------------------------------------------------
function bmsCorsProxyPlugin(): Plugin {
  return {
    name: 'bms-cors-proxy',
    apply: 'serve',
    configureServer(server) {
      const PROXY_PORT = 3001

      // Start the actual proxy server on port 3001
      const proxyServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-url')

        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        const targetBase = req.headers['x-target-url'] as string | undefined
        if (!targetBase) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing x-target-url header' }))
          return
        }

        const parsed = new URL(targetBase)
        const isHttps = parsed.protocol === 'https:'
        const lib = isHttps ? https : http

        const options = {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: '/api/sql',
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers['authorization'] ?? '',
          },
        }

        const proxyReq = lib.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, { 'Content-Type': 'application/json' })
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        })

        req.pipe(proxyReq)
      })

      proxyServer.listen(PROXY_PORT, () => {
        console.log(`\x1b[36m[bms-proxy]\x1b[0m CORS proxy → http://localhost:${PROXY_PORT}`)
      })

      // Add middleware to Vite's dev server to forward /bms-proxy requests to port 3001
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/bms-proxy') && req.method === 'POST') {
            const proxyReq = http.request({
              hostname: 'localhost',
              port: PROXY_PORT,
              path: req.url,
              method: req.method,
              headers: req.headers,
            }, (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
              proxyRes.pipe(res)
            })

            proxyReq.on('error', (err) => {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            })

            req.pipe(proxyReq)
          } else {
            next()
          }
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), bmsCorsProxyPlugin()],
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/component/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/api/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/components/ui/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
