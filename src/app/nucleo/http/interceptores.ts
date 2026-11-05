import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { entorno } from '../../../entornos/entorno';
import { AlmacenTokens } from '../plataforma/almacen-tokens';
import { Sesion } from '../sesion/sesion';
import { Avisos } from '../ui/avisos';

/**
 * Manda la cookie HttpOnly de sesión en cada petición.
 *
 * Sin esto el backend no vería el token en ninguna llamada, porque en web no
 * hay cabecera `Authorization` que poner: el token es deliberadamente
 * invisible para el JavaScript.
 */
export const credenciales: HttpInterceptorFn = (peticion, siguiente) => {
  if (!entorno.nativo) return siguiente(peticion.clone({ withCredentials: true }));

  // APK: sin cookies. El token sale del KeyStore y solo se adjunta a nuestra API
  // (nunca a los enlaces firmados de almacenamiento, que llevan su propia firma).
  const token = inject(AlmacenTokens).acceso();
  const esNuestra = peticion.url.startsWith(entorno.apiBase);
  return siguiente(
    token && esNuestra
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion,
  );
};

const esDeAutenticacion = (url: string) => url.includes('/autenticacion/');

/**
 * Renueva la sesión una sola vez cuando un token de acceso caduca a media
 * tarea, y reintenta la petición. Si la renovación tampoco vale, lleva a la
 * pantalla de acceso en vez de dejar la pantalla rota en silencio.
 */
export const renovarSesion: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  const tokens = inject(AlmacenTokens);

  return siguiente(peticion).pipe(
    catchError((causa: unknown) => {
      const es401 = causa instanceof HttpErrorResponse && causa.status === 401;
      if (!es401 || esDeAutenticacion(peticion.url)) return throwError(() => causa);

      return from(sesion.renovar()).pipe(
        switchMap(() => {
          // En la APK la cabecera ya llevaba el token caducado: hay que cambiarla.
          const nuevo = tokens.acceso();
          return siguiente(
            entorno.nativo && nuevo
              ? peticion.clone({ setHeaders: { Authorization: `Bearer ${nuevo}` } })
              : peticion,
          );
        }),
        catchError(() => {
          sesion.olvidar();
          void router.navigate(['/acceso'], { queryParams: { expirada: 1 } });
          return throwError(() => causa);
        }),
      );
    }),
  );
};

/**
 * Convierte en un aviso visible los dos fallos que una pantalla no puede
 * resolver por su cuenta: el límite de peticiones y la caída del servidor.
 */
export const avisarFallosGlobales: HttpInterceptorFn = (peticion, siguiente) => {
  const avisos = inject(Avisos);

  return siguiente(peticion).pipe(
    catchError((causa: unknown) => {
      if (causa instanceof HttpErrorResponse) {
        const espera = Number(causa.headers.get('Retry-After'));
        if (causa.status === 429) {
          avisos.aviso(
            espera > 0
              ? `Demasiadas peticiones seguidas. Reintenta en ${espera} s.`
              : 'Demasiadas peticiones seguidas. Espera un momento.',
          );
        } else if (causa.status >= 500 || causa.status === 0) {
          avisos.error('El servidor no respondió. Revisa que el backend esté levantado.');
        }
      }
      return throwError(() => causa);
    }),
  );
};
