import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const orden = process.argv[2] ?? 'build';
const api = (process.env.API_MOVIL ?? 'http://10.0.2.2:3000/api/v1').replace(/\/$/, '');
if (!/^https?:\/\/.+\/api\/v\d+$/.test(api)) {
  console.error(`API_MOVIL debe ser una URL absoluta que termine en /api/v1; recibí: ${api}`);
  process.exit(1);
}

const correr = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd, env: process.env });

writeFileSync(
  'src/entornos/entorno.movil.ts',
  `/**
 * Entorno de la APK (Capacitor). Lo regenera \`scripts/movil.mjs\` a partir de la
 * variable \`API_MOVIL\`; no se edita a mano.
 *
 * En la APK la web se sirve desde \`https://localhost\`, así que la API es otro
 * origen y la URL tiene que ser absoluta. La sesión no usa cookies (el almacén
 * del WebView no es seguro): viaja como \`Authorization: Bearer\`.
 */
export const entorno = {
  produccion: true,
  nativo: true,
  apiBase: '${api}',
  sondeoEvaluacionMs: 10000,
} as const;
`,
);

correr('npx ng build --configuration movil');
if (orden === 'build') process.exit(0);

if (!existsSync('android')) correr('npx cap add android');
correr('npx cap sync android');
if (orden === 'sync') process.exit(0);

correr('./gradlew assembleDebug', 'android');
console.log('\nAPK: android/app/build/outputs/apk/debug/app-debug.apk');
