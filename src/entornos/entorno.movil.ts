/**
 * Entorno de la APK (Capacitor). Lo regenera `scripts/movil.mjs` a partir de la
 * variable `API_MOVIL`; no se edita a mano.
 *
 * En la APK la web se sirve desde `https://localhost`, así que la API es otro
 * origen y la URL tiene que ser absoluta. La sesión no usa cookies (el almacén
 * del WebView no es seguro): viaja como `Authorization: Bearer`.
 */
export const entorno = {
  produccion: true,
  nativo: true,
  apiBase: 'http://10.0.2.2:3000/api/v1',
  sondeoEvaluacionMs: 10000,
} as const;
