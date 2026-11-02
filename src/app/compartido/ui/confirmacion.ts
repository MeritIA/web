import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injectable,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

export interface Peticion {
  titulo: string;
  texto: string;
  /** Texto del botón que confirma. Describe la acción, nunca «Aceptar». */
  accion: string;
  peligrosa?: boolean;
}

/**
 * Confirmación para lo que no se puede deshacer.
 *
 * Publicar una vacante, cerrarla o retirar un ejercicio son decisiones sin
 * marcha atrás en el backend; pedir confirmación es la única prevención de
 * error posible. Lo reversible NO pasa por aquí: preguntar por todo enseña a
 * confirmar sin leer.
 */
@Injectable({ providedIn: 'root' })
export class Confirmaciones {
  readonly pendiente = signal<Peticion | null>(null);
  #resolver: ((respuesta: boolean) => void) | null = null;

  pedir(peticion: Peticion): Promise<boolean> {
    this.pendiente.set(peticion);
    return new Promise((resolver) => (this.#resolver = resolver));
  }

  responder(respuesta: boolean): void {
    this.pendiente.set(null);
    this.#resolver?.(respuesta);
    this.#resolver = null;
  }
}

@Component({
  selector: 'ui-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirmaciones.responder(false)' },
  template: `
    @if (confirmaciones.pendiente(); as p) {
      <div class="fondo" (click)="confirmaciones.responder(false)"></div>
      <div
        class="caja panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
      >
        <h2 id="confirmacion-titulo">{{ p.titulo }}</h2>
        <p class="texto">{{ p.texto }}</p>
        <div class="fila fila--entre">
          <button type="button" class="btn btn--fantasma" (click)="confirmaciones.responder(false)">
            Cancelar
          </button>
          <button
            #confirmar
            type="button"
            class="btn"
            [class.btn--peligro]="p.peligrosa"
            [class.btn--primario]="!p.peligrosa"
            (click)="confirmaciones.responder(true)"
          >
            {{ p.accion }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .fondo {
      position: fixed;
      inset: 0;
      z-index: var(--z-capa);
      background: rgb(0 0 0 / 60%);
      backdrop-filter: blur(2px);
    }
    .caja {
      position: fixed;
      z-index: calc(var(--z-capa) + 1);
      top: 50%;
      left: 50%;
      translate: -50% -50%;
      display: grid;
      gap: var(--e-4);
      width: min(440px, calc(100vw - var(--e-6)));
      background: var(--c-superficie-alta);
      box-shadow: var(--c-sombra);
    }
    h2 {
      font-size: var(--t-3);
    }
    .texto {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
  `,
})
export class Confirmacion {
  protected readonly confirmaciones = inject(Confirmaciones);
  private readonly boton = viewChild<ElementRef<HTMLButtonElement>>('confirmar');

  constructor() {
    // El foco entra en el diálogo al abrirlo: sin esto, quien navega con
    // teclado seguiría en la página de detrás sin saber que hay una pregunta.
    effect(() => this.boton()?.nativeElement.focus());
  }
}
