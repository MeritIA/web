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
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ButtonDirective } from 'primeng/button';

/** Etiqueta de estado. El color lo decide el dominio, no la pantalla. */
const SEVERIDAD_TAG = {
  neutro: 'secondary',
  exito: 'success',
  aviso: 'warn',
  peligro: 'danger',
  info: 'info',
} as const;

@Component({
  selector: 'ui-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule],
  template: `
    <p-tag [severity]="severidad()" [rounded]="true" [title]="ayuda() ?? ''">
      <span class="chip-contenido">
        @if (vivo()) {
          <span class="punto" aria-hidden="true"></span>
        }
        <ng-content />
      </span>
    </p-tag>
  `,
  styles: `
    .chip-contenido {
      display: inline-flex;
      gap: var(--e-2);
      align-items: center;
    }
    .punto {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentcolor;
      animation: pulso 1.6s ease-in-out infinite;
    }
    @keyframes pulso {
      50% {
        opacity: 0.25;
      }
    }
  `,
})
export class Chip {
  readonly tono = input<Tono>('neutro');
  readonly vivo = input(false, { transform: booleanAttribute });
  readonly ayuda = input<string | undefined>(undefined);

  protected readonly severidad = computed(() => SEVERIDAD_TAG[this.tono()]);
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
  imports: [CardModule],
  template: `
    <p-card [class.panel--plano]="plano()">
      @if (titulo() || antetitulo()) {
        <ng-template #header>
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
        </ng-template>
      }
      <ng-content />
    </p-card>
  `,
  styles: `
    :host {
      display: block;
    }
    :host ::ng-deep .p-card {
      border: 1px solid var(--c-borde);
      transition:
        border-color var(--mov) var(--curva),
        transform var(--mov) var(--curva);
    }
    :host ::ng-deep .p-card-body {
      padding: var(--e-5);
      gap: 0;
    }
    :host ::ng-deep .panel--plano .p-card-body {
      padding: 0;
    }
    :host ::ng-deep .p-card-caption {
      gap: 0;
    }
    .panel__cab {
      margin: 0;
      padding: var(--e-5) var(--e-5) 0;
    }
    .panel__cab--interior {
      margin-bottom: var(--e-4);
    }
    h2 {
      font-size: var(--t-3);
    }
    @media (max-width: 640px) {
      :host ::ng-deep .p-card-body {
        padding: var(--e-4);
      }
      .panel__cab {
        padding: var(--e-4) var(--e-4) 0;
      }
    }
    @media (hover: hover) and (pointer: fine) {
      :host ::ng-deep .p-card:hover {
        border-color: var(--c-borde-fuerte);
      }
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
  imports: [SkeletonModule],
  template: `
    <div class="pila" aria-hidden="true">
      @for (fila of filas(); track $index) {
        <p-skeleton [height]="alto() + 'px'" [width]="fila + '%'" borderRadius="10px" />
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
  imports: [Carga, Vacio, ButtonDirective],
  template: `
    @if (cargando()) {
      <ui-carga [cantidad]="filas()" />
    } @else if (error()) {
      <ui-vacio antetitulo="no se pudo cargar" titulo="Algo se interpuso" [texto]="error()!">
        <button type="button" pButton severity="secondary" (click)="reintentar.emit()">
          Reintentar
        </button>
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
  imports: [NotaPipe, ProgressBarModule],
  template: `
    <div class="nota" [class.nota--grande]="grande()">
      <p class="valor" [style.color]="'var(--c-' + color() + ')'">
        {{ valor() | nota }}<span class="sobre">/100</span>
      </p>
      <p-progressbar
        [value]="valor()"
        [showValue]="false"
        [style]="{ height: '6px', '--p-progressbar-value-background': 'var(--c-' + color() + ')' }"
        [attr.aria-label]="etiqueta()"
      />
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
