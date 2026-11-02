import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import type { Presentacion, Tono } from '../dominio';
import { tonoDeNota } from '../dominio';
import { NotaPipe } from '../formato';

/** Etiqueta de estado. El color lo decide el dominio, no la pantalla. */
@Component({
  selector: 'ui-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip {{ clases() }}" [title]="ayuda() ?? ''"><ng-content /></span>`,
})
export class Chip {
  readonly tono = input<Tono>('neutro');
  readonly vivo = input(false, { transform: booleanAttribute });
  readonly ayuda = input<string | undefined>(undefined);

  protected readonly clases = computed(() =>
    [this.tono() === 'neutro' ? '' : `chip--${this.tono()}`, this.vivo() ? 'chip--vivo' : '']
      .filter(Boolean)
      .join(' '),
  );
}

/** El mismo chip, alimentado por una entrada del catálogo de `dominio.ts`. */
@Component({
  selector: 'ui-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Chip],
  template: `
    <ui-chip [tono]="p().tono" [vivo]="p().vivo ?? false" [ayuda]="p().ayuda">{{
      p().texto
    }}</ui-chip>
  `,
})
export class Estado {
  readonly p = input.required<Presentacion>();
}

/** Contenedor con cabecera, antetítulo mono y zona de acciones. */
@Component({
  selector: 'ui-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [class.panel--plano]="plano()">
      @if (titulo() || antetitulo()) {
        <header class="panel__cab" [class.panel__cab--interior]="plano()">
          <div class="pila pila--sm">
            @if (antetitulo()) {
              <span class="micro">{{ antetitulo() }}</span>
            }
            @if (titulo()) {
              <h2>{{ titulo() }}</h2>
            }
          </div>
          <div class="fila"><ng-content select="[acciones]" /></div>
        </header>
      }
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .panel__cab--interior {
      padding: var(--e-5) var(--e-5) 0;
      margin-bottom: var(--e-4);
    }
    h2 {
      font-size: var(--t-3);
    }
  `,
})
export class Panel {
  readonly titulo = input<string>('');
  readonly antetitulo = input<string>('');
  /** Sin relleno: para paneles que contienen una tabla a sangre. */
  readonly plano = input(false, { transform: booleanAttribute });
}

/** Esqueleto de carga: ocupa el sitio del contenido para que nada salte. */
@Component({
  selector: 'ui-carga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pila" aria-hidden="true">
      @for (fila of filas(); track $index) {
        <div class="esqueleto" [style.height.px]="alto()" [style.width.%]="fila"></div>
      }
    </div>
  `,
})
export class Carga {
  readonly cantidad = input(3);
  readonly alto = input(44);
  protected readonly filas = computed(() =>
    Array.from({ length: this.cantidad() }, (_, i) => 100 - (i % 3) * 7),
  );
}

/**
 * Qué se ve cuando no hay nada que ver.
 *
 * Un vacío sin salida es un callejón: por eso siempre admite una acción.
 */
@Component({
  selector: 'ui-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vacio pila">
      <span class="micro">{{ antetitulo() }}</span>
      <p class="titulo">{{ titulo() }}</p>
      @if (texto()) {
        <p class="detalle lectura">{{ texto() }}</p>
      }
      <div class="fila"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .vacio {
      justify-items: center;
      padding: var(--e-7) var(--e-4);
      text-align: center;
      border: 1px dashed var(--c-borde);
      border-radius: var(--r-lg);
    }
    .titulo {
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
    }
    .detalle {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
  `,
})
export class Vacio {
  readonly antetitulo = input('nada por aquí');
  readonly titulo = input.required<string>();
  readonly texto = input('');
}

/**
 * Carga, error o vacío de un `Recurso`, resuelto una vez para todo el producto.
 *
 * Las pantallas solo describen el caso feliz; este componente se encarga de
 * los otros tres y de ofrecer siempre una forma de reintentar.
 */
@Component({
  selector: 'ui-recurso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Carga, Vacio],
  template: `
    @if (cargando()) {
      <ui-carga [cantidad]="filas()" />
    } @else if (error()) {
      <ui-vacio antetitulo="no se pudo cargar" titulo="Algo se interpuso" [texto]="error()!">
        <button type="button" class="btn" (click)="reintentar.emit()">Reintentar</button>
      </ui-vacio>
    } @else if (vacio()) {
      <ui-vacio [titulo]="tituloVacio()" [texto]="textoVacio()">
        <ng-content select="[accion-vacio]" />
      </ui-vacio>
    }
  `,
})
export class EstadoRecurso {
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly vacio = input(false);
  readonly tituloVacio = input('Todavía no hay nada aquí');
  readonly textoVacio = input('');
  readonly filas = input(3);
  readonly reintentar = output<void>();
}

/** Nota sobre 100 con su barra. La misma lectura en tarjetas, tablas y detalle. */
@Component({
  selector: 'ui-nota',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotaPipe],
  template: `
    <div class="nota" [class.nota--grande]="grande()">
      <p class="valor" [style.color]="'var(--c-' + color() + ')'">
        {{ valor() | nota }}<span class="sobre">/100</span>
      </p>
      <div
        class="barra"
        role="meter"
        [attr.aria-valuenow]="valor()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="etiqueta()"
      >
        <div
          class="barra__relleno"
          [style.width.%]="valor()"
          [style.background]="'var(--c-' + color() + ')'"
        ></div>
      </div>
    </div>
  `,
  styles: `
    .nota {
      display: grid;
      gap: var(--e-2);
      min-width: 96px;
    }
    .valor {
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .nota--grande .valor {
      font-size: var(--t-1);
    }
    .sobre {
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      color: var(--c-texto-tenue);
      margin-left: 2px;
    }
  `,
})
export class Nota {
  readonly valor = input.required<number>();
  readonly grande = input(false, { transform: booleanAttribute });
  readonly etiqueta = input('Nota final sobre 100');

  protected readonly color = computed(() => {
    const tono = tonoDeNota(this.valor());
    return tono === 'exito' ? 'acento' : tono === 'peligro' ? 'peligro' : tono;
  });
}
