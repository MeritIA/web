import { Location, registerLocaleData } from '@angular/common';
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
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PresetMeritIA } from './nucleo/ui/tema-primeng';
import { rutas } from './app.routes';
import { avisarFallosGlobales, credenciales, renovarSesion } from './nucleo/http/interceptores';
import { Plataforma } from './nucleo/plataforma/plataforma';
import { Sesion } from './nucleo/sesion/sesion';
import { TemaServicio } from './nucleo/ui/tema';

registerLocaleData(localeEs);

export const configuracion: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'es-CO' },

    // PrimeNG: el modo oscuro lo decide `<html data-tema="oscuro">`, no el sistema.
    // `cssLayer` hace que los estilos propios (sin capa) siempre ganen a los del tema.
    providePrimeNG({
      ripple: true,
      theme: {
        preset: PresetMeritIA,
        options: {
          darkModeSelector: ':root[data-tema="oscuro"]',
          cssLayer: { name: 'primeng', order: 'primeng' },
        },
      },
      translation: {
        accept: 'Aceptar',
        reject: 'Cancelar',
        clear: 'Limpiar',
        today: 'Hoy',
      },
    }),
    MessageService,
    ConfirmationService,

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
      const ubicacion = inject(Location);
      const plataforma = inject(Plataforma);
      inject(TemaServicio);
      // Sin esperar: el arranque no debe depender de que el puente nativo conteste.
      void plataforma.iniciar(() => ubicacion.back());
      return inject(Sesion).restaurar();
    }),
  ],
};
