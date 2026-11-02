import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Aviso, ResumenDeAvisos } from './modelos';

@Injectable({ providedIn: 'root' })
export class NotificacionesServicio {
  readonly #api = inject(Api);

  deVacante = (idVacante: string) =>
    this.#api.get<Aviso[]>(`/notificaciones/vacantes/${idVacante}`);
  /** Nunca toca un aviso ya enviado: apretarlo dos veces no repite correos. */
  reenviar = (idVacante: string) =>
    this.#api.post<ResumenDeAvisos>(`/notificaciones/vacantes/${idVacante}/reenviar`);
}
