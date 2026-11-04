import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type {
  DetalleDeCaso,
  EstadoDeCaso,
  FilaDeCaso,
  MetricasDeModeracion,
  MiCaso,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class ModeracionServicio {
  readonly #api = inject(Api);

  // Moderador
  bandeja = (estado: EstadoDeCaso = 'abierto') =>
    this.#api.get<FilaDeCaso[]>('/moderacion/casos', { estado });
  detalle = (id: string) => this.#api.get<DetalleDeCaso>(`/moderacion/casos/${id}`);
  decidir = (id: string, decision: 'confirmar' | 'restaurar', justificacion: string) =>
    this.#api.post<unknown>(`/moderacion/casos/${id}/decidir`, { decision, justificacion });
  metricas = () => this.#api.get<MetricasDeModeracion>('/moderacion/metricas');

  // Candidato
  misCasos = () => this.#api.get<MiCaso[]>('/moderacion/mis-casos');
  disputar = (id: string, explicacion: string) =>
    this.#api.post<unknown>(`/moderacion/casos/${id}/disputar`, { explicacion });

  // Administrador
  crearModerador = (datos: { correo: string; contrasena: string; nombreCompleto: string }) =>
    this.#api.post<unknown>('/moderacion/moderadores', datos);
}
