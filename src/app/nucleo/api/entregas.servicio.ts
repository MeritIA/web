import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import { LIMITES, type EnlaceDeDescarga, type Entrega } from './modelos';

@Injectable({ providedIn: 'root' })
export class EntregasServicio {
  readonly #api = inject(Api);

  mias = (idVacante?: string) => this.#api.get<Entrega[]>('/entregas/mias', { idVacante });
  deVacante = (idVacante: string) => this.#api.get<Entrega[]>(`/entregas/vacante/${idVacante}`);
  obtener = (id: string) => this.#api.get<Entrega>(`/entregas/${id}`);
  enlaceDeDescarga = (id: string) => this.#api.get<EnlaceDeDescarga>(`/entregas/${id}/descarga`);

  entregar(
    idVacante: string,
    idEjercicio: string,
    archivo: File,
    avance: (porcentaje: number) => void,
  ): Promise<Entrega> {
    const formulario = new FormData();
    formulario.append('idVacante', idVacante);
    formulario.append('idEjercicio', idEjercicio);
    formulario.append('archivo', archivo, archivo.name);
    return this.#api.subirConProgreso<Entrega>('/entregas', formulario, avance);
  }

  /**
   * Las mismas reglas que aplica el backend, comprobadas antes de subir.
   *
   * No sustituyen a la validación del servidor: la adelantan, para no gastar
   * un minuto subiendo 25 MiB que van a rebotar.
   */
  revisarArchivo(archivo: File): string | null {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!(LIMITES.extensiones as readonly string[]).includes(extension)) {
      return `Formato no admitido. Se aceptan: ${LIMITES.extensiones.join(', ')}.`;
    }
    if (archivo.size > LIMITES.archivoMaxBytes) {
      return 'El archivo supera los 25 MiB permitidos.';
    }
    if (archivo.size === 0) return 'El archivo está vacío.';
    return null;
  }
}
