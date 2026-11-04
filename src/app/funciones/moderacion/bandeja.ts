import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import type { EstadoDeCaso, OrigenDeCaso } from '../../nucleo/api/modelos';
import { ModeracionServicio } from '../../nucleo/api/moderacion.servicio';
import { recursoPor } from '../../nucleo/estado/recurso';

export const ORIGEN: Record<OrigenDeCaso, string> = {
  antifraude: 'Marca antifraude',
  muestreo: 'Muestreo de calidad',
  disputa: 'Disputa del candidato',
};

/**
 * Bandeja de casos (C25): lo que vence antes, primero. Cada fila lleva el alias
 * del candidato, nunca su nombre ni su correo.
 */
@Component({
  selector: 'app-bandeja-de-casos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">revisión humana</span>
      <h1>Casos de moderación</h1>
      <p class="lectura ayuda">
        Evaluaciones marcadas por el sistema, muestreadas al azar o disputadas por su candidato.
        Cada caso vence a las 24 horas.
      </p>
    </header>

    <div class="fila filtros" role="group" aria-label="Estado de los casos">
      @for (e of estados; track e.valor) {
        <button
          type="button"
          class="btn btn--sm"
          [class.btn--primario]="estado() === e.valor"
          [attr.aria-pressed]="estado() === e.valor"
          (click)="estado.set(e.valor)"
        >
          {{ e.texto }}
        </button>
      }
    </div>

    <ui-recurso
      [cargando]="casos.cargando()"
      [error]="casos.error()"
      [vacio]="(casos.datos()?.length ?? 0) === 0 && !casos.cargando()"
      tituloVacio="No hay casos aquí"
      textoVacio="Cuando una evaluación quede marcada o salga en el muestreo, aparecerá en esta bandeja."
      (reintentar)="casos.recargar()"
    />

    @if ((casos.datos()?.length ?? 0) > 0) {
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Candidato</th>
              <th scope="col">Origen</th>
              <th scope="col">Vence</th>
              <th scope="col"><span>Acción</span></th>
            </tr>
          </thead>
          <tbody>
            @for (c of casos.datos() ?? []; track c.id) {
              <tr>
                <td>{{ c.alias }}</td>
                <td>{{ origenes[c.origen] }}</td>
                <td [class.vencido]="c.vencido">
                  {{ c.venceEn | date: 'd MMM, HH:mm' }}{{ c.vencido ? ' · vencido' : '' }}
                </td>
                <td>
                  <a [routerLink]="['/moderacion', c.id]" class="btn btn--sm">
                    {{ estado() === 'abierto' ? 'Revisar' : 'Ver' }}
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-5);
    }
    h1 {
      font-size: var(--t-1);
    }
    .ayuda {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .filtros {
      gap: var(--e-2);
      margin-bottom: var(--e-4);
    }
    .vencido {
      color: var(--c-peligro, inherit);
    }
  `,
})
export class BandejaDeCasos {
  readonly #servicio = inject(ModeracionServicio);

  protected readonly origenes = ORIGEN;
  protected readonly estados: { valor: EstadoDeCaso; texto: string }[] = [
    { valor: 'abierto', texto: 'Abiertos' },
    { valor: 'confirmado', texto: 'Confirmados' },
    { valor: 'restaurado', texto: 'Restaurados' },
  ];
  protected readonly estado = signal<EstadoDeCaso>('abierto');
  protected readonly casos = recursoPor(this.estado, (e) => this.#servicio.bandeja(e));
}
