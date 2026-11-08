import { cargarEnv } from './scripts/cargar-env.mjs';

cargarEnv();

// Backend al que `ng serve` reenvía /api (variable BACKEND_URL del .env).
export default {
  '/api': {
    target: process.env.BACKEND_URL ?? 'http://127.0.0.1:3000',
    secure: process.env.BACKEND_SEGURO !== 'false',
    changeOrigin: false,
    logLevel: 'warn',
  },
};
