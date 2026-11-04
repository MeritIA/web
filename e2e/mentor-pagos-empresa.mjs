/**
 * E2E de lo nuevo, contra el stack real: auto-registro de empresa (A01), Mentor IA
 * y pagos simulados con retiro desde 200.000.
 *
 * Requisitos: iguales a postulaciones.mjs (playwright-core y pg con `npm i --no-save`),
 * backend en :3000, ai-service en :13100 con PROVEEDOR_IA=simulado (el backend lo
 * alcanza por AI_SERVICE_URL) y `ng serve` en :4200.
 *
 *   CHROME_PATH=... PGPASSWORD=... node e2e/mentor-pagos-empresa.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';

const WEB = process.env.WEB ?? 'http://localhost:4200';
const API = `${WEB}/api/v1`;
const PASS = 'una-frase-larga-y-dificil';
const SUF = Date.now().toString(36);

const nitValido = (base) => {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const suma = String(base).split('').reverse().reduce((s, x, i) => s + Number(x) * pesos[i], 0);
  const r = suma % 11;
  return `${base}-${r > 1 ? 11 - r : r}`;
};

async function api(ruta, { token, cuerpo, metodo, esperar } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo ?? (cuerpo ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  if (esperar !== undefined) {
    if (r.status !== esperar) throw new Error(`${ruta} -> ${r.status} (se esperaba ${esperar}) ${texto.slice(0, 200)}`);
  } else if (!r.ok) throw new Error(`${ruta} -> ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

const db = new pg.Client({
  host: 'localhost',
  port: Number(process.env.PGPORT ?? 15432),
  user: process.env.PGUSER ?? 'meritia',
  password: process.env.PGPASSWORD ?? 'meritia-local-e2e',
  database: process.env.PGDATABASE ?? 'meritia',
});
await db.connect();

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const ok = (n) => console.log('  OK  ', n);
const falla = (m) => {
  throw new Error(m);
};

// El login y el registro público comparten un límite de 10 por minuto y por IP.
const intentos = [];
async function respetarLimite() {
  const ahora = Date.now();
  while (intentos.length && ahora - intentos[0] > 61_000) intentos.shift();
  if (intentos.length >= 8) await new Promise((r) => setTimeout(r, 61_000 - (ahora - intentos[0])));
  intentos.push(Date.now());
}

const salirUi = async () => {
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.waitForURL('**/acceso');
};

let exito = false;
try {
  // --- A01: auto-registro de empresa ------------------------------------------------
  const nit = nitValido(String(910000000 + (Date.now() % 9999999)));
  const correoEmpresa = `ceo-${SUF}@acme.test`;
  const llenar = async (n) => {
    await page.locator('#nombreEmpresa').fill(`Acme ${SUF}`);
    await page.locator('#sector').selectOption('financiero');
    await page.locator('#nit').fill(n);
    await page.locator('#nombre').fill('Carla Directora');
    await page.locator('#correo').fill(correoEmpresa);
    await page.locator('#contrasena').fill(PASS);
  };

  await page.goto(`${WEB}/acceso`);
  await page.getByRole('link', { name: 'Regístrala' }).click();
  await page.waitForURL('**/registro-empresa');
  ok('el acceso enlaza al auto-registro de empresa');

  await respetarLimite();
  await page.goto(`${WEB}/registro-empresa`);
  await llenar(nit.slice(0, -1) + ((Number(nit.slice(-1)) + 1) % 10)); // dígito de verificación roto
  await page.getByRole('button', { name: 'Registrar empresa' }).click();
  await page.getByText(/no cuadra con su digito/i).waitFor();
  ok('un NIT con el dígito de verificación mal se rechaza con el motivo');

  await respetarLimite();
  await page.locator('#nit').fill(nit);
  await page.getByRole('button', { name: 'Registrar empresa' }).click();
  await page.waitForURL('**/panel');
  const { rows } = await db.query(
    `select u.rol, e.nombre, e.nit from autenticacion.usuarios u join autenticacion.empresas e on e.id = u.id_empresa
      where e.nit = $1`, [nit]);
  if (rows.length !== 1 || rows[0].rol !== 'administrador') falla(`la empresa o su administrador no quedaron: ${JSON.stringify(rows)}`);
  ok('registrar la empresa deja la sesión abierta en el panel, con su administrador creado');
  await salirUi();

  await respetarLimite();
  await api('/autenticacion/registro-empresa', {
    cuerpo: { nombreEmpresa: `Otra ${SUF}`, sector: 'salud', nit, correo: `otro-${SUF}@x.test`, contrasena: PASS, nombreCompleto: 'Otra Persona' },
    esperar: 409,
  });
  ok('el mismo NIT no se puede registrar dos veces (409)');

  // --- Candidato ---------------------------------------------------------------------
  const correo = `cand-${SUF}@cand.test`;
  await respetarLimite();
  const { idUsuario, tokenDeAcceso } = await api('/autenticacion/registro', {
    cuerpo: { correo, contrasena: PASS, nombreCompleto: 'Persona Demo', cliente: 'apk' },
  });
  await respetarLimite();
  await page.goto(`${WEB}/acceso`);
  await page.locator('#correo').fill(correo);
  await page.locator('#contrasena').fill(PASS);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/mis-pruebas');

  await page.getByRole('link', { name: 'Mentor' }).click();
  await page.getByText(/no tiene con qué aconsejarte/).waitFor();
  await page.getByRole('link', { name: 'Pagos' }).click();
  await page.getByText('Mis pagos').first().waitFor();
  await page.getByText(/Te faltan/).waitFor();
  if ((await page.getByRole('button', { name: /^Retirar/ }).count()) !== 0) falla('puede retirar sin saldo');
  ok('sin evaluaciones: el mentor lo dice y los pagos muestran saldo 0 sin opción de retiro');

  // Una evaluación (la que dejaría la cola de IA): nota 80 -> 88.000
  const sembrar = async (nota, criterios) => {
    const { rows: [e] } = await db.query(
      `insert into evaluacion.evaluaciones (id_entrega, id_vacante, id_candidato, id_empresa, id_ejercicio, id_version,
         nota_final, proveedor, modelo, archivos, riesgo_inyeccion, creada_en)
       values (gen_random_uuid(), gen_random_uuid(), $1, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
         $2, 'gemini', 'gemini-3.5-flash', 1, 'ninguno', now()) returning id`, [idUsuario, nota]);
    for (const [i, [nombre, puntaje, escala, evidencia]] of criterios.entries()) {
      await db.query(
        `insert into evaluacion.calificaciones_criterio (id_evaluacion, orden, criterio, puntaje, escala_maxima, peso, evidencia)
         values ($1, $2, $3, $4, $5, 50, $6)`, [e.id, i + 1, nombre, puntaje, escala, evidencia]);
    }
  };
  const criterios = (c, l) => [
    ['Correccion', c, 5, 'Pasa los casos del enunciado.'],
    ['Claridad', l, 10, 'Funciones largas y nombres poco claros.'],
  ];
  await sembrar(80, criterios(4, 3));

  const ctx = await api('/mentor/contexto', { token: tokenDeAcceso });
  if (ctx.totalEvaluaciones !== 1 || ctx.perfil.length !== 2 || ctx.recientes[0].flojo.criterio !== 'Claridad') falla(`contexto: ${JSON.stringify(ctx)}`);
  ok('GET /mentor/contexto resume la evaluación (perfil por criterio y el criterio más flojo)');

  await page.goto(`${WEB}/mentor`);
  await page.getByText(/Lo que el mentor sabe de ti · 1 evaluaciones/).waitFor();
  await page.getByRole('button', { name: '¿En qué criterio debo mejorar primero?' }).click();
  await page.getByText(/Mentor simulado/).waitFor();
  await page.getByText('¿En qué criterio debo mejorar primero?').first().waitFor();
  await page.locator('#pregunta').fill('¿Y la claridad?');
  await page.getByRole('button', { name: 'Preguntar' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.turno--mentor').length >= 2);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.turno').length === 4);
  ok('el mentor responde por el servicio de IA real (simulado) y la conversación sobrevive a recargar');

  await page.goto(`${WEB}/mis-pagos`);
  await page.getByText(/88\.000/).first().waitFor();
  await page.getByText(/Te faltan/).waitFor();
  if (!/112\.000/.test(await page.locator('body').innerText())) falla('el faltante no es 112.000');
  ok('una evaluación de nota 80 abona 88.000 y faltan 112.000 para retirar');

  // Mentor y permiso: revocar «calificación por IA» lo bloquea (403)
  await api('/autenticacion/consentimientos', {
    token: tokenDeAcceso, metodo: 'PUT', cuerpo: { decisiones: [{ tipo: 'calificacion_ia', concedido: false }], origen: 'perfil' },
  });
  await api('/mentor/preguntar', { token: tokenDeAcceso, cuerpo: { pregunta: 'hola', historial: [] }, esperar: 403 });
  await api('/autenticacion/consentimientos', {
    token: tokenDeAcceso, metodo: 'PUT', cuerpo: { decisiones: [{ tipo: 'calificacion_ia', concedido: true }], origen: 'perfil' },
  });
  ok('revocar la calificación por IA bloquea al mentor (403) y concederla de nuevo lo devuelve');

  // Dos retos más: 100 -> 100.000 y 50 -> 70.000  => 258.000
  await sembrar(100, criterios(5, 10));
  await sembrar(50, criterios(2, 5));
  await page.goto(`${WEB}/mis-pagos`);
  await page.getByText(/258\.000/).first().waitFor();
  await page.getByText(/Ya llegaste al mínimo/).waitFor();
  await page.locator('#numero').fill('3001234567');
  await page.getByRole('button', { name: /^Retirar/ }).click();
  await page.getByText(/Nequi ••••4567/).waitFor();
  const cuerpo = await page.locator('body').innerText();
  if (!/Te faltan/.test(cuerpo) || !/-?−?.*258\.000/.test(cuerpo)) falla('tras retirar debería quedar saldo 0 y el retiro listado');
  await page.reload();
  await page.getByText(/Nequi ••••4567/).waitFor();
  await page.getByText(/Te faltan/).waitFor();
  ok('con 258.000 se habilita el retiro, retira todo el saldo, y el retiro y el saldo 0 sobreviven a recargar');

  await page.screenshot({ path: 'e2e/pagos.png', fullPage: true });
  exito = true;
} catch (e) {
  await page.screenshot({ path: 'e2e/fallo-mentor-pagos.png', fullPage: true }).catch(() => undefined);
  console.error('FALLO:', e.message);
} finally {
  await browser.close();
  await db.end();
}
process.exit(exito ? 0 : 1);
