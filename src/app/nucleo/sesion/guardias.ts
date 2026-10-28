import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';
import { Sesion } from './sesion';
import type { Rol } from '../api/contrato';

/**
 * ¿Hay sesión? Si no, a entrar, recordando a dónde iba.
 *
 * Recibe los servicios en vez de pedirlos con `inject()`: después de un `await`
 * ya no se está en el contexto de inyección de Angular, y pedirlos ahí falla
 * en tiempo de ejecución. Quien llama los inyecta primero, que es síncrono.
 */
async function resolver(sesion: Sesion, router: Router, url: string): Promise<true | UrlTree> {
  const quien = await sesion.restaurar();
  if (quien) return true;

  return router.createUrlTree(['/entrar'], { queryParams: { volverA: url } });
}

/**
 * Exige sesión.
 *
 * ESTO NO ES SEGURIDAD, Y CONVIENE TENERLO CLARO
 *
 * Un guardia del navegador solo decide qué se pinta. Quien protege los datos es
 * el backend, que tiene sus dos guardias globales y devuelve 404 —no 403— ante
 * un recurso de otra empresa. Si alguien desactiva esto en su navegador, no ve
 * ni un dato más: ve un panel vacío y un montón de 401.
 */
export const exigeSesion: CanActivateFn = (_ruta, estado) =>
  resolver(inject(Sesion), inject(Router), estado.url);

/**
 * Exige sesión y uno de estos roles.
 *
 * A quien no corresponde se le manda a SU inicio, no a una pantalla de «no
 * autorizado»: un candidato que abre `/panel` se equivocó de enlace, no cometió
 * un delito.
 */
export function exigeRol(...roles: readonly Rol[]): CanActivateFn {
  return async (_ruta, estado) => {
    // Los dos `inject` van antes del primer `await`, a propósito.
    const sesion = inject(Sesion);
    const router = inject(Router);

    const permitido = await resolver(sesion, router, estado.url);
    if (permitido !== true) return permitido;

    const quien = sesion.quien();
    if (quien && roles.includes(quien.rol)) return true;

    return router.createUrlTree([inicioDe(quien?.rol)]);
  };
}

/** Dónde empieza cada rol. Un sitio, para que no se decida en tres pantallas. */
export function inicioDe(rol: Rol | undefined): string {
  switch (rol) {
    case 'reclutador':
    case 'administrador':
      return '/panel';
    case 'candidato':
      return '/mis-retos';
    default:
      return '/entrar';
  }
}
