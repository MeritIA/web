import { Injectable, signal } from '@angular/core';

export type Tema = 'oscuro' | 'claro';
const CLAVE = 'meritia.tema';

/**
 * Cambia el tema poniendo un atributo en `<html>`: los tokens de color hacen
 * el resto. No hay una sola regla de CSS que sepa qué tema está activo.
 */
@Injectable({ providedIn: 'root' })
export class TemaServicio {
  readonly #actual = signal<Tema>(this.#inicial());
  readonly actual = this.#actual.asReadonly();

  constructor() {
    this.#aplicar(this.#actual());
  }

  alternar(): void {
    const siguiente: Tema = this.#actual() === 'oscuro' ? 'claro' : 'oscuro';
    this.#actual.set(siguiente);
    this.#aplicar(siguiente);
    try {
      localStorage.setItem(CLAVE, siguiente);
    } catch {
      /* modo privado: la preferencia solo dura esta sesión */
    }
  }

  #aplicar(tema: Tema): void {
    document.documentElement.dataset['tema'] = tema;
  }

  #inicial(): Tema {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    } catch {
      /* modo privado: se usa el tema por omisión */
    }
    // Oscuro por decisión de marca; quien prefiera claro lo cambia y se recuerda.
    return 'oscuro';
  }
}
