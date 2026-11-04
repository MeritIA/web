import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Ejercicio, NuevaVersion, NuevoEjercicio } from './modelos';

@Injectable({ providedIn: 'root' })
export class EjerciciosServicio {
  readonly #api = inject(Api);

  listar = () => this.#api.get<Ejercicio[]>('/ejercicios');
  obtener = (id: string) => this.#api.get<Ejercicio>(`/ejercicios/${id}`);
  crear = (datos: NuevoEjercicio) => this.#api.post<Ejercicio>('/ejercicios', datos);
  /** Versionar, nunca editar: una nota emitida debe seguir siendo auditable. */
  nuevaVersion = (id: string, datos: NuevaVersion) =>
    this.#api.post<Ejercicio>(`/ejercicios/${id}/versiones`, datos);
  /** Cuelga un archivo de la versión vigente. Hasta cinco, 25 MiB cada uno. */
  adjuntar(id: string, archivo: File) {
    const formulario = new FormData();
    formulario.append('archivo', archivo, archivo.name);
    return this.#api.subir<unknown>(`/ejercicios/${id}/adjuntos`, formulario);
  }
  retirar = (id: string) => this.#api.borrar<Ejercicio>(`/ejercicios/${id}`);
}
