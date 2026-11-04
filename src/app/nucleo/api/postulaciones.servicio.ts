import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Postulacion, Postulante, VacanteAbierta } from './modelos';

/** Explorar vacantes abiertas, postular y decidir sobre los postulantes. */
@Injectable({ providedIn: 'root' })
export class PostulacionesServicio {
  readonly #api = inject(Api);

  // --- Candidato ---------------------------------------------------------------
  abiertas = () => this.#api.get<VacanteAbierta[]>('/vacantes/abiertas');
  mias = () => this.#api.get<Postulacion[]>('/postulaciones/mias');
  postular = (idVacante: string) => this.#api.post<Postulacion>(`/vacantes/${idVacante}/postular`);
  /** Solo se retira lo que la empresa todavía no decidió. */
  retirar = (idVacante: string) => this.#api.borrar<void>(`/vacantes/${idVacante}/postular`);

  // --- Empresa -----------------------------------------------------------------
  deVacante = (idVacante: string) =>
    this.#api.get<Postulante[]>(`/vacantes/${idVacante}/postulaciones`);
  /** Acepta y, en la misma transacción del backend, invita: la prueba queda abierta para esa persona. */
  aceptar = (idVacante: string, idCandidato: string) =>
    this.#api.post<Postulante>(`/vacantes/${idVacante}/postulaciones/${idCandidato}/aceptar`);
  /** El motivo (mínimo 20 caracteres) es lo único que el candidato recibe al no avanzar. */
  rechazar = (idVacante: string, idCandidato: string, motivo: string) =>
    this.#api.post<Postulante>(`/vacantes/${idVacante}/postulaciones/${idCandidato}/rechazar`, {
      motivo,
    });
}
