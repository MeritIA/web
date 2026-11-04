/**
 * E2E de postulaciones contra el stack real, de los dos lados: la empresa publica
 * con modalidad y tecnologías, dos candidatos se postulan (uno se retira y vuelve),
 * la empresa rechaza con motivo y acepta, y cada candidato lo ve en Explorar.
 *
 * Requisitos: iguales a flujo-completo.mjs (playwright-core y pg instalados con
 * `npm i --no-save`), backend en :3000 y `ng serve` en :4200. No necesita IA.
 *
 *   node e2e/postulaciones-simuladas.mjs
 */
import { chromium } from 'playwright-core';
import pg from 'pg';

const WEB = process.env.WEB ?? 'http://localhost:4200';
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

const db = new pg.Client({
  host: 'localhost',
  port: Number(process.env.PGPORT ?? 15432),
  user: process.env.PGUSER ?? 'meritia',
  password: process.env.PGPASSWORD ?? 'meritia-local-e2e',
  database: process.env.PGDATABASE ?? 'meritia',
});
await db.connect();

// --- Setup por API: admin -> empresa -> reclutador -> ejercicio -> vacante publicada
const registrar = (correo) =>
  api('/autenticacion/registro', { cuerpo: { correo, contrasena: PASS, nombreCompleto: 'Persona Demo', cliente: 'apk' } });
// El backend limita el login a 10 por minuto y por IP (seguridad, no se toca): el script se pacea.
const intentos = [];
async function respetarLimiteDeLogin() {
  const ahora = Date.now();
  while (intentos.length && ahora - intentos[0] > 61_000) intentos.shift();
  if (intentos.length >= 8) await new Promise((r) => setTimeout(r, 61_000 - (ahora - intentos[0])));
  intentos.push(Date.now());
}
const entrar = async (correo) => {
  await respetarLimiteDeLogin();
  return entrarSinPausa(correo);
};
const entrarSinPausa = (correo) =>
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
  cuerpo: {
    titulo: TITULO,
    descripcion: 'Vacante de demostración para probar las postulaciones de punta a punta.',
    modalidad: 'hibrido',
    tecnologias: ['Node.js', 'PostgreSQL'],
  },
});
await api(`/vacantes/${vacante.id}/ejercicios`, { token: recluTok, metodo: 'PUT', cuerpo: { idsDeEjercicios: [ejercicio.id] } });
await api(`/vacantes/${vacante.id}/publicar`, { token: recluTok, cuerpo: {} });

// --- Flujo en el navegador
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const ok = (n) => console.log('  OK  ', n);

const entrarUi = async (correo) => {
  await respetarLimiteDeLogin();
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
  ok('la empresa abre su vacante publicada: sin postulantes');
  await salirUi();

  const candidatos = [`pa-${SUF}@cand.test`, `pb-${SUF}@cand.test`];
  for (const [i, correo] of candidatos.entries()) {
    await registrarUi(correo, `Candidato ${i ? 'B' : 'A'}`);
    await page.getByRole('link', { name: 'Explorar' }).first().click();
    await tarjeta().waitFor();
    if ((await page.locator('article').first().textContent()).includes(TITULO) === false) throw new Error('la vacante real no va primero');
    await tarjeta().getByText('Híbrido').waitFor();
    await tarjeta().getByText('PostgreSQL').waitFor();
    await tarjeta().getByRole('button', { name: 'Postularme' }).click();
    await tarjeta().getByText('En revisión').waitFor();
    if (i === 1) {
      // Retirar y volver a pedir: el backend borra la solicitud y la deja repetir.
      await tarjeta().getByRole('button', { name: 'Retirar postulación' }).click();
      await page.getByRole('button', { name: 'Retirar', exact: true }).click();
      await tarjeta().getByRole('button', { name: 'Postularme' }).waitFor();
      await tarjeta().getByRole('button', { name: 'Postularme' }).click();
      await tarjeta().getByText('En revisión').waitFor();
      ok('candidato B retira su postulación y se vuelve a postular');
    }
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
  await page.locator('#motivo').fill('Buscamos experiencia en conciliación de pagos y tu perfil apunta a datos.');
  await page.getByRole('button', { name: 'Enviar rechazo' }).click();
  await page.getByText('Postulación rechazada').first().waitFor();
  await page.getByRole('button', { name: 'Aceptar e invitar' }).click();
  await page.getByText('Candidato aceptado e invitado').first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.lista-simple a[href*="/candidatos/"]').length >= 1);
  ok('la empresa rechaza a uno y acepta al otro (la invitación queda registrada en el backend)');
  await page.screenshot({ path: 'e2e/postulantes.png', fullPage: true });
  await salirUi();

  // Rechazado (B, el segundo: el backend lista del más antiguo al más reciente): sin acciones y sin prueba
  await entrarUi(candidatos[1]);
  await page.waitForURL('**/mis-pruebas');
  await page.getByRole('link', { name: 'Explorar' }).first().click();
  await tarjeta().getByText('No continúa').waitFor();
  if ((await tarjeta().getByRole('button').filter({ hasText: /Retirar|Postularme/ }).count()) !== 0) throw new Error('el rechazado conserva acciones');
  if ((await page.getByRole('link', { name: 'Backend demo' }).count()) !== 0) throw new Error('ve la prueba');
  await tarjeta().getByText('conciliación de pagos').waitFor();
  ok('el candidato rechazado ve «No continúa», el motivo de la empresa y no puede actuar');
  await salirUi();

  // Aceptado (A): la prueba aparece de verdad en Mis pruebas
  await entrarUi(candidatos[0]);
  await page.waitForURL('**/mis-pruebas');
  await page.getByRole('link', { name: TITULO }).first().waitFor();
  ok('el candidato aceptado recibe la prueba real en «Mis pruebas»');
  await page.getByRole('link', { name: 'Explorar' }).first().click();
  await tarjeta().getByText('Invitado').waitFor();
  await tarjeta().getByRole('link', { name: 'Hacer la prueba' }).click();
  await page.getByRole('heading', { name: TITULO }).waitFor();
  ok('Explorar muestra «Invitado» y lleva a la prueba');

  await page.getByRole('button', { name: 'Comprobar mi equipo' }).click();
  await page.getByText('Funciona').first().waitFor();
  if ((await page.locator('app-verificacion-tecnica li span[aria-hidden]', { hasText: '✓' }).count()) !== 3) throw new Error('la verificación técnica no pasó cámara, micrófono y conexión');
  ok('la verificación técnica comprueba cámara, micrófono y conexión con el servidor');

  // El candidato entrega y descarga su propio archivo con el enlace firmado.
  const comprobarDescarga = async (boton) => {
    // El enlace se abre con window.open y la pestaña se cierra al bajar el archivo:
    // se captura la URL que la pantalla pide abrir y se descarga con fetch.
    await page.evaluate(() => {
      window.__abierta = null;
      window.open = (u) => {
        window.__abierta = String(u);
        return null;
      };
    });
    await boton.click();
    await page.waitForFunction(() => window.__abierta);
    const url = await page.evaluate(() => window.__abierta);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`descarga ${r.status} desde ${new URL(url).host}`);
    return new URL(url).host;
  };
  await page.locator('input[type=file]').first().setInputFiles(new URL('./respuesta-ana.zip', import.meta.url).pathname);
  await page.getByRole('button', { name: /Entregar intento 1/ }).click();
  await page.getByRole('button', { name: 'Descargar' }).first().waitFor();
  // Verificación con cámara (Chrome con cámara de prueba): foto real hasta el bucket.
  await page.getByRole('button', { name: 'Verificar con cámara' }).click();
  await page.getByRole('button', { name: 'Tomar foto y verificar' }).click();
  await page.getByText('Verificada con cámara').waitFor();
  ok('el candidato verifica su entrega con la cámara y la foto se guarda');
  const host = await comprobarDescarga(page.getByRole('button', { name: 'Descargar' }).first());
  ok(`el candidato descarga su entrega con el enlace firmado (${host})`);
  await page.getByRole('button', { name: 'Ver historial' }).first().click();
  await page.locator('app-historial-de-entrega li').first().waitFor();
  ok('el candidato ve el historial de estados de su entrega, con momento y motivo');
  // --- La empresa edita los datos de la vacante e invita por correo
  const invitadoCorreo = `pc-${SUF}@cand.test`;
  await registrar(invitadoCorreo);
  const tokNuevo = (await entrar(recluCorreo)).tokenDeAcceso; // el token de arriba ya caducó
  await salirUi();
  await entrarUi(recluCorreo);
  await page.waitForURL('**/panel');
  await page.goto(`${WEB}/vacantes/${vacante.id}`);
  await page.getByRole('button', { name: 'Editar datos' }).click();
  await page.locator('#e-modalidad').selectOption('remoto');
  await page.locator('#e-tecnologias').fill('Node.js, Redis, Docker');
  await page.locator('#e-finalistas').fill('3');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByText('Cambios guardados').first().waitFor();
  await page.getByText('Docker').first().waitFor();
  await page.getByText('3 finalistas por evaluar').waitFor();
  const guardada = await api(`/vacantes/${vacante.id}`, { token: tokNuevo });
  if (guardada.modalidad !== 'remoto' || guardada.tecnologias.join() !== 'Node.js,Redis,Docker') throw new Error('la edición no llegó al backend');
  ok('la empresa edita modalidad, tecnologías y finalistas, y el backend lo guarda');

  await page.locator('#destinatario').fill(invitadoCorreo);
  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.lista-simple a[href*="/candidatos/"]').length >= 2);
  const conInvitados = await api(`/vacantes/${vacante.id}`, { token: tokNuevo });
  if (!conInvitados.candidatos.some((c) => c.idCandidato)) throw new Error('no se invitó');
  await page.locator('#destinatario').fill('nadie@no-existe.test');
  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  await page.getByText('No encontramos eso').waitFor();
  ok('invitar por correo funciona, y un correo desconocido muestra el error');
  await page.reload();
  await page.getByRole('button', { name: 'Descargar' }).first().waitFor();
  await comprobarDescarga(page.getByRole('button', { name: 'Descargar' }).first());
  ok('la empresa descarga la entrega desde la tabla de la vacante');
  const verFoto = page.getByRole('link', { name: 'ver foto' });
  await verFoto.waitFor();
  const foto = await fetch(await verFoto.getAttribute('href'));
  if (!foto.ok || !(foto.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('la foto no se sirve');
  ok('la empresa ve «Verificada con cámara» y abre la foto con el enlace firmado');
  // --- Perfil público: el candidato lo autoriza y la empresa abre el banco de talento
  // La evaluación la deja la cola de IA; aquí se siembra la fila que esa cola habría dejado
  // para que el banco de talento tenga a quién listar. Si el ai-service está conectado, la
  // cola ya la dejó (con nota 0 en modo simulado): entonces se le fija la nota 88.
  const { rows: [entregaDeA] } = await db.query(
    `select id, id_candidato, id_ejercicio from entregas.entregas where id_vacante = $1 limit 1`, [vacante.id]);
  await db.query(
    `insert into evaluacion.evaluaciones (id_entrega, id_vacante, id_candidato, id_empresa, id_ejercicio, id_version,
       nota_final, proveedor, modelo, archivos, riesgo_inyeccion, creada_en)
     values ($1, $2, $3, $4, $5, gen_random_uuid(), 88, 'gemini', 'gemini-3.5-flash', 1, 'ninguno', now())
     on conflict (id_entrega) do update set nota_final = 88`,
    [entregaDeA.id, vacante.id, entregaDeA.id_candidato, empresa.id, entregaDeA.id_ejercicio]);
  await salirUi();
  await entrarUi(candidatos[0]);
  await page.waitForURL('**/mis-pruebas');
  await page.goto(`${WEB}/mi-cuenta`);
  const interruptor = page.getByRole('switch', { name: /perfil/i });
  await interruptor.check();
  await page.getByText('Permitido').nth(1).waitFor();
  await page.reload();
  await page.getByRole('switch', { name: /perfil/i }).waitFor();
  if (!(await page.getByRole('switch', { name: /perfil/i }).isChecked())) throw new Error('el permiso no persistió en el backend');
  ok('el candidato autoriza su perfil público en «Mi cuenta» y el backend lo registra');
  await salirUi();
  await entrarUi(recluCorreo);
  await page.waitForURL('**/panel');
  await page.getByRole('link', { name: 'Talento' }).click();
  await page.getByRole('heading', { name: 'Banco de talento' }).waitFor();
  await page.getByRole('cell', { name: /Candidato ••••/ }).first().waitFor();
  await page.getByRole('cell', { name: '88', exact: true }).first().waitFor();
  await page.locator('#vacante').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Invitar', exact: true }).first().click();
  await page.getByText('quedó invitado a la vacante').waitFor();
  ok('el banco de talento lista a quien autorizó (alias y nota 88) y la empresa lo invita a su vacante');
  // --- Respuesta escrita en línea, «Descargar mis datos» y «Eliminar cuenta» (el candidato invitado por correo)
  await salirUi();
  await entrarUi(invitadoCorreo);
  await page.waitForURL('**/mis-pruebas');
  await page.goto(`${WEB}/mis-pruebas/${vacante.id}`);
  await page.getByRole('button', { name: 'Escribir la respuesta aquí' }).click();
  await page.locator('textarea').first().fill('# Mi respuesta\n\nUso un mapa para contar existencias.');
  await page.getByRole('button', { name: /Entregar intento 1/ }).click();
  await page.getByRole('button', { name: 'Descargar' }).first().waitFor();
  const entregasPropias = await api('/entregas/mias', { token: (await entrar(invitadoCorreo)).tokenDeAcceso });
  if (entregasPropias[0]?.archivoNombre !== 'respuesta.md') throw new Error('la respuesta escrita no llegó como respuesta.md');
  ok('el candidato entrega una respuesta escrita en línea (llega como respuesta.md)');

  // Sesión cronometrada: el ejercicio con límite no deja entregar hasta iniciarlo, y el reloj es del servidor.
  const tokReloj = (await entrar(recluCorreo)).tokenDeAcceso;
  const ejReloj = await api('/ejercicios', {
    token: tokReloj,
    cuerpo: {
      titulo: 'Con reloj de 30 minutos', duracionMinutos: 30,
      enunciado: 'Resuelve el problema en el tiempo dado y entrega tu solución.',
      criterios: [{ nombre: 'Corrección', descripcion: 'Cumple el enunciado.', peso: 100, escalaMaxima: 10 }],
    },
  });
  const vacReloj = await api('/vacantes', {
    token: tokReloj,
    cuerpo: { titulo: `Con reloj ${SUF}`, descripcion: 'Vacante para probar la sesión cronometrada de punta a punta.' },
  });
  const formularioDataset = new FormData();
  formularioDataset.append('archivo', new Blob(['id,valor\n1,10\n'], { type: 'text/csv' }), 'datos.csv');
  const subida = await fetch(`${API}/ejercicios/${ejReloj.id}/adjuntos`, {
    method: 'POST', headers: { authorization: `Bearer ${tokReloj}` }, body: formularioDataset,
  });
  if (subida.status !== 201) throw new Error(`adjuntar dataset -> ${subida.status}`);
  await api(`/vacantes/${vacReloj.id}/ejercicios`, { token: tokReloj, metodo: 'PUT', cuerpo: { idsDeEjercicios: [ejReloj.id] } });
  await api(`/vacantes/${vacReloj.id}/publicar`, { token: tokReloj, cuerpo: {} });
  await api(`/vacantes/${vacReloj.id}/candidatos`, { token: tokReloj, cuerpo: { correo: invitadoCorreo } });

  await page.goto(`${WEB}/mis-pruebas/${vacReloj.id}`);
  await page.getByText('30 minutos').first().waitFor();
  if ((await page.locator('input[type=file]').count()) !== 0) throw new Error('la zona de entrega aparece antes de iniciar');
  await page.getByText('Archivos del enunciado').waitFor();
  const urlDataset = await (async () => {
    await page.evaluate(() => { window.__abierta = null; window.open = (u) => { window.__abierta = String(u); return null; }; });
    await page.locator('.adjuntos').getByRole('button', { name: 'Descargar' }).click();
    await page.waitForFunction(() => window.__abierta);
    return page.evaluate(() => window.__abierta);
  })();
  const dataset = await fetch(urlDataset);
  if (!dataset.ok || (await dataset.text()) !== 'id,valor\n1,10\n') throw new Error('el dataset descargado no coincide');
  ok('el candidato descarga el dataset adjunto del enunciado con enlace firmado');
  await page.getByRole('button', { name: 'Iniciar el ejercicio' }).click();
  await page.getByText(/Te quedan/).waitFor();
  await page.locator('input[type=file]').waitFor({ state: 'attached' });
  const texto = await page.locator('.cuenta').textContent();
  if (!/^(29|30):\d\d$/.test(texto.trim())) throw new Error(`la cuenta atrás no arranca en ~30 min: ${texto}`);
  ok('el ejercicio con límite se inicia, corre la cuenta atrás del servidor y recién entonces permite entregar');

  await page.goto(`${WEB}/mi-cuenta`);
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar mis datos' }).click(),
  ]);
  const ruta = await descarga.path();
  const datos = JSON.parse((await import('node:fs')).readFileSync(ruta, 'utf8'));
  if (datos.perfil.correo !== invitadoCorreo || datos.entregas.length !== 1) throw new Error('el archivo de datos no trae lo propio');
  ok('«Descargar mis datos» baja un JSON con el perfil y las entregas propias');

  await page.locator('#contrasena-borrado').fill(PASS);
  await page.locator('form').getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  await page.locator('ui-confirmacion').getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  await page.waitForURL('**/acceso');
  const intento = await fetch(`${API}/autenticacion/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ correo: invitadoCorreo, contrasena: PASS, cliente: 'apk' }),
  });
  if (intento.status !== 401) throw new Error('la cuenta eliminada sigue abriendo sesión');
  ok('«Eliminar cuenta» pide la contraseña, cierra la sesión y la cuenta ya no entra');

  // --- A10: la empresa ve el uso de su ejercicio
  await entrarUi(recluCorreo);
  await page.waitForURL('**/panel');
  await page.goto(`${WEB}/ejercicios`);
  await page.getByText(/En 1 vacante · \d+ evaluaci/).first().waitFor();
  ok('el banco de ejercicios muestra en cuántas vacantes se usa cada uno y sus evaluaciones (A10)');

  await page.goto(`${WEB}/vacantes/${vacante.id}/auditoria`);
  await page.getByText('Integridad de las evaluaciones').waitFor();
  await page.getByText('No medible.').waitFor();
  const [informe] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar (JSON)' }).click(),
  ]);
  const contenido = JSON.parse((await import('node:fs')).readFileSync(await informe.path(), 'utf8'));
  if (contenido.sesgo.medible !== false || !contenido.integridad) throw new Error('el informe descargado no es el de la auditoría');
  ok('el informe de auditoría (A09) muestra integridad, distribución y trazabilidad, declara que el sesgo no es medible y se descarga');
  // --- Moderación: caso antifraude -> el moderador confirma -> el candidato lo lee y disputa -> otro moderador restaura
  const { rows: [cand] } = await db.query(`select id_candidato from entregas.entregas where id_vacante = $1 limit 1`, [vacante.id]);
  const { rows: [evSospechosa] } = await db.query(
    `insert into evaluacion.evaluaciones (id_entrega, id_vacante, id_candidato, id_empresa, id_ejercicio, id_version,
       nota_final, proveedor, modelo, archivos, riesgo_inyeccion, puntaje_inyeccion, creada_en)
     values (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), gen_random_uuid(), 99, 'gemini', 'gemini-3.5-flash', 1, 'alto', 12, now())
     returning id`, [vacante.id, cand.id_candidato, empresa.id]);
  await db.query(
    `insert into evaluacion.calificaciones_criterio (id_evaluacion, orden, criterio, puntaje, escala_maxima, peso, evidencia)
     values ($1, 0, 'Corrección', 5, 5, 100, 'El archivo contiene instrucciones dirigidas al evaluador.')`, [evSospechosa.id]);
  await db.query(
    `insert into moderacion.casos (id_evaluacion, id_vacante, id_candidato, origen, vence_en)
     values ($1, $2, $3, 'antifraude', now() + interval '24 hours')`, [evSospechosa.id, vacante.id, cand.id_candidato]);
  const tokAdmin = (await entrar(adminCorreo)).tokenDeAcceso;
  const modUno = `mod1-${SUF}@meritia.test`, modDos = `mod2-${SUF}@meritia.test`;
  for (const [correo, nombre] of [[modUno, 'Moderadora Uno'], [modDos, 'Moderador Dos']]) {
    await api('/moderacion/moderadores', { token: tokAdmin, cuerpo: { correo, contrasena: PASS, nombreCompleto: nombre } });
  }

  await salirUi();
  await entrarUi(modUno);
  await page.waitForURL('**/moderacion');
  await page.getByRole('cell', { name: /Candidato ••••/ }).first().waitFor();
  await page.getByRole('link', { name: 'Revisar' }).first().click();
  await page.getByText('instrucciones dirigidas al evaluador').waitFor();
  await page.locator('#justificacion').fill('El archivo incluye texto que intenta dictarle la nota al evaluador.');
  await page.getByRole('button', { name: 'Confirmar la descalificación' }).click();
  await page.getByText('Descalificación confirmada').first().waitFor();
  ok('el moderador revisa un caso antifraude con alias, evidencia y justificación, y confirma la descalificación');
  await salirUi();

  await entrarUi(candidatos[0]);
  await page.waitForURL('**/mis-pruebas');
  await page.goto(`${WEB}/mis-resultados`);
  await page.getByText('Descalificada.').waitFor();
  await page.getByText('intenta dictarle la nota al evaluador').waitFor();
  await page.getByRole('button', { name: 'Disputar la decisión' }).click();
  await page.locator('textarea').first().fill('El texto era un comentario de mi propio código, no una instrucción para nadie.');
  await page.getByRole('button', { name: 'Enviar disputa' }).click();
  await page.getByText('Disputa enviada').first().waitFor();
  ok('el candidato lee la justificación de la descalificación y la disputa');
  await salirUi();

  await entrarUi(modDos);
  await page.waitForURL('**/moderacion');
  await page.getByText('Disputa del candidato').first().waitFor();
  await page.getByRole('link', { name: 'Revisar' }).first().click();
  await page.getByText('Lo que explica el candidato').waitFor();
  await page.locator('#justificacion').fill('El comentario es parte del código del candidato: la disputa es válida.');
  await page.getByRole('button', { name: 'Restaurar la evaluación' }).click();
  await page.getByText('Evaluación restaurada').first().waitFor();
  ok('otro moderador decide la disputa y restaura la evaluación');
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
