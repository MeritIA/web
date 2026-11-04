import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es-CO';
import {
  type ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { rutas } from './app.routes';
import { avisarFallosGlobales, credenciales, renovarSesion } from './nucleo/http/interceptores';
import { Sesion } from './nucleo/sesion/sesion';
import { TemaServicio } from './nucleo/ui/tema';

registerLocaleData(localeEs);

export const configuracion: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'es-CO' },

    provideRouter(
      rutas,
      withComponentInputBinding(),
      // Al navegar se vuelve arriba; al volver atrás se recupera la posición.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),

    // El orden importa: las credenciales primero, la renovación después, y el
    // aviso al final, que es el que ve la persona.
    provideHttpClient(
      withFetch(),
      withInterceptors([credenciales, renovarSesion, avisarFallosGlobales]),
    ),

    // Antes del primer render se resuelve quién está dentro: así los guardias
    // deciden con la verdad y no con un «todavía no sé».
    provideAppInitializer(() => {
      inject(TemaServicio);
      return inject(Sesion).restaurar();
    }),
  ],
};
