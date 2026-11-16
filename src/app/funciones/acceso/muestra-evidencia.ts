import { ChangeDetectionStrategy, Component } from '@angular/core';

interface CriterioMuestra {
  nombre: string;
  puntaje: number;
  maximo: number;
}

/**
 * Muestra estática de una entrega evaluada.
 *
 * La pantalla de acceso pide confianza antes de que exista una cuenta. En vez
 * de un orbe decorativo, enseña lo que la persona va a recibir: una nota que se
 * puede abrir por criterio y una cita que la justifica. Son datos de ejemplo y
 * el pie lo dice, para que nadie los confunda con una captura real.
 */
const CRITERIOS: readonly CriterioMuestra[] = [
  { nombre: 'Modelo de datos', puntaje: 32, maximo: 35 },
  { nombre: 'Manejo de errores', puntaje: 27, maximo: 30 },
  { nombre: 'Pruebas automatizadas', puntaje: 18, maximo: 20 },
  { nombre: 'Claridad del README', puntaje: 11, maximo: 15 },
];

const NOTA = CRITERIOS.reduce((total, criterio) => total + criterio.puntaje, 0);

@Component({
  selector: 'app-muestra-evidencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="muestra" aria-label="Ejemplo de una entrega evaluada">
      <header class="muestra__cab">
        <div class="pila pila--sm">
          <p class="micro micro--acento">ejemplo · reto backend</p>
          <h2>La nota llega con su porqué</h2>
        </div>
        <span class="chip chip--exito">evaluada</span>
      </header>

      <div class="resumen">
        <div
          class="anillo"
          role="meter"
          [attr.aria-valuenow]="nota"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Nota final del ejemplo"
          [style.--porcentaje]="nota + '%'"
        >
          <span>{{ nota }}</span>
          <small>/100</small>
        </div>
        <p class="resumen__texto">
          Cuatro criterios con peso. Cada punto se puede abrir hasta la frase de la entrega que lo
          sustenta.
        </p>
      </div>

      <ul class="criterios" aria-label="Puntaje por criterio">
        @for (criterio of criterios; track criterio.nombre) {
          <li>
            <div class="criterio__cab">
              <span class="criterio__nombre">{{ criterio.nombre }}</span>
              <span class="criterio__cifra">{{ criterio.puntaje }}/{{ criterio.maximo }}</span>
            </div>
            <div
              class="barra"
              role="meter"
              [attr.aria-valuenow]="criterio.puntaje"
              aria-valuemin="0"
              [attr.aria-valuemax]="criterio.maximo"
              [attr.aria-label]="'Puntaje en ' + criterio.nombre"
            >
              <div class="barra__relleno" [style.width.%]="porcentaje(criterio)"></div>
            </div>
          </li>
        }
      </ul>

      <blockquote>
        <p class="micro">cita · manejo de errores</p>
        <p>
          «Captura el fallo de la pasarela y responde 502 con el identificador de la operación; no
          deja la orden a medias.»
        </p>
      </blockquote>

      <p class="nota-pie">Datos de ejemplo. Cada reto tiene su propia rúbrica.</p>
    </article>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .muestra {
      display: grid;
      gap: var(--e-4);
      padding: var(--e-4);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-lg);
      background: color-mix(in srgb, var(--c-superficie) 90%, transparent);
      box-shadow: var(--c-sombra);
      backdrop-filter: blur(12px);
    }
    .muestra__cab {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: start;
      justify-content: space-between;
    }
    h2 {
      font-size: var(--t-4);
    }
    .resumen {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-4);
      align-items: center;
      padding-bottom: var(--e-4);
      border-bottom: 1px solid var(--c-borde);
    }
    .anillo {
      --porcentaje: 0%;
      position: relative;
      display: grid;
      place-content: center;
      flex: none;
      width: 92px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: conic-gradient(var(--c-acento) var(--porcentaje), var(--c-neutro-tenue) 0);
    }
    .anillo::before {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 50%;
      background: var(--c-superficie);
    }
    .anillo span,
    .anillo small {
      position: relative;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .anillo span {
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      line-height: 1;
    }
    .anillo small {
      color: var(--c-texto-tenue);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
    }
    .resumen__texto {
      flex: 1 1 16ch;
      max-width: 32ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .criterios {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .criterios li {
      display: grid;
      gap: var(--e-1);
    }
    .criterio__cab {
      display: flex;
      gap: var(--e-3);
      align-items: baseline;
      justify-content: space-between;
    }
    .criterio__nombre {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    .criterio__cifra {
      color: var(--c-texto-suave);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .barra__relleno {
      animation: crecer var(--mov-lento) var(--curva) both;
      transform-origin: left center;
    }
    @keyframes crecer {
      from {
        transform: scaleX(0);
      }
    }
    blockquote {
      margin: 0;
      padding: var(--e-3);
      border-left: 2px solid var(--c-acento);
      border-radius: 0 var(--r-sm) var(--r-sm) 0;
      background: var(--c-superficie-viva);
    }
    blockquote p:last-child {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .nota-pie {
      color: var(--c-texto-tenue);
      font-size: var(--t-micro);
    }
    @media (prefers-reduced-motion: reduce) {
      .barra__relleno {
        animation: none;
      }
    }
    @media (max-width: 520px) {
      .muestra {
        padding: var(--e-3);
      }
      .anillo {
        width: 80px;
      }
    }
  `,
})
export class MuestraEvidencia {
  protected readonly criterios = CRITERIOS;
  protected readonly nota = NOTA;

  protected porcentaje(criterio: CriterioMuestra): number {
    return (criterio.puntaje / criterio.maximo) * 100;
  }
}
