/**
 * E2E del flujo completo, en un navegador real y contra el stack real.
 *
 * Recorre: administrador crea empresa y reclutador -> dos candidatos se
 * registran con permisos -> reclutador crea ejercicio y vacante, invita y
 * publica -> candidatos leen enunciado y rubrica y entregan -> evaluacion ->
 * ranking a ciegas, revelar identidad, contratar, exportar CSV, cerrar ->
 * el candidato ve su puesto y retira un permiso.
 *
 * Requisitos (no estan en package.json a proposito: son de prueba, no del producto):
 *   npm i --no-save playwright-core pg
 *   backend en :3000 con Postgres, Redis y almacenamiento; web con `ng serve` en :4200
 *   y, en :13100, un servicio de IA con CLAVE_DE_ACCESO = AI_SERVICE_API_KEY del backend.
 *   Para notas distintas de 0 sirve `node backend/test/carga/doble-servicio-ia.mjs`.
 *   El Redis se vacia entre corridas si salta el limitador de intentos.
 *
 *   node e2e/flujo-completo.mjs
 *
 * Ajusta la ruta de Chrome y las credenciales de Postgres abajo si difieren.
 */
// E2E de MeritIA contra el stack real: web (ng serve) -> backend -> Postgres/Redis/S3 -> IA.
import { chromium } from 'playwright-core';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const WEB = 'http://localhost:4200';
const SUF = Date.now().toString(36);
const PASS = 'una-frase-larga-y-dificil';
const resultados = [];
const capturas = path.join(AQUI, 'capturas');
fs.mkdirSync(capturas, { recursive: true });

async function paso(nombre, fn) {
  try {
    await fn();
    resultados.push(['OK', nombre]);
    console.log('  OK  ', nombre);
  } catch (e) {
    resultados.push(['FALLA', nombre, e.message.split('\n')[0]]);
    console.log('  FALLA', nombre, '->', e.message.split('\n')[0]);
    throw e;
  }
}

// Archivos a entregar (zip minimo valido con un txt dentro basta: el backend valida extension/tamano)
function archivo(nombre, contenido) {
  const p = path.join(AQUI, nombre);
  fs.writeFileSync(p, contenido);
  return p;
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('   [console.error]', m.text().slice(0, 200));
  });
  return { ctx, page };
}

async function entrar(page, correo, contrasena = PASS) {
  await page.goto(`${WEB}/acceso`);
  await page.locator('#correo').fill(correo);
  await page.locator('#contrasena').fill(contrasena);
  await page.getByRole('button', { name: /entrar/i }).click();
}

async function salir(page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.waitForURL('**/acceso');
}

const db = new pg.Client({
  host: 'localhost', port: 15432, user: 'meritia', password: 'meritia-local-e2e', database: 'meritia',
});
await db.connect();

const adminCorreo = `admin-${SUF}@meritia.test`;
const recluCorreo = `recluta-${SUF}@acme.test`;
const anaCorreo = `ana-${SUF}@cand.test`;
const luisCorreo = `luis-${SUF}@cand.test`;
const empresaNombre = `Acme ${SUF}`;
function nitValido(base) {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const d = String(base).split('').reverse();
  const suma = d.reduce((s, x, i) => s + Number(x) * pesos[i], 0);
  const r = suma % 11;
  return `${base}-${r > 1 ? 11 - r : r}`;
}
const NIT = nitValido(String(900000000 + (Date.now() % 99999999)));
let idAna, idLuis, ctx, page;

try {
  // ------------------------------------------------------------ Admin
  // El primer administrador de plataforma no se puede crear por API a proposito: se promueve por SQL.
  {
    const r = await fetch(`${WEB}/api/v1/autenticacion/registro`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ correo: adminCorreo, contrasena: PASS, nombreCompleto: 'Admin Plataforma' }),
    });
    if (r.status !== 201) throw new Error('registro admin ' + r.status);
    const { idUsuario } = await r.json();
    await db.query(`update autenticacion.usuarios set rol='administrador', id_empresa=null where id=$1`, [idUsuario]);
  }

  ({ ctx, page } = await contexto());

  await paso('Admin entra y cae en la consola de administración', async () => {
    await entrar(page, adminCorreo);
    await page.waitForURL('**/administracion');
    await page.getByRole('heading', { name: 'Administración' }).waitFor();
  });

  await paso('Admin crea empresa con sector y NIT', async () => {
    await page.getByLabel('Nueva empresa').fill(empresaNombre);
    await page.getByLabel('Sector').selectOption('tecnologia');
    await page.getByLabel(/NIT/).fill(NIT);
    await page.getByRole('button', { name: 'Crear empresa' }).click();
    await page.locator('strong', { hasText: empresaNombre }).waitFor();
    await page.getByText(`tecnologia · NIT ${NIT}`, { exact: false }).first().waitFor();
  });

  await paso('Admin da de alta al reclutador de la empresa', async () => {
    await page.getByLabel('Empresa', { exact: true }).selectOption({ label: empresaNombre });
    await page.getByLabel('Nombre completo').fill('Rita Reclutadora');
    await page.getByLabel('Correo', { exact: true }).fill(recluCorreo);
    await page.getByLabel('Contraseña inicial').fill(PASS);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.getByText(`Cuenta creada para ${recluCorreo}`).waitFor();
  });

  await paso('Admin ve la cola de evaluación', async () => {
    await page.getByText('Worker activo').waitFor();
  });
  await page.screenshot({ path: path.join(capturas, '01-admin.png') });
  await salir(page);

  // ------------------------------------------------------------ Registro de candidatos
  for (const [correo, nombre] of [[anaCorreo, 'Ana Candidata'], [luisCorreo, 'Luis Candidato']]) {
    await paso(`Registro de ${nombre} con permisos y consentimiento`, async () => {
      await page.goto(`${WEB}/registro`);
      await page.locator('#nombre').fill(nombre);
      await page.locator('#correo').fill(correo);
      await page.locator('#contrasena').fill(PASS);
      await page.getByText('Autorizo el tratamiento').click();
      if (correo === luisCorreo) await page.getByText('Perfil visible a otras empresas').click();
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
      await page.waitForURL('**/mis-pruebas');
    });
    await paso(`${nombre} ve su identificador y permisos en Mi cuenta`, async () => {
      await page.getByRole('link', { name: 'Mi cuenta' }).click();
      await page.getByRole('heading', { name: 'Tu identificador' }).waitFor();
      const id = (await page.locator('code').first().textContent()).trim();
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('identificador raro: ' + id);
      if (correo === anaCorreo) idAna = id; else idLuis = id;
      await page.getByText('Calificacion por IA', { exact: false }).first().waitFor();
      if (correo === luisCorreo) {
        const sw = page.getByRole('switch', { name: /Publicacion de tu perfil/i });
        if (!(await sw.isChecked())) throw new Error('el consentimiento de perfil público no se guardó en el registro');
      }
    });
    await salir(page);
  }

  // ------------------------------------------------------------ Reclutador
  await paso('Reclutador entra y ve su panel (A02)', async () => {
    await entrar(page, recluCorreo);
    await page.waitForURL('**/panel');
    await page.getByRole('heading', { name: 'Panel' }).waitFor();
    await page.getByText('Retos en el banco').waitFor();
  });

  await paso('Reclutador crea un ejercicio con rúbrica de 100', async () => {
    await page.goto(`${WEB}/ejercicios/nuevo`);
    await page.getByLabel('Título').fill('API de inventario');
    await page.getByLabel('Tecnología').fill('Node.js');
    await page.getByLabel('Qué debe resolver el candidato').fill('Construye una API REST de inventario con CRUD de productos y pruebas.');
    await page.locator('#criterio-0').fill('Corrección funcional');
    await page.locator('#peso-0').fill('60');
    await page.locator('#escala-0').fill('10');
    await page.locator('#descripcion-0').fill('La API cumple el enunciado.');
    await page.getByRole('button', { name: 'Añadir criterio' }).click();
    await page.locator('#criterio-1').fill('Calidad del código');
    await page.locator('#peso-1').fill('40');
    await page.locator('#escala-1').fill('10');
    await page.locator('#descripcion-1').fill('Estructura, nombres y pruebas.');
    await page.getByText('Pesos: 100 / 100').waitFor();
    await page.getByRole('button', { name: /guardar|crear/i }).last().click();
    await page.waitForURL(/\/ejercicios\/[0-9a-f-]{36}$/);
  });

  let urlVacante;
  await paso('Reclutador crea vacante con cierre estimado y finalistas', async () => {
    await page.goto(`${WEB}/vacantes/nueva`);
    await page.getByLabel('Título').fill('Backend Node junior');
    await page.getByLabel('Descripción').fill('Buscamos una persona para construir APIs con Node y TypeScript en el equipo de plataforma.');
    await page.getByLabel(/Ubicación/).fill('Bogotá · híbrido');
    await page.getByLabel('Intentos por ejercicio').fill('2');
    await page.getByLabel(/Cierre estimado/).fill('2026-12-20');
    await page.getByLabel(/Finalistas a evaluar/).fill('2');
    await page.getByRole('button', { name: 'Crear borrador' }).click();
    await page.waitForURL(/\/vacantes\/[0-9a-f-]{36}$/);
    urlVacante = page.url();
    await page.getByText('2 finalistas por evaluar').waitFor();
  });

  await paso('Reclutador asocia el ejercicio, invita a Ana y a Luis y publica', async () => {
    await page.getByLabel('API de inventario').check();
    await page.getByRole('button', { name: 'Guardar selección' }).click();
    await page.getByText('Ejercicios actualizados').waitFor();
    let n = 0;
    for (const id of [idAna, idLuis]) {
      await page.getByLabel('Identificador del candidato').fill(id);
      await page.getByRole('button', { name: 'Invitar', exact: true }).click();
      n++;
      await page.waitForFunction((k) => document.querySelectorAll('.lista-simple a[href*="/candidatos/"]').length >= k, n);
    }
    await page.getByRole('button', { name: 'Publicar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Publicar' }).click();
    await page.getByText('Vacante publicada').first().waitFor();
  });
  await page.screenshot({ path: path.join(capturas, '02-vacante.png'), fullPage: true });
  await salir(page);

  // ------------------------------------------------------------ Candidatos entregan
  const idVacante = urlVacante.split('/').pop();
  const entregas = [
    [anaCorreo, 'Ana', 'respuesta-ana.zip'],
    [luisCorreo, 'Luis', 'respuesta-luis.zip'],
  ];
  for (const [correo, nombre, fichero] of entregas) {
    await paso(`${nombre} ve su prueba con enunciado y rúbrica y entrega`, async () => {
      await entrar(page, correo);
      await page.waitForURL('**/mis-pruebas');
      await page.getByRole('link', { name: 'Backend Node junior' }).first().click();
      await page.getByText('Construye una API REST de inventario').waitFor();
      await page.getByText('Cómo se califica').click();
      await page.getByText('Corrección funcional').waitFor();
      await page.getByText('2 de 2 intentos').waitFor();
      await page.locator('input[type=file]').setInputFiles(path.join(AQUI, fichero));
      await page.getByRole('button', { name: /Entregar intento 1/ }).click();
      await page.getByText('Entrega recibida').waitFor();
      await page.getByText('1 de 2 intentos').waitFor();
    });
    if (nombre === 'Ana') {
      await paso('Ana: un formato no admitido se rechaza antes de subir', async () => {
        await page.locator('input[type=file]').setInputFiles(archivo('malo.exe', 'MZ'));
        await page.getByText('Formato no admitido').waitFor();
      });
    }
    await paso(`${nombre}: la entrega pasa a evaluada sin recargar (sondeo)`, async () => {
      await page.getByText('Evaluada', { exact: true }).waitFor({ timeout: 60000 });
    });
    await paso(`${nombre} ve su nota con desglose y evidencia`, async () => {
      await page.getByRole('link', { name: 'Mis resultados' }).click();
      await page.getByRole('button', { name: 'Ver desglose y evidencia' }).click();
      await page.getByText('Doble de carga', { exact: false }).first().waitFor();
      await page.getByText(/ya cerrada|se publica cuando la empresa cierre/).first().waitFor();
    });
    if (nombre === 'Ana') await page.screenshot({ path: path.join(capturas, '03-resultados-ana.png'), fullPage: true });
    await salir(page);
  }

  // ------------------------------------------------------------ Reclutador decide
  await paso('Reclutador ve avance en el panel', async () => {
    await entrar(page, recluCorreo);
    await page.waitForURL('**/panel');
    await page.getByRole('link', { name: 'Backend Node junior' }).waitFor();
    await page.getByText('2 evaluados').waitFor();
  });
  await page.screenshot({ path: path.join(capturas, '04-panel.png'), fullPage: true });

  let aliasPrimero;
  await paso('Ranking a ciegas: alias, nota y punto fuerte', async () => {
    await page.goto(`${WEB}/vacantes/${idVacante}/reporte`);
    await page.getByText('identidad oculta').first().waitFor();
    const filas = await page.locator('tbody tr').count();
    if (filas !== 2) throw new Error('filas ranking ' + filas);
    aliasPrimero = (await page.locator('tbody tr').first().locator('strong').textContent()).trim();
    const cuerpo = await page.locator('tbody').textContent();
    if (cuerpo.includes('Ana Candidata') || cuerpo.includes(anaCorreo)) throw new Error('el ranking filtró la identidad');
  });
  await page.screenshot({ path: path.join(capturas, '05-ranking.png'), fullPage: true });

  await paso('Revelar identidad pide confirmación y deja rastro', async () => {
    await page.getByRole('button', { name: 'Revelar' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Revelar' }).click();
    await page.getByText(/@cand\.test/).first().waitFor();
    await page.getByText('Nadie ha revelado').waitFor({ state: 'detached' });
    await page.getByText(aliasPrimero).last().waitFor();
  });

  await paso('Exportar CSV descarga el archivo', async () => {
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Exportar CSV' }).click()]);
    const p = await descarga.path();
    const csv = fs.readFileSync(p, 'utf8');
    if (!csv.includes('\n')) throw new Error('csv vacío');
  });

  await paso('Detalle del candidato y registro de contratación', async () => {
    await page.locator('tbody').getByRole('link', { name: 'Detalle' }).first().click();
    await page.getByRole('button', { name: 'Revelar identidad' }).waitFor();
    await page.getByRole('button', { name: 'Registrar contratación' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Registrar contratación' }).click();
    await page.getByText(/Contratado \d/).waitFor();
  });
  await page.screenshot({ path: path.join(capturas, '06-candidato.png'), fullPage: true });

  await paso('Cierra la vacante y ve el estado de los avisos', async () => {
    await page.goto(`${WEB}/vacantes/${idVacante}`);
    await page.getByText('Contratado', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cerrar vacante' }).click();
    await page.getByText('Avisos a los candidatos').waitFor();
    await page.getByRole('button', { name: 'Reenviar pendientes' }).click();
    await page.getByText(/Avisos:|omit/i).first().waitFor().catch(() => {});
  });
  await page.screenshot({ path: path.join(capturas, '07-vacante-cerrada.png'), fullPage: true });

  await paso('Panel cuenta 1 contratado', async () => {
    await page.goto(`${WEB}/panel`);
    await page.locator('article', { hasText: 'Contratados' }).getByText('1', { exact: true }).waitFor();
  });
  await salir(page);

  // ------------------------------------------------------------ Candidato tras el cierre
  await paso('Con la vacante cerrada Ana ve su puesto', async () => {
    await entrar(page, anaCorreo);
    await page.waitForURL('**/mis-pruebas');
    await page.getByRole('link', { name: 'Mis resultados' }).click();
    await page.getByText(/Puesto \d de 2/).waitFor();
  });
  await page.screenshot({ path: path.join(capturas, '08-puesto.png'), fullPage: true });

  await paso('Ana retira el permiso de IA y queda registrado', async () => {
    await page.getByRole('link', { name: 'Mi cuenta' }).click();
    const sw = page.getByRole('switch', { name: /Calificacion por IA/i });
    await sw.uncheck();
    await page.getByText('Permiso retirado').waitFor();
    await page.reload();
    if (await page.getByRole('switch', { name: /Calificacion por IA/i }).isChecked()) throw new Error('no persistió');
  });
  await salir(page);

  // ------------------------------------------------------------ Seguridad de roles
  await paso('Un candidato no puede abrir el panel ni el ranking (guardias)', async () => {
    await entrar(page, luisCorreo);
    await page.waitForURL('**/mis-pruebas');
    await page.goto(`${WEB}/panel`);
    await page.waitForURL('**/mis-pruebas');
    await page.goto(`${WEB}/vacantes/${idVacante}/reporte`);
    await page.waitForURL('**/mis-pruebas');
  });
  await salir(page);

  await ctx.close();
  console.log('\nE2E COMPLETO');
} catch (e) {
  console.log('E2E INTERRUMPIDO:', e.message.split(String.fromCharCode(10))[0]);
  try { await page.screenshot({ path: path.join(capturas, 'fallo.png'), fullPage: true }); console.log('url:', page.url()); } catch {}
  process.exitCode = 1;
} finally {
  await db.end();
  await browser.close();
  console.log(`\n${resultados.filter((r) => r[0] === 'OK').length} ok, ${resultados.filter((r) => r[0] === 'FALLA').length} fallas`);
}
