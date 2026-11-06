import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type TonoAviso = 'exito' | 'aviso' | 'error' | 'info';

const SEVERIDAD = { exito: 'success', aviso: 'warn', error: 'error', info: 'info' } as const;

/**
 * Mensajes efímeros de sistema (se pintan con el `p-toast` de PrimeNG).
 *
 * Los errores que pertenecen a un formulario se muestran junto al formulario,
 * no aquí: un aviso que desaparece solo no sirve para corregir un campo. Esto
 * es para lo que ocurrió y la persona debe saber aunque ya no esté mirando esa
 * parte de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly #mensajes = inject(MessageService);

  exito = (texto: string) => this.#mostrar('exito', texto);
  aviso = (texto: string) => this.#mostrar('aviso', texto);
  error = (texto: string) => this.#mostrar('error', texto);
  info = (texto: string) => this.#mostrar('info', texto);

  #mostrar(tono: TonoAviso, texto: string): void {
    this.#mensajes.add({
      severity: SEVERIDAD[tono],
      detail: texto,
      // Los errores se quedan más tiempo: hay que poder leerlos y actuar.
      life: tono === 'error' ? 9000 : 5000,
    });
  }
}
