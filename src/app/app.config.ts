import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { LOCALE_ID, type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

// Sin esto, las fechas salen en ingles: "28 Oct 2026" en vez de "28 oct 2026",
// y el primer dia de la semana cambia. El producto es colombiano.
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // `withFetch` en vez de XHR: es lo que la APK de Capacitor usa, y tener el
    // mismo transporte en los dos sitios evita diferencias de cabeceras y de
    // credenciales que solo aparecerian en el movil.
    provideHttpClient(withFetch()),
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};
