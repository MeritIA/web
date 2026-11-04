import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { configuracion } from './app/app.config';

bootstrapApplication(App, configuracion).catch((error: unknown) => console.error(error));
