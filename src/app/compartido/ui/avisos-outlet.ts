import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Pila de avisos. Es una región `polite`: un lector de pantalla la anuncia al
 * terminar lo que esté diciendo, en vez de interrumpir a la persona.
 */
@Component({
  selector: 'ui-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pila-avisos" role="status" aria-live="polite">
      @for (aviso of avisos.lista(); track aviso.id) {
        <div class="aviso aviso--{{ aviso.tono }}">
          <p>{{ aviso.texto }}</p>
          <button
            type="button"
            class="cerrar"
            (click)="avisos.cerrar(aviso.id)"
            aria-label="Descartar aviso"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .pila-avisos {
      position: fixed;
      right: var(--e-4);
      bottom: var(--e-4);
      z-index: var(--z-aviso);
      display: grid;
      gap: var(--e-2);
      width: min(380px, calc(100vw - var(--e-6)));
    }
    .aviso {
      display: flex;
      gap: var(--e-3);
      align-items: start;
      padding: var(--e-3) var(--e-4);
      border: 1px solid var(--c-borde-fuerte);
      border-radius: var(--r-md);
      background: var(--c-superficie-alta);
      box-shadow: var(--c-sombra);
      font-size: var(--t-menor);
      animation: entra var(--mov) var(--curva);
    }
    .aviso--exito {
      border-color: color-mix(in srgb, var(--c-acento) 45%, transparent);
    }
    .aviso--aviso {
      border-color: color-mix(in srgb, var(--c-aviso) 45%, transparent);
    }
    .aviso--error {
      border-color: color-mix(in srgb, var(--c-peligro) 45%, transparent);
    }
    p {
      flex: 1;
    }
    .cerrar {
      border: 0;
      background: none;
      color: var(--c-texto-tenue);
      line-height: 1;
    }
    @keyframes entra {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class AvisosOutlet {
  protected readonly avisos = inject(Avisos);
}
