import type { Routes } from '@angular/router';
import { Marco } from './layout/marco';
import {
  guardiaInicio,
  guardiaInvitado,
  guardiaRol,
  guardiaSesion,
} from './nucleo/sesion/guardias';

const titulo = (texto: string) => `${texto} · MeritIA`;

/**
 * Mapa de la aplicación.
 *
 * Todo se carga de forma diferida salvo el marco: un candidato nunca descarga
 * el editor de rúbricas, y añadir una pantalla no engorda el arranque de las
 * demás. Los guardias de rol van aquí y no dentro de los componentes, para que
 * el mapa se lea entero de un vistazo.
 */
export const rutas: Routes = [
  {
    path: 'acceso',
    title: titulo('Entrar'),
    canActivate: [guardiaInvitado],
    loadComponent: () => import('./funciones/acceso/acceso').then((m) => m.Acceso),
  },
  {
    path: 'registro',
    title: titulo('Crear cuenta'),
    canActivate: [guardiaInvitado],
    loadComponent: () => import('./funciones/acceso/registro').then((m) => m.Registro),
  },
  {
    path: '',
    component: Marco,
    canActivate: [guardiaSesion],
    children: [
      { path: '', pathMatch: 'full', canActivate: [guardiaInicio], children: [] },

      // --- Reclutador y administrador ---------------------------------
      {
        path: 'panel',
        title: titulo('Panel'),
        canActivate: [guardiaRol('reclutador', 'administrador')],
        loadComponent: () => import('./funciones/panel/panel').then((m) => m.Panel),
      },
      {
        path: 'vacantes',
        canActivate: [guardiaRol('reclutador', 'administrador')],
        children: [
          {
            path: '',
            title: titulo('Vacantes'),
            loadComponent: () =>
              import('./funciones/vacantes/vacantes-lista').then((m) => m.VacantesLista),
          },
          {
            path: 'nueva',
            title: titulo('Nueva vacante'),
            loadComponent: () =>
              import('./funciones/vacantes/vacante-formulario').then((m) => m.VacanteFormulario),
          },
          {
            path: ':id',
            title: titulo('Vacante'),
            loadComponent: () =>
              import('./funciones/vacantes/vacante-detalle').then((m) => m.VacanteDetalle),
          },
          {
            path: ':id/reporte',
            title: titulo('Ranking'),
            loadComponent: () =>
              import('./funciones/reportes/reporte-vacante').then((m) => m.ReporteVacante),
          },
          {
            path: ':id/candidatos/:idCandidato',
            title: titulo('Candidato'),
            loadComponent: () =>
              import('./funciones/reportes/reporte-candidato').then((m) => m.ReporteCandidato),
          },
        ],
      },
      {
        path: 'ejercicios',
        canActivate: [guardiaRol('reclutador', 'administrador')],
        children: [
          {
            path: '',
            title: titulo('Banco de ejercicios'),
            loadComponent: () =>
              import('./funciones/ejercicios/ejercicios-lista').then((m) => m.EjerciciosLista),
          },
          {
            path: 'nuevo',
            title: titulo('Nuevo ejercicio'),
            loadComponent: () =>
              import('./funciones/ejercicios/ejercicio-formulario').then(
                (m) => m.EjercicioFormulario,
              ),
          },
          {
            path: ':id',
            title: titulo('Ejercicio'),
            loadComponent: () =>
              import('./funciones/ejercicios/ejercicio-detalle').then((m) => m.EjercicioDetalle),
          },
          {
            path: ':id/version',
            title: titulo('Nueva versión'),
            loadComponent: () =>
              import('./funciones/ejercicios/ejercicio-formulario').then(
                (m) => m.EjercicioFormulario,
              ),
          },
        ],
      },

      // --- Candidato ----------------------------------------------------
      {
        path: 'mis-pruebas',
        canActivate: [guardiaRol('candidato')],
        children: [
          {
            path: '',
            title: titulo('Mis pruebas'),
            loadComponent: () =>
              import('./funciones/candidato/mis-pruebas').then((m) => m.MisPruebas),
          },
          {
            path: ':id',
            title: titulo('Prueba'),
            loadComponent: () => import('./funciones/candidato/mi-prueba').then((m) => m.MiPrueba),
          },
        ],
      },
      {
        path: 'explorar',
        title: titulo('Explorar vacantes'),
        canActivate: [guardiaRol('candidato')],
        loadComponent: () => import('./funciones/candidato/explorar').then((m) => m.Explorar),
      },
      {
        path: 'mis-resultados',
        title: titulo('Mis resultados'),
        canActivate: [guardiaRol('candidato')],
        loadComponent: () =>
          import('./funciones/candidato/mis-resultados').then((m) => m.MisResultados),
      },

      {
        path: 'mi-cuenta',
        title: titulo('Mi cuenta'),
        canActivate: [guardiaRol('candidato')],
        loadComponent: () => import('./funciones/candidato/mi-cuenta').then((m) => m.MiCuenta),
      },

      // --- Administración ------------------------------------------------
      {
        path: 'administracion',
        title: titulo('Administración'),
        canActivate: [guardiaRol('administrador')],
        loadComponent: () =>
          import('./funciones/administracion/administracion').then((m) => m.Administracion),
      },
    ],
  },

  {
    path: '**',
    title: titulo('No encontrado'),
    loadComponent: () => import('./funciones/no-encontrado').then((m) => m.NoEncontrado),
  },
];
