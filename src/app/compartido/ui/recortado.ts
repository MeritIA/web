import { DestroyRef, Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * Dice si el texto de un elemento está recortado DE VERDAD.
 *
 * POR QUE EXISTE
 *
 * Un `-webkit-line-clamp` recorta solo cuando el texto se pasa de las líneas
 * permitidas. Un botón «Ver más» puesto al lado sin preguntar nada promete
 * algo que casi siempre no existe: con una descripción de una línea, pulsarlo
 * no cambia nada en la pantalla y parece que la aplicación está rota. Es lo que
 * pasaba en Explorar.
 *
 * No se puede resolver con CSS ni contando caracteres: el recorte depende del
 * ancho del contenedor, del tamaño de la letra y del idioma. La única respuesta
 * fiable es medir el elemento ya pintado.
 *
 * COMO SE USA
 *
 * ```html
 * <p class="descripcion" appRecortado #d="recortado">{{ texto }}</p>
 * @if (d.recortado()) {
 *   <button (click)="…">Ver más</button>
 * }
 * ```
 *
 * OJO AL EXPANDIR
 *
 * Mientras el texto está expandido ya no sobra nada, así que `recortado()`
 * pasa a `false`. Quien lo use tiene que mantener el botón visible con su
 * propio estado de «abierto», o «Ver menos» desaparecería justo cuando hace
 * falta.
 */
@Directive({
  selector: '[appRecortado]',
  exportAs: 'recortado',
})
export class Recortado {
  readonly #el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #recortado = signal(false);

  /** Verdadero si hay texto escondido por el recorte. */
  readonly recortado = this.#recortado.asReadonly();

  constructor() {
    const destruccion = inject(DestroyRef);

    afterNextRender(() => {
      this.#medir();

      // Se vuelve a medir al cambiar el tamaño: una descripción que cabe en
      // tres líneas en un monitor se pasa a cinco en un teléfono, y entonces
      // el botón SÍ tiene que aparecer. Sin esto, el acierto dependería del
      // ancho que hubiera en el primer pintado.
      const observador = new ResizeObserver(() => this.#medir());
      observador.observe(this.#el.nativeElement);
      destruccion.onDestroy(() => observador.disconnect());
    });
  }

  #medir(): void {
    const elemento = this.#el.nativeElement;
    // El +1 no es superstición: con zoom o tipografías fraccionarias,
    // `scrollHeight` sale un píxel por encima de `clientHeight` en textos que
    // caben justo, y sin el margen el botón aparecería sin nada que mostrar.
    this.#recortado.set(elemento.scrollHeight > elemento.clientHeight + 1);
  }
}
