import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from './sesion';

/**
 * Las primeras pruebas del front, y no son casuales.
 *
 * `Sesion` es donde descansa el modelo de seguridad entero: el token vive en
 * una cookie HttpOnly que el JavaScript no puede leer, así que la identidad hay
 * que **preguntarla** al servidor. Un fallo aquí no se ve a simple vista —la
 * pantalla pinta algo— y se nota cuando alguien ve lo que no debe.
 *
 * Lo que se fija aquí es que nadie "optimice" esto guardando el usuario en
 * `localStorage` para ahorrarse una llamada. Sería un atajo que miente: la
 * cookie puede vencer o cerrarse en otra pestaña, y el front seguiría pintando
 * un panel que el servidor ya no sirve.
 */
describe('Sesion', () => {
  let sesion: Sesion;
  let http: HttpTestingController;

  const USUARIO = {
    id: '11111111-1111-4111-8111-111111111111',
    correo: 'ana@ejemplo.com',
    nombreCompleto: 'Ana Maria Rojas',
    rol: 'candidato' as const,
    idEmpresa: null,
  };

  /** Deja correr las tareas pendientes: una promesa encadenada no basta. */
  const drenar = () => new Promise((listo) => setTimeout(listo, 0));

  beforeEach(() => {
    localStorage.clear();
    // En este montaje (Angular + vitest) el TestBed NO se reinicia solo entre
    // pruebas, y configurarlo dos veces lanza "already been instantiated".
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), Sesion],
    });
    sesion = TestBed.inject(Sesion);
    http = TestBed.inject(HttpTestingController);
  });

  it('nace sin usuario y sin haberse restaurado, para no parpadear un "no autorizado"', () => {
    expect(sesion.usuario()).toBeNull();
    expect(sesion.autenticado()).toBe(false);
    expect(sesion.restaurada()).toBe(false);
  });

  it('la identidad se la pregunta al servidor: no la deduce del navegador', async () => {
    const pendiente = sesion.restaurar();
    // Si alguien cambiara esto por leer `localStorage`, esta espera fallaría
    // porque no habría ninguna petición que atender.
    http.expectOne({ method: 'GET', url: '/api/v1/autenticacion/yo' }).flush(USUARIO);
    await pendiente;

    expect(sesion.usuario()).toEqual(USUARIO);
    expect(sesion.esCandidato()).toBe(true);
    expect(sesion.gestiona()).toBe(false);
  });

  it('un 401 al restaurar es un estado normal, no un fallo', async () => {
    const pendiente = sesion.restaurar();
    http
      .expectOne('/api/v1/autenticacion/yo')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await pendiente;

    expect(sesion.usuario()).toBeNull();
    // Y `restaurada` se pone a true igual: si no, la aplicación se quedaría
    // esperando para siempre a saber quién eres.
    expect(sesion.restaurada()).toBe(true);
  });

  it('NO guarda nada en el navegador al entrar', async () => {
    const pendiente = sesion.entrar({ correo: USUARIO.correo, contrasena: 'x' });
    http.expectOne({ method: 'POST', url: '/api/v1/autenticacion/login' }).flush({});
    // `entrar` pregunta la identidad DESPUES de que el login resuelva, asi que
    // esa segunda peticion todavia no existe: hay que dejar correr la
    // microtarea antes de esperarla.
    await drenar();
    http.expectOne({ method: 'GET', url: '/api/v1/autenticacion/yo' }).flush(USUARIO);
    await pendiente;

    // El control central: ni el token ni el usuario pueden acabar en el disco
    // del navegador. Lo único que vive ahí es la preferencia de tema.
    //
    // `cliente` no se manda, y es correcto: el backend lo omite a `web`, que es
    // la opción segura --cookie HttpOnly-- si un cliente no lo declara.
    const claves = Object.keys(localStorage);
    expect(claves.filter((c) => !c.includes('tema'))).toEqual([]);
  });

  it('el rol decide qué se pinta, y un reclutador gestiona', async () => {
    const pendiente = sesion.restaurar();
    http.expectOne('/api/v1/autenticacion/yo').flush({
      ...USUARIO,
      rol: 'reclutador',
      idEmpresa: '22222222-2222-4222-8222-222222222222',
    });
    await pendiente;

    expect(sesion.gestiona()).toBe(true);
    expect(sesion.esCandidato()).toBe(false);
    expect(sesion.tiene('reclutador', 'administrador')).toBe(true);
    expect(sesion.tiene('candidato')).toBe(false);
  });

  it('salir olvida al usuario aunque el servidor falle', async () => {
    const restaurar = sesion.restaurar();
    http.expectOne('/api/v1/autenticacion/yo').flush(USUARIO);
    await restaurar;

    const pendiente = sesion.salir();
    await drenar();
    http
      .expectOne({ method: 'POST', url: '/api/v1/autenticacion/cerrar-sesiones' })
      .flush(null, { status: 500, statusText: 'Server Error' });
    await pendiente;

    // Si el servidor no responde, lo peor que puede pasar es que la pantalla
    // siga mostrando una sesión que la persona ya quiso cerrar. Se olvida igual.
    expect(sesion.usuario()).toBeNull();
  });

  afterEach(() => {
    http.verify();
  });
});
