import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Calificacion } from '../../nucleo/api/modelos';
import { NotaPipe } from '../formato';

/**
 * El desglose de una calificación, criterio a criterio y con su evidencia.
 *
 * Es el corazón del producto: la nota sin la cita que la sostiene sería
 * exactamente lo que MeritIA existe para evitar. Por eso la evidencia no se
 * esconde tras un desplegable ni se recorta: se lee entera.
 */
@Component({
  selector: 'ui-desglose',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotaPipe],
  template: `
    <ol class="lista">
      @for (criterio of criterios(); track criterio.criterio) {
        <li class="criterio">
          <div class="cabeza">
            <h4>{{ criterio.criterio }}</h4>
            <span class="micro">peso {{ criterio.peso }}%</span>
            <span class="puntaje">
              {{ criterio.puntaje | nota }}<span class="escala">/{{ criterio.escalaMaxima }}</span>
            </span>
          </div>

          <div
            class="barra"
            role="meter"
            [attr.aria-valuenow]="criterio.puntaje"
            aria-valuemin="0"
            [attr.aria-valuemax]="criterio.escalaMaxima"
            [attr.aria-label]="'Puntaje en ' + criterio.criterio"
          >
            <div class="barra__relleno" [style.width.%]="porcentaje(criterio)"></div>
          </div>

          <blockquote class="evidencia">{{ criterio.evidencia }}</blockquote>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
    }
    .lista {
      display: grid;
      gap: var(--e-5);
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: criterio;
    }
    .criterio {
      display: grid;
      gap: var(--e-3);
    }
    .cabeza {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: baseline;
    }
    h4 {
      flex: 1;
      min-width: 12ch;
    }
    .puntaje {
      font-family: var(--fuente-mono);
      font-variant-numeric: tabular-nums;
    }
    .escala {
      color: var(--c-texto-tenue);
      font-size: var(--t-micro);
    }
    .evidencia {
      margin: 0;
      padding: var(--e-3) var(--e-4);
      border-left: 2px solid var(--c-borde-fuerte);
      background: var(--c-superficie-viva);
      border-radius: 0 var(--r-md) var(--r-md) 0;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
      white-space: pre-wrap;
    }
  `,
})
export class Desglose {
  readonly criterios = input.required<readonly Calificacion[]>();

  protected porcentaje(criterio: Calificacion): number {
    return criterio.escalaMaxima > 0 ? (criterio.puntaje / criterio.escalaMaxima) * 100 : 0;
  }
}
