import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, type Observable, throwError } from 'rxjs';
import type { ErrorDeApi } from './contrato';

/**
 * Donde vive la API.
 *
 * En desarrollo, el backend corre en el 3000 y este servidor en el 4200. No es
 * un problema de CORS por descuido: el backend ya trae `http://localhost:4200`
 * en su lista blanca de origenes de desarrollo, y las cookies llegan porque
 * dos puertos del mismo `localhost` son el MISMO sitio para `SameSite=strict`.
 *
 * Para produccion esto se reemplaza por configuracion de build. Se deja como
 * una constante y no como un `environment.ts` todavia porque hoy solo hay un
 * entorno y un fichero por entorno vacio es un sitio donde esconder errores.
 */
export const API = 'http://localhost:3000/api/v1';

/** Un fallo de la API ya traducido a algo que una pantalla puede mostrar. */
export class FalloDeApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'FalloDeApi';
  }

  /** 401: no hay sesion, o se vencio. Lo trata el servicio de sesion. */
  get esSinSesion(): boolean {
    return this.estado === 401;
  }
}

/**
 * El unico sitio del front que habla HTTP.
 *
 * DOS COSAS QUE HACE Y POR QUE
 *
 * 1. `withCredentials: true` en TODAS las peticiones. Sin esto el navegador no
 *    manda la cookie de sesion y todo responde 401 sin explicacion. Va aqui y
 *    no en cada llamada porque olvidarlo una vez da un fallo que parece de
 *    permisos y es de transporte.
 * 2. Traduce el error HTTP a `FalloDeApi` con el mensaje del backend. El
 *    backend siempre responde `{ mensaje }`, y ese texto esta escrito para que
 *    una persona lo lea —"Revocaste el permiso de calificacion por IA..."—, asi
 *    que la pantalla lo muestra en vez de inventarse uno generico.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  get<T>(ruta: string): Observable<T> {
    return this.http.get<T>(`${API}${ruta}`, { withCredentials: true }).pipe(catchError(traducir));
  }

  post<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http
      .post<T>(`${API}${ruta}`, cuerpo, { withCredentials: true })
      .pipe(catchError(traducir));
  }

  put<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http
      .put<T>(`${API}${ruta}`, cuerpo, { withCredentials: true })
      .pipe(catchError(traducir));
  }
}

function traducir(error: unknown): Observable<never> {
  if (!(error instanceof HttpErrorResponse)) {
    return throwError(() => new FalloDeApi(0, 'Fallo inesperado.'));
  }

  // Estado 0 es el navegador diciendo "no llegue": servidor caido, CORS, o sin
  // red. Decirlo asi evita media hora buscando un error de sesion que no hay.
  if (error.status === 0) {
    return throwError(
      () => new FalloDeApi(0, 'No se pudo contactar al servidor. Comprueba que el backend este arriba.'),
    );
  }

  const cuerpo = error.error as ErrorDeApi | null;
  return throwError(() => new FalloDeApi(error.status, cuerpo?.mensaje ?? error.statusText));
}
