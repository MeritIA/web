import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AlmacenTokens, type Tokens } from '../plataforma/almacen-tokens';
import { Plataforma } from '../plataforma/plataforma';
import { Sesion } from './sesion';

/**
 * La sesión en la APK: sin cookies, con los tokens en el cuerpo de la respuesta
 * y guardados en el almacén seguro (aquí, un doble en memoria).
 */
class AlmacenDoble {
  tokens: Tokens | null = null;
  acceso = () => this.tokens?.acceso ?? null;
  renovacion = () => this.tokens?.renovacion ?? null;
  cargar = () => Promise.resolve();
  guardar = (t: Tokens) => {
    this.tokens = t;
    return Promise.resolve();
  };
  borrar = () => {
    this.tokens = null;
    return Promise.resolve();
  };
}

describe('Sesion en la APK', () => {
  let sesion: Sesion;
  let http: HttpTestingController;
  let almacen: AlmacenDoble;
  const drenar = () => new Promise((listo) => setTimeout(listo, 0));
  const SESION = {
    tokenDeAcceso: 'acceso-nuevo',
    tokenDeRenovacion: 'renovacion-nueva',
    expiraEn: '2026-11-06T00:00:00Z',
    rol: 'candidato',
    idUsuario: 'u1',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    almacen = new AlmacenDoble();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Plataforma, useValue: { nativa: signal(true) } },
        { provide: AlmacenTokens, useValue: almacen },
      ],
    });
    sesion = TestBed.inject(Sesion);
    http = TestBed.inject(HttpTestingController);
  });

  it('sin tokens guardados no pregunta quién es: es la primera vez en el dispositivo', async () => {
    await sesion.restaurar();
    http.expectNone('/api/v1/autenticacion/yo');
    expect(sesion.restaurada()).toBe(true);
    expect(sesion.autenticado()).toBe(false);
  });

  it('al arrancar con el acceso vencido renueva una vez y conserva la sesión', async () => {
    almacen.tokens = { acceso: 'vencido', renovacion: 'renovacion-vieja' };
    const pendiente = sesion.restaurar();
    await drenar();
    http.expectOne('/api/v1/autenticacion/yo').flush({}, { status: 401, statusText: 'No' });
    await drenar();
    http.expectOne('/api/v1/autenticacion/renovar').flush(SESION);
    await drenar();
    http
      .expectOne('/api/v1/autenticacion/yo')
      .flush({ id: 'u1', rol: 'candidato', idEmpresa: null });
    await pendiente;

    expect(sesion.autenticado()).toBe(true);
  });

  it('el login declara cliente apk y guarda los tokens que vuelven en el cuerpo', async () => {
    const entrada = sesion.entrar({ correo: 'a@b.co', contrasena: 'una-frase-larga-y-dificil' });
    const login = http.expectOne('/api/v1/autenticacion/login');
    expect(login.request.body).toMatchObject({ cliente: 'apk', correo: 'a@b.co' });
    login.flush(SESION);
    await drenar();
    http
      .expectOne('/api/v1/autenticacion/yo')
      .flush({ id: 'u1', rol: 'candidato', idEmpresa: null });
    await entrada;

    expect(almacen.tokens).toEqual({ acceso: 'acceso-nuevo', renovacion: 'renovacion-nueva' });
  });

  it('si el servidor no manda los tokens, el login falla en vez de dejar una sesión fantasma', async () => {
    const entrada = sesion.entrar({ correo: 'a@b.co', contrasena: 'una-frase-larga-y-dificil' });
    http.expectOne('/api/v1/autenticacion/login').flush({ ...SESION, tokenDeAcceso: undefined });
    await expect(entrada).rejects.toThrow();
    expect(sesion.autenticado()).toBe(false);
  });

  it('varias renovaciones simultáneas hacen una sola llamada (la rotación invalidaría las demás)', async () => {
    almacen.tokens = { acceso: 'viejo', renovacion: 'renovacion-vieja' };
    const a = sesion.renovar();
    const b = sesion.renovar();
    const llamada = http.expectOne('/api/v1/autenticacion/renovar');
    expect(llamada.request.body).toEqual({ tokenDeRenovacion: 'renovacion-vieja', cliente: 'apk' });
    llamada.flush(SESION);
    await Promise.all([a, b]);

    expect(almacen.tokens?.acceso).toBe('acceso-nuevo');
  });

  it('al salir borra los tokens aunque el servidor no conteste', async () => {
    almacen.tokens = { acceso: 'x', renovacion: 'y' };
    const salida = sesion.salir();
    http.expectOne('/api/v1/autenticacion/cerrar-sesiones').error(new ProgressEvent('error'));
    await salida;

    expect(almacen.tokens).toBeNull();
  });
});
