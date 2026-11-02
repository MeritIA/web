import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import type { Rol } from '../api/modelos';
import { Sesion, inicioDe } from './sesion';

/** Exige sesión. Recuerda a dónde iba la persona para devolverla ahí. */
export const guardiaSesion: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return (
    sesion.autenticado() ||
    router.createUrlTree(['/acceso'], { queryParams: { destino: estado.url } })
  );
};

/**
 * Exige un rol. No sustituye a la autorización del backend —que decide de
 * verdad—: evita ofrecer una pantalla que terminaría en 403.
 */
export const guardiaRol =
  (...roles: Rol[]): CanActivateFn =>
  (ruta, estado) => {
    const sesion = inject(Sesion);
    const router = inject(Router);
    if (!sesion.autenticado()) return guardiaSesion(ruta, estado);
    return sesion.tiene(...roles) || router.createUrlTree([inicioDe(sesion.rol()!)]);
  };

/** La raíz no es una pantalla: lleva a cada rol a donde empieza su trabajo. */
export const guardiaInicio: CanActivateFn = () => {
  const sesion = inject(Sesion);
  return inject(Router).createUrlTree([inicioDe(sesion.rol() ?? 'candidato')]);
};

/** Quien ya entró no vuelve a ver el formulario de acceso. */
export const guardiaInvitado: CanActivateFn = () => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return !sesion.autenticado() || router.createUrlTree([inicioDe(sesion.rol()!)]);
};
