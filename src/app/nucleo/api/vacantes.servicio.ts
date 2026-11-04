import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { EdicionVacante, EjercicioDeLaVacante, NuevaVacante, Vacante } from './modelos';

@Injectable({ providedIn: 'root' })
export class VacantesServicio {
  readonly #api = inject(Api);

  listar = () => this.#api.get<Vacante[]>('/vacantes');
  obtener = (id: string) => this.#api.get<Vacante>(`/vacantes/${id}`);
  crear = (datos: NuevaVacante) => this.#api.post<Vacante>('/vacantes', datos);
  editar = (id: string, datos: EdicionVacante) =>
    this.#api.patch<Vacante>(`/vacantes/${id}`, datos);
  /** Reemplaza la lista completa. Solo mientras la vacante es borrador. */
  definirEjercicios = (id: string, idsDeEjercicios: string[]) =>
    this.#api.put<Vacante>(`/vacantes/${id}/ejercicios`, { idsDeEjercicios });
  /** Acepta el correo del candidato o su identificador: el back resuelve el correo. */
  invitarCandidato = (id: string, correoOIdentificador: string) =>
    this.#api.post<Vacante>(
      `/vacantes/${id}/candidatos`,
      correoOIdentificador.includes('@')
        ? { correo: correoOIdentificador }
        : { idCandidato: correoOIdentificador },
    );
  /** Lo que lee quien va a resolver el reto: enunciado y rúbrica vigentes. */
  ejercicios = (id: string) => this.#api.get<EjercicioDeLaVacante[]>(`/vacantes/${id}/ejercicios`);
  /** Enlace firmado (cinco minutos) a un archivo adjunto del enunciado. */
  enlaceDeAdjunto = (id: string, idEjercicio: string, idAdjunto: string) =>
    this.#api.get<{ url: string; expiraEnSegundos: number }>(
      `/vacantes/${id}/ejercicios/${idEjercicio}/adjuntos/${idAdjunto}`,
    );
  /** Idempotente: volver a marcarlo no mueve la fecha, que es la que lee una auditoría. */
  contratar = (id: string, idCandidato: string) =>
    this.#api.post<unknown>(`/vacantes/${id}/candidatos/${idCandidato}/contratar`);
  publicar = (id: string) => this.#api.post<Vacante>(`/vacantes/${id}/publicar`);
  cerrar = (id: string) => this.#api.post<Vacante>(`/vacantes/${id}/cerrar`);
}
