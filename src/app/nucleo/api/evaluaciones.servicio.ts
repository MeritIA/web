import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Evaluacion, MetricasDeCola, MiPuesto } from './modelos';

@Injectable({ providedIn: 'root' })
export class EvaluacionesServicio {
  readonly #api = inject(Api);

  mias = () => this.#api.get<Evaluacion[]>('/evaluaciones/mias');
  deVacante = (idVacante: string) =>
    this.#api.get<Evaluacion[]>(`/evaluaciones/vacante/${idVacante}`);
  deEntrega = (idEntrega: string) =>
    this.#api.get<Evaluacion>(`/evaluaciones/entrega/${idEntrega}`);
  /** Solo administradores. No gasta un intento del candidato. */
  reintentar = (idEntrega: string) =>
    this.#api.post<{ idEntrega: string; estado: string }>(`/evaluaciones/${idEntrega}/reintentar`);
  miPuesto = (idVacante: string) =>
    this.#api.get<MiPuesto>(`/evaluaciones/vacante/${idVacante}/mi-puesto`);
  cola = () => this.#api.get<MetricasDeCola>('/evaluaciones/cola');
}
