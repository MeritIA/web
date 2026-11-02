import { Injectable, signal } from '@angular/core';

export type TonoAviso = 'exito' | 'aviso' | 'error' | 'info';

export interface Aviso {
  id: number;
  tono: TonoAviso;
  texto: string;
}

/**
 * Mensajes efímeros de sistema.
 *
 * Los errores que pertenecen a un formulario se muestran junto al formulario,
 * no aquí: un aviso que desaparece solo no sirve para corregir un campo. Esto
 * es para lo que ocurrió y la persona debe saber aunque ya no esté mirando esa
 * parte de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly #lista = signal<Aviso[]>([]);
  readonly lista = this.#lista.asReadonly();
  #siguienteId = 0;

  exito = (texto: string) => this.#mostrar('exito', texto);
  aviso = (texto: string) => this.#mostrar('aviso', texto);
  error = (texto: string) => this.#mostrar('error', texto);
  info = (texto: string) => this.#mostrar('info', texto);

  cerrar(id: number): void {
    this.#lista.update((avisos) => avisos.filter((a) => a.id !== id));
  }

  #mostrar(tono: TonoAviso, texto: string): void {
    const id = this.#siguienteId++;
    this.#lista.update((avisos) => [...avisos, { id, tono, texto }]);
    // Los errores se quedan más tiempo: hay que poder leerlos y actuar.
    setTimeout(() => this.cerrar(id), tono === 'error' ? 9000 : 5000);
  }
}
