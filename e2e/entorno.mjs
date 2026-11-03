/**
 * Lo que cambia de una maquina a otra.
 *
 * POR QUE EXISTE ESTE ARCHIVO
 *
 * Los scripts traian la contrasena de Postgres y la ruta de Chrome escritas a
 * mano, con un comentario que decia "ajustalo si difiere". Eso tiene dos
 * problemas, y el segundo es el que importa:
 *
 * 1. Una contrasena en Git va contra la regla del proyecto, aunque sea local.
 * 2. Los scripts SOLO funcionaban en la maquina de quien los escribio. En
 *    cualquier otra fallaban con un error de autenticacion que no dice que hay
 *    que editar un archivo.
 *
 * Ahora sale del entorno, con los valores por omision que ya documenta el
 * `.env.example` del backend. La contrasena NO tiene valor por omision a
 * proposito: es la unica que no se puede adivinar, y es mejor un mensaje claro
 * que un fallo de SASL.
 */
export const baseDeDatos = {
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 15432),
  user: process.env.DATABASE_USER ?? 'meritia',
  password: exigir('DATABASE_PASSWORD'),
  database: process.env.DATABASE_NAME ?? 'meritia',
};

/**
 * Donde esta Chrome. Playwright trae su propio navegador, pero estos scripts
 * usan `playwright-core`, que no lo descarga: por eso hace falta uno del
 * sistema.
 */
export const rutaDeChrome =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const urlDeLaWeb = process.env.E2E_WEB_URL ?? 'http://localhost:4200';

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(
      `\nFalta ${nombre}. Estos scripts hablan con el Postgres de desarrollo.\n` +
        `Pasalo en la misma linea:   ${nombre}=... node e2e/<script>.mjs\n` +
        `O cargalo del backend:      node --env-file=../backend/.env e2e/<script>.mjs\n`,
    );
    process.exit(1);
  }
  return valor;
}
