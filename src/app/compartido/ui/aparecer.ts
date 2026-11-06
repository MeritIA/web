import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Revela el elemento con un fundido + desplazamiento al entrar en pantalla.
 * Efecto de escalonado vía `[appAparecer]="índice"`.
 *
 * Mejora progresiva: sin JS o con `prefers-reduced-motion` el contenido ya es
 * visible; la clase de ocultación solo se añade cuando la animación va a ocurrir.
 */
@Directive({ selector: '[appAparecer]' })
export class Aparecer {
  readonly indice = input(0, { alias: 'appAparecer', transform: numberAttribute });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.style.setProperty('--aparecer-retraso', `${Math.min(this.indice(), 8) * 70}ms`);
      el.classList.add('aparecer');
      const obs = new IntersectionObserver(
        ([e]) => {
          if (!e?.isIntersecting) return;
          el.classList.add('aparecer--visto');
          obs.disconnect();
        },
        { threshold: 0.15 },
      );
      obs.observe(el);
    });
  }
}
