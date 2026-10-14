import { defineConfig } from 'vite';
import sendEmailHandler from './api/send-email.js';

export default defineConfig({
  plugins: [
    {
      name: 'garden-local-api',
      configureServer(server) {
        server.middlewares.use('/api/send-email', (req, res) => {
          let rawBody = '';
          req.on('data', (chunk) => {
            rawBody += chunk;
          });
          req.on('end', async () => {
            req.body = rawBody;
            const resWrapper = {
              statusCode: 200,
              setHeader: (k, v) => res.setHeader(k, v),
              status(code) {
                this.statusCode = code;
                res.statusCode = code;
                return this;
              },
              json(payload) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(payload));
              },
              end(data) {
                res.end(data);
              },
            };
            await sendEmailHandler(req, resWrapper);
          });
        });
      },
    },
  ],
});
