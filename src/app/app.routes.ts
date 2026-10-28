import type { Routes } from '@angular/router';
import { exigeRol } from './nucleo/sesion/guardias';

/**
 * Las rutas del MVP.
 *
 * Cada pantalla se carga aparte (`loadComponent`) para que el primer paquete
 * que baja el navegador sea el de entrar y no el producto entero. En una APK
 * eso es lo que separa abrir la aplicacion de esperarla.
 *
 * El nombre de cada ruta esta en castellano porque es lo que ve el usuario en
 * la barra de direcciones, y el resto del proyecto —backend incluido— esta en
 * castellano.
 */
export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar · MeritIA',
    loadComponent: () => import('./modulos/autenticacion/entrar/entrar').then((m) => m.Entrar),
  },
  {
    path: 'panel',
    title: 'Panel de vacantes · MeritIA',
    // Un candidato que abra este enlace acaba en su propio inicio, no en una
    // pantalla de "no autorizado": se equivoco de enlace, no cometio un delito.
    canActivate: [exigeRol('reclutador', 'administrador')],
    loadComponent: () => import('./modulos/empresa/panel/panel').then((m) => m.Panel),
  },
  // Sin sesion, el guardia de `/panel` redirige a `/entrar` recordando a donde
  // iba. Con sesion de candidato, a su inicio. Es el unico sitio donde se
  // decide a donde va alguien que entra por la raiz.
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  { path: '**', redirectTo: 'panel' },
];
