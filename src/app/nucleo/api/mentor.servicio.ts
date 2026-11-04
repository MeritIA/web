import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { ContextoDelMentor, RespuestaDelMentor, TurnoDelMentor } from './modelos';

/** Mentor IA: aconseja a partir de las evaluaciones propias. */
@Injectable({ providedIn: 'root' })
export class MentorServicio {
  readonly #api = inject(Api);

  /** El resumen exacto que se le entrega al mentor. */
  contexto = () => this.#api.get<ContextoDelMentor>('/mentor/contexto');

  preguntar = (pregunta: string, historial: TurnoDelMentor[]) =>
    this.#api.post<RespuestaDelMentor>('/mentor/preguntar', {
      pregunta,
      // El servicio solo usa los últimos turnos: no se manda lo que se va a tirar.
      historial: historial.slice(-6),
    });
}
