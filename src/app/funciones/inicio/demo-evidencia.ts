import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

type Vista = 'nota' | 'criterios' | 'citas';

interface CriterioDemo {
  nombre: string;
  peso: number;
  puntaje: number;
  maximo: number;
  cita: string;
}

/**
 * Ejemplo jugable del corazón del producto.
 *
 * Una landing que solo promete «evidencia» obliga a creer; esta deja ver la
 * nota, el desglose y la cita sin pedir una cuenta. Son datos de ejemplo y se
 * dice: un mockup que se confunde con una captura real es peor que no tenerlo.
 */
const CRITERIOS: readonly CriterioDemo[] = [
  {
    nombre: 'Modelo de datos',
    peso: 35,
    puntaje: 32,
    maximo: 35,
    cita: 'El esquema separa pedido de línea de pedido y calcula el total dentro de la misma transacción, sin duplicar el importe.',
  },
  {
    nombre: 'Manejo de errores',
    peso: 30,
    puntaje: 27,
    maximo: 30,
    cita: 'Captura el fallo de la pasarela y responde 502 con el identificador de la operación; no deja la orden a medias.',
  },
  {
    nombre: 'Pruebas automatizadas',
    peso: 20,
    puntaje: 17,
    maximo: 20,
    cita: 'Cubre el camino feliz y el caso de stock insuficiente con dos pruebas de integración que levantan la base real.',
  },
  {
    nombre: 'Claridad del README',
    peso: 15,
    puntaje: 11.5,
    maximo: 15,
    cita: 'Explica cómo levantar el proyecto y qué decisiones se tomaron, en menos de una página.',
  },
];

const NOTA_FINAL = CRITERIOS.reduce((total, criterio) => total + criterio.puntaje, 0);

@Component({
  selector: 'app-demo-evidencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="demo panel" aria-label="Ejemplo de una entrega evaluada">
      <header class="demo__cab">
        <div class="pila pila--sm">
          <p class="micro">ejemplo · reto backend</p>
          <h3>Entrega evaluada</h3>
        </div>
        <span class="chip chip--exito">evaluada</span>
      </header>

      <div class="pestanas" role="tablist" aria-label="Vista del ejemplo">
        @for (v of vistas; track v.id) {
          <button
            type="button"
            role="tab"
            [id]="'demo-tab-' + v.id"
            [attr.aria-selected]="vista() === v.id"
            [attr.tabindex]="vista() === v.id ? 0 : -1"
            aria-controls="demo-panel"
            (click)="vista.set(v.id)"
            (keydown)="mover($event, v.id)"
          >
            {{ v.texto }}
          </button>
        }
      </div>

      <div
        id="demo-panel"
        class="vista"
        role="tabpanel"
        [attr.aria-labelledby]="'demo-tab-' + vista()"
      >
        @switch (vista()) {
          @case ('nota') {
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
              <div class="pila pila--sm">
                <p class="micro micro--acento">listo para entrevista</p>
                <p class="explicacion">
                  La nota sale de sumar los criterios con su peso. No hay una impresión general: hay
                  cuatro razones que se pueden leer.
                </p>
              </div>
            </div>

            <ul class="miniaturas" aria-label="Puntaje por criterio">
              @for (criterio of criterios; track criterio.nombre) {
                <li>
                  <span class="nombre">{{ criterio.nombre }}</span>
                  <span class="cifra">{{ criterio.puntaje }}/{{ criterio.maximo }}</span>
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
          }

          @case ('criterios') {
            <ul class="criterios">
              @for (criterio of criterios; track criterio.nombre) {
                <li>
                  <div class="criterio__cab">
                    <span class="nombre">{{ criterio.nombre }}</span>
                    <span class="micro">peso {{ criterio.peso }}%</span>
                    <span class="cifra">{{ criterio.puntaje }}/{{ criterio.maximo }}</span>
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
          }

          @case ('citas') {
            <ul class="citas">
              @for (criterio of criterios; track criterio.nombre) {
                <li>
                  <p class="micro">
                    {{ criterio.nombre }} · {{ criterio.puntaje }}/{{ criterio.maximo }}
                  </p>
                  <blockquote>{{ criterio.cita }}</blockquote>
                </li>
              }
            </ul>
          }
        }
      </div>

      <p class="demo__pie micro">
        Datos de ejemplo. Cada reto tiene su propia rúbrica y cada cita sale de la entrega real.
      </p>
    </article>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .demo {
      display: grid;
      gap: var(--e-4);
      padding: var(--e-4);
      background: color-mix(in srgb, var(--c-superficie) 94%, transparent);
      box-shadow: var(--c-sombra);
    }
    .demo__cab {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-3);
      align-items: start;
      justify-content: space-between;
    }
    h3 {
      font-size: var(--t-3);
    }
    .pestanas {
      display: flex;
      gap: var(--e-1);
      padding: var(--e-1);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-pill);
      background: var(--c-superficie-alta);
    }
    .pestanas button {
      flex: 1 1 0;
      min-height: 34px;
      padding: 0 var(--e-3);
      border: 0;
      border-radius: var(--r-pill);
      background: transparent;
      color: var(--c-texto-suave);
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      letter-spacing: var(--tracking-micro);
      text-transform: uppercase;
      transition:
        background var(--mov) var(--curva),
        color var(--mov) var(--curva);
    }
    .pestanas button:hover {
      color: var(--c-texto);
      background: var(--c-neutro-tenue);
    }
    .pestanas button[aria-selected='true'] {
      background: var(--c-superficie-viva);
      color: var(--c-texto);
      box-shadow: inset 0 0 0 1px var(--c-borde);
    }
    .vista {
      min-height: 232px;
      padding: var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie-alta);
    }
    .resumen {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-4);
      align-items: center;
      margin-bottom: var(--e-4);
    }
    .anillo {
      --porcentaje: 0%;
      position: relative;
      display: grid;
      place-content: center;
      width: 108px;
      aspect-ratio: 1;
      flex: none;
      border-radius: 50%;
      background: conic-gradient(var(--c-acento) var(--porcentaje), var(--c-neutro-tenue) 0);
    }
    .anillo::before {
      content: '';
      position: absolute;
      inset: 9px;
      border-radius: 50%;
      background: var(--c-superficie-alta);
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
    .explicacion {
      max-width: 34ch;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .miniaturas,
    .criterios,
    .citas {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .miniaturas li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--e-1) var(--e-3);
      align-items: baseline;
    }
    .miniaturas .barra {
      grid-column: 1 / -1;
    }
    .nombre {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    .cifra {
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      font-variant-numeric: tabular-nums;
      color: var(--c-texto-suave);
      white-space: nowrap;
    }
    .criterio__cab {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-2) var(--e-3);
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: var(--e-2);
    }
    .criterio__cab .nombre {
      flex: 1;
      color: var(--c-texto);
    }
    .citas li {
      display: grid;
      gap: var(--e-1);
    }
    blockquote {
      margin: 0;
      padding: var(--e-2) var(--e-3);
      border-left: 2px solid var(--c-acento);
      background: var(--c-superficie-viva);
      border-radius: 0 var(--r-sm) var(--r-sm) 0;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .demo__pie {
      color: var(--c-texto-tenue);
      font-family: var(--fuente-texto);
      font-size: 0.7rem;
      letter-spacing: 0;
      line-height: 1.45;
      text-transform: none;
    }
    @media (max-width: 520px) {
      .demo {
        padding: var(--e-3);
      }
      .pestanas button {
        padding: 0 var(--e-2);
      }
      .vista {
        min-height: 0;
        padding: var(--e-2);
      }
      .anillo {
        width: 92px;
      }
    }
  `,
})
export class DemoEvidencia {
  protected readonly vistas: readonly { id: Vista; texto: string }[] = [
    { id: 'nota', texto: 'Nota' },
    { id: 'criterios', texto: 'Criterios' },
    { id: 'citas', texto: 'Citas' },
  ];
  protected readonly criterios = CRITERIOS;
  protected readonly nota = NOTA_FINAL;
  protected readonly vista = signal<Vista>('nota');

  protected porcentaje(criterio: CriterioDemo): number {
    return (criterio.puntaje / criterio.maximo) * 100;
  }

  /** Flechas, Inicio y Fin: el patrón de teclado que espera un tablist. */
  protected mover(evento: KeyboardEvent, actual: Vista): void {
    const ids = this.vistas.map((v) => v.id);
    const indice = ids.indexOf(actual);
    let siguiente: Vista | undefined;
    if (evento.key === 'ArrowRight') siguiente = ids[(indice + 1) % ids.length];
    if (evento.key === 'ArrowLeft') siguiente = ids[(indice - 1 + ids.length) % ids.length];
    if (evento.key === 'Home') siguiente = ids[0];
    if (evento.key === 'End') siguiente = ids[ids.length - 1];
    if (!siguiente) return;

    evento.preventDefault();
    this.vista.set(siguiente);
    document.getElementById(`demo-tab-${siguiente}`)?.focus();
  }
}
