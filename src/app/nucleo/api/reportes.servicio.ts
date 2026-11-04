import { Injectable, inject } from '@angular/core';
import { entorno } from '../../../entornos/entorno';
import { Api } from './api';
import type {
  IdentidadRevelada,
  PanelDeEmpresa,
  ReporteDeCandidato,
  ReporteDeVacante,
  RevelacionRegistrada,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class ReportesServicio {
  readonly #api = inject(Api);

  panel = () => this.#api.get<PanelDeEmpresa>('/reportes/panel');

  /** POST y no GET: deja rastro de quién miró la identidad y cuándo. */
  revelar = (idVacante: string, idCandidato: string) =>
    this.#api.post<IdentidadRevelada>(
      `/reportes/vacantes/${idVacante}/candidatos/${idCandidato}/revelar`,
    );

  revelaciones = (idVacante: string) =>
    this.#api.get<RevelacionRegistrada[]>(`/reportes/vacantes/${idVacante}/revelaciones`);

  deVacante = (idVacante: string) =>
    this.#api.get<ReporteDeVacante>(`/reportes/vacantes/${idVacante}`);

  deCandidato = (idVacante: string, idCandidato: string) =>
    this.#api.get<ReporteDeCandidato>(`/reportes/vacantes/${idVacante}/candidatos/${idCandidato}`);

  /**
   * El CSV lo sirve el backend ya neutralizado contra inyección de fórmulas,
   * así que se deja que el navegador lo descargue con la cookie de sesión en
   * vez de reconstruir el archivo aquí.
   */
  urlDeExportacion = (idVacante: string) =>
    `${entorno.apiBase}/reportes/vacantes/${idVacante}/exportar`;
}
