import { existsSync } from 'node:fs';

/** Carga `web/.env` si existe; las variables ya definidas en el shell tienen prioridad. */
export function cargarEnv(ruta = '.env') {
  if (existsSync(ruta)) process.loadEnvFile(ruta);
}
