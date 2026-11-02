/**
 * Configuracion por entorno.
 *
 * `apiBase` es relativa a proposito: en desarrollo `ng serve` la reenvia al
 * backend con `proxy.conf.json`, y en produccion la sirve el mismo proxy que
 * sirve la aplicacion. Asi el navegador nunca hace una peticion entre origenes
 * distintos y la cookie HttpOnly de sesion viaja sin depender de CORS.
 */
export const entorno = {
  produccion: false,
  apiBase: '/api/v1',
  /** Cada cuanto se vuelve a preguntar por una entrega que sigue evaluandose. */
  sondeoEvaluacionMs: 5000,
} as const;
