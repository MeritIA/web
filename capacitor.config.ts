import type { CapacitorConfig } from '@capacitor/cli';

// Sin API_MOVIL (emulador) o con una URL http:// se permite tráfico en claro y mixto;
// con https:// queda todo cerrado.
const apiSegura = process.env['API_MOVIL']?.startsWith('https://') ?? false;

const config: CapacitorConfig = {
  appId: 'co.meritia.app',
  appName: 'MeritIA',
  webDir: 'dist/web/browser',
  backgroundColor: '#08080a',
  server: {
    // Origen de la WebView: https://localhost. Debe estar en ALLOWED_ORIGINS del backend.
    androidScheme: 'https',
    // Solo para probar contra un backend http (emulador). Quitar con un API https.
    cleartext: !apiSegura,
  },
  android: {
    allowMixedContent: !apiSegura,
  },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#08080a' },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
    // Iconos claros sobre la barra oscura, sin depender del modo del sistema.
    SystemBars: { style: 'DARK' },
  },
};

export default config;
