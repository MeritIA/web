/**
 * E2E de postulaciones simuladas, de los dos lados, con dos sesiones en el MISMO
 * navegador (el mock comparte su almacén por origen).
 *
 * Requisitos: iguales a flujo-completo.mjs (playwright-core y pg instalados con
 * `npm i --no-save`), backend en :3000 y `ng serve` en :4200. No necesita IA.
 *
 *   node e2e/postulaciones-simuladas.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';

const WEB = 'http://localhost:4200';
const API = `${WEB}/api/v1`;
const PASS = 'una-frase-larga-y-dificil';
const SUF = Date.now().toString(36);

const nitValido = (base) => {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const suma = String(base)
    .split('')
    .reverse()
    .reduce((s, x, i) => s + Number(x) * pesos[i], 0);
  const r = suma % 11;
  return `${base}-${r > 1 ? 11 - r : r}`;
};

async function api(ruta, { token, cuerpo, metodo } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo ?? (cuerpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${ruta} -> ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

const db = new pg.Client({ host: 'localhost', port: 15432, user: 'meritia', password: 'meritia-local-e2e', database: 'meritia' });
await db.connect();

// --- Setup por API: admin -> empresa -> reclutador -> ejercicio -> vacante publicada
const registrar = (correo) =>
  api('/autenticacion/registro', { cuerpo: { correo, contrasena: PASS, nombreCompleto: 'Persona Demo', cliente: 'apk' } });
const entrar = (correo) =>
  api('/autenticacion/login', { cuerpo: { correo, contrasena: PASS, cliente: 'apk' } });

const adminCorreo = `adm-${SUF}@meritia.test`;
const { idUsuario: idAdmin } = await registrar(adminCorreo);
await db.query(`update autenticacion.usuarios set rol='administrador', id_empresa=null where id=$1`, [idAdmin]);
const admin = await entrar(adminCorreo);
const empresa = await api('/empresas', {
  token: admin.tokenDeAcceso,
  cuerpo: { nombre: `Postula ${SUF}`, sector: 'tecnologia', nit: nitValido(String(900000000 + (Date.now() % 99999999))) },
});
const recluCorreo = `rec-${SUF}@acme.test`;
await api(`/empresas/${empresa.id}/usuarios`, {
  token: admin.tokenDeAcceso,
  cuerpo: { correo: recluCorreo, contrasena: PASS, nombreCompleto: 'Rita Reclutadora', rol: 'reclutador' },
});
const recluTok = (await entrar(recluCorreo)).tokenDeAcceso;
const ejercicio = await api('/ejercicios', {
  token: recluTok,
  cuerpo: {
    titulo: 'API de inventario', tecnologia: 'Node.js', enunciado: 'Construye una API REST de inventario.',
    criterios: [{ nombre: 'Corrección', descripcion: 'Cumple el enunciado.', peso: 100, escalaMaxima: 10 }],
  },
});
const TITULO = `Backend demo ${SUF}`;
const vacante = await api('/vacantes', {
  token: recluTok,
  cuerpo: { titulo: TITULO, descripcion: 'Vacante de demostración para probar las postulaciones simuladas.' },
});
await api(`/vacantes/${vacante.id}/ejercicios`, { token: recluTok, metodo: 'PUT', cuerpo: { idsDeEjercicios: [ejercicio.id] } });
await api(`/vacantes/${vacante.id}/publicar`, { token: recluTok, cuerpo: {} });

// --- Flujo en el navegador
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const ok = (n) => console.log('  OK  ', n);

const entrarUi = async (correo) => {
  await page.goto(`${WEB}/acceso`);
  await page.locator('#correo').fill(correo);
  await page.locator('#contrasena').fill(PASS);
  await page.getByRole('button', { name: /entrar/i }).click();
};
const salirUi = async () => {
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.waitForURL('**/acceso');
};
const registrarUi = async (correo, nombre) => {
  await page.goto(`${WEB}/registro`);
  await page.locator('#nombre').fill(nombre);
  await page.locator('#correo').fill(correo);
  await page.locator('#contrasena').fill(PASS);
  await page.getByText('Autorizo el tratamiento').click();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL('**/mis-pruebas');
};
const tarjeta = () => page.locator('article', { hasText: TITULO });

try {
  await entrarUi(recluCorreo);
  await page.waitForURL('**/panel');
  await page.goto(`${WEB}/vacantes/${vacante.id}`);
  await page.getByText('Nadie se ha postulado todavía').waitFor();
  ok('la empresa abre su vacante publicada: sin postulantes y marcado como simulado');
  await salirUi();

  const candidatos = [`pa-${SUF}@cand.test`, `pb-${SUF}@cand.test`];
  for (const [i, correo] of candidatos.entries()) {
    await registrarUi(correo, `Candidato ${i ? 'B' : 'A'}`);
    await page.getByRole('link', { name: 'Explorar' }).first().click();
    await tarjeta().waitFor();
    if ((await page.locator('article').first().textContent()).includes(TITULO) === false) throw new Error('la vacante real no va primero');
    await tarjeta().getByRole('button', { name: 'Postularme' }).click();
    await tarjeta().getByText('En revisión').waitFor();
    ok(`candidato ${i ? 'B' : 'A'} ve la vacante real en Explorar y se postula`);
    await salirUi();
  }

  await entrarUi(recluCorreo);
  await page.waitForURL('**/panel');
  await page.goto(`${WEB}/vacantes/${vacante.id}`);
  await page.getByRole('button', { name: 'Aceptar e invitar' }).first().waitFor();
  if ((await page.getByRole('button', { name: 'Aceptar e invitar' }).count()) !== 2) throw new Error('postulantes');
  ok('la empresa ve a los dos postulantes');
  await page.getByRole('button', { name: 'Rechazar' }).nth(1).click();
  await page.getByText('Postulación rechazada').first().waitFor();
  await page.getByRole('button', { name: 'Aceptar e invitar' }).click();
  await page.getByText('Candidato aceptado e invitado').first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.lista-simple a[href*="/candidatos/"]').length >= 1);
  ok('la empresa rechaza a uno y acepta al otro (la invitación queda registrada en el backend)');
  await page.screenshot({ path: 'e2e/postulantes.png', fullPage: true });
  await salirUi();

  // Rechazado (A, el primero que se postuló: la lista va del más reciente al más antiguo): sin acciones y sin prueba
  await entrarUi(candidatos[0]);
  await page.waitForURL('**/mis-pruebas');
  await page.getByRole('link', { name: 'Explorar' }).first().click();
  await tarjeta().getByText('No continúa').waitFor();
  if ((await tarjeta().getByRole('button').filter({ hasText: /Retirar|Postularme/ }).count()) !== 0) throw new Error('el rechazado conserva acciones');
  if ((await page.getByRole('link', { name: 'Backend demo' }).count()) !== 0) throw new Error('ve la prueba');
  ok('el candidato rechazado ve «No continúa» y no puede actuar');
  await salirUi();

  // Aceptado (B): la prueba aparece de verdad en Mis pruebas
  await entrarUi(candidatos[1]);
  await page.waitForURL('**/mis-pruebas');
  await page.getByRole('link', { name: TITULO }).first().waitFor();
  ok('el candidato aceptado recibe la prueba real en «Mis pruebas»');
  await page.getByRole('link', { name: 'Explorar' }).first().click();
  await tarjeta().getByText('Invitado').waitFor();
  await tarjeta().getByRole('link', { name: 'Hacer la prueba' }).click();
  await page.getByRole('heading', { name: TITULO }).waitFor();
  ok('Explorar muestra «Invitado» y lleva a la prueba');
  console.log('\nE2E POSTULACIONES OK');
} catch (e) {
  console.log('FALLA:', e.message.split('\n')[0]);
  try {
    await page.screenshot({ path: 'e2e/fallo-postulaciones.png', fullPage: true });
    console.log('url:', page.url());
  } catch {}
  process.exitCode = 1;
} finally {
  await db.end();
  await browser.close();
}
