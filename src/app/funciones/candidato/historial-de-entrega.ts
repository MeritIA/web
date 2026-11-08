import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ENTREGA } from '../../compartido/dominio';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import type { CambioDeEstado } from '../../nucleo/api/modelos';
import { accion } from '../../nucleo/estado/recurso';
import { ButtonDirective } from 'primeng/button';

/**
 * El camino de una entrega: de `recibida` a `evaluada`, con el momento y el
 * motivo de cada paso. Es lo que hace trazable el estado (HU-15): si algo se
 * atoró o falló, aquí se ve cuándo y por qué.
 */
@Component({
  selector: 'app-historial-de-entrega',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, DatePipe],
  template: `
    <button
      type="button"
      pButton
      [text]="true"
      severity="secondary"
      size="small"
      (click)="alternar()"
    >
      {{ abierto() ? 'Ocultar historial' : 'Ver historial' }}
    </button>
    @if (abierto()) {
      @if (cargar.enviando()) {
        <p class="micro">Cargando…</p>
      } @else if (cargar.error(); as error) {
        <p class="campo__error" role="alert">{{ error }}</p>
      } @else {
        <ol class="camino">
          @for (paso of pasos(); track paso.momento) {
            <li>
              <strong>{{ estados[paso.hacia].texto }}</strong>
              <span class="micro">{{ paso.momento | date: 'd MMM y, HH:mm:ss' }}</span>
              @if (paso.motivo) {
                <span class="micro">· {{ paso.motivo }}</span>
              }
            </li>
          }
        </ol>
      }
    }
  `,
  styles: `
    /* El host vive en una fila flex con wrap: sus hijos participan directo y la lista baja a su propia línea. */
    :host {
      display: contents;
    }
    .camino,
    .micro,
    .campo__error {
      order: 1;
    }
    .camino {
      flex: 1 0 100%;
      min-width: 0;
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding-left: var(--e-4);
      font-size: var(--t-menor);
    }
    .camino li {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--e-2);
      min-width: 0;
      overflow-wrap: anywhere;
    }
  `,
})
export class HistorialDeEntrega {
  readonly idEntrega = input.required<string>();
  readonly #entregas = inject(EntregasServicio);

  protected readonly estados = ENTREGA;
  protected readonly abierto = signal(false);
  protected readonly pasos = signal<CambioDeEstado[]>([]);

  /** Se pide al abrir, no al pintar la lista: la mayoría de las veces nadie lo mira. */
  protected readonly cargar = accion(async () => {
    this.pasos.set((await this.#entregas.obtener(this.idEntrega())).historial ?? []);
  });

  protected readonly alternar = () => {
    this.abierto.update((v) => !v);
    if (this.abierto()) void this.cargar.correr();
  };
}
