import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleOpportunityRequest } from './api/opportunities'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), {
      name: 'local-opportunities-api',
      configureServer(server) {
        server.middlewares.use('/api/opportunities', async (req, res) => {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const headers = new Headers()
          for (const [name, value] of Object.entries(req.headers)) {
            if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          }
          const request = new Request(`http://localhost${req.url || ''}`, {
            method: req.method,
            headers,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          })
          const response = await handleOpportunityRequest(request)
          res.statusCode = response.status
          response.headers.forEach((value, name) => res.setHeader(name, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        })
      },
    }],
  }
})
