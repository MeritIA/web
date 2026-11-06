import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

/**
 * Orbe fluido decorativo.
 *
 * Buenas prácticas móviles:
 *  - Solo CSS (transform/opacity): sin canvas ni WebGL, barato en el APK.
 *  - Se pausa cuando sale de pantalla (IntersectionObserver) y con la pestaña oculta.
 *  - El seguimiento del puntero solo existe con ratón (`hover: hover`).
 *  - `prefers-reduced-motion`: queda estático.
 *  - Es `aria-hidden`: no aporta información, no estorba a lectores de pantalla.
 */
@Component({
  selector: 'ui-orbe-fluido',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orbe" aria-hidden="true">
      <span class="gota gota--a"></span>
      <span class="gota gota--b"></span>
      <span class="gota gota--c"></span>
    </div>
  `,
  host: { '[style.--orbe-tam]': 'tamano()' },
  styles: `
    :host {
      display: block;
      width: var(--orbe-tam, min(60vw, 360px));
      aspect-ratio: 1;
      pointer-events: none;
      /* Sin contain: paint, que recortaría el halo (box-shadow) y el desplazamiento. */
      padding: 12px;
      box-sizing: content-box;
    }
    .orbe {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      overflow: hidden;
      transform: translate3d(calc(var(--px, 0) * 10px), calc(var(--py, 0) * 10px), 0);
      transition: transform 600ms var(--curva);
      background: radial-gradient(circle at 35% 30%, var(--c-acento-tenue), transparent 70%);
      box-shadow:
        inset 0 0 40px var(--c-acento-tenue),
        0 0 80px -20px var(--c-acento-tenue);
      border: 1px solid var(--c-borde);
    }
    .gota {
      position: absolute;
      width: 70%;
      height: 70%;
      border-radius: 50%;
      filter: blur(28px);
      opacity: 0.75;
      will-change: transform;
      animation: flotar 14s ease-in-out infinite alternate;
      animation-play-state: var(--orbe-estado, running);
    }
    .gota--a {
      top: -10%;
      left: -5%;
      background: var(--c-acento);
    }
    .gota--b {
      right: -15%;
      bottom: -5%;
      background: var(--c-info);
      animation-duration: 18s;
      animation-delay: -6s;
    }
    .gota--c {
      bottom: 10%;
      left: 20%;
      width: 50%;
      height: 50%;
      background: var(--c-aviso);
      opacity: 0.45;
      animation-duration: 22s;
      animation-delay: -11s;
    }
    @keyframes flotar {
      0% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      50% {
        transform: translate3d(22%, 14%, 0) scale(1.15);
      }
      100% {
        transform: translate3d(-14%, 24%, 0) scale(0.9);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .gota {
        animation: none;
      }
    }
  `,
})
export class OrbeFluido {
  /** Cualquier longitud CSS. Por omisión se adapta al ancho del móvil. */
  readonly tamano = input<string>('min(60vw, 360px)');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      const host = this.el;
      let visible = true;
      const actualizar = () =>
        host.style.setProperty('--orbe-estado', visible && !document.hidden ? 'running' : 'paused');

      const observador = new IntersectionObserver(([e]) => {
        visible = !!e?.isIntersecting;
        actualizar();
      });
      observador.observe(host);
      document.addEventListener('visibilitychange', actualizar);

      const conRaton = matchMedia('(hover: hover) and (pointer: fine)').matches;
      const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const alMover = (ev: PointerEvent) => {
        host.style.setProperty('--px', String(ev.clientX / innerWidth - 0.5));
        host.style.setProperty('--py', String(ev.clientY / innerHeight - 0.5));
      };
      if (conRaton && !reducido) addEventListener('pointermove', alMover, { passive: true });

      destruir.onDestroy(() => {
        observador.disconnect();
        document.removeEventListener('visibilitychange', actualizar);
        removeEventListener('pointermove', alMover);
      });
    });
  }
}
