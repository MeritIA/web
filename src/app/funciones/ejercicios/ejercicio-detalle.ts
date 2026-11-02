import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chip, EstadoRecurso, Panel } from '../../compartido/ui/basicos';
import { EjerciciosServicio } from '../../nucleo/api/ejercicios.servicio';
import { recursoPor } from '../../nucleo/estado/recurso';

/**
 * Historia completa de un ejercicio.
 *
 * Las versiones se muestran como una línea de tiempo porque eso es lo que
 * son: la v1 sigue existiendo y sigue explicando las notas que se dieron con
 * ella. Ocultarlas convertiría una decisión auditable en un número sin origen.
 */
@Component({
  selector: 'app-ejercicio-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Chip, EstadoRecurso, Panel],
  template: `
    <nav class="migas"><a routerLink="/ejercicios">Ejercicios</a> <span>/ Detalle</span></nav>

    <ui-recurso
      [cargando]="ejercicio.cargando()"
      [error]="ejercicio.error()"
      [filas]="4"
      (reintentar)="ejercicio.recargar()"
    />

    @if (ejercicio.datos(); as e) {
      <header class="cabecera">
        <div class="pila pila--sm">
          <div class="fila">
            <span class="micro">{{ e.tecnologia || 'general' }}</span>
            @if (!e.activo) {
              <ui-chip tono="peligro">Retirado del banco</ui-chip>
            }
          </div>
          <h1>{{ e.titulo }}</h1>
        </div>
        @if (e.activo) {
          <a [routerLink]="['/ejercicios', e.id, 'version']" class="btn btn--primario"
            >Nueva versión</a
          >
        }
      </header>

      @if (e.versiones?.length) {
        <div class="selector-version" role="tablist" aria-label="Versiones del ejercicio">
          @for (version of e.versiones ?? []; track version.id; let primera = $first) {
            <button
              type="button"
              role="tab"
              class="btn btn--sm"
              [class.btn--primario]="indice() === $index"
              [attr.aria-selected]="indice() === $index"
              (click)="indice.set($index)"
            >
              v{{ version.numero }}{{ primera ? ' · vigente' : '' }}
            </button>
          }
        </div>

        @if ((e.versiones ?? [])[indice()]; as version) {
          <div class="columnas">
            <ui-panel antetitulo="enunciado" [titulo]="'Versión ' + version.numero">
              <span acciones class="micro">{{ version.creadaEn | date: 'd MMM y, HH:mm' }}</span>
              @if (version.motivoDelCambio) {
                <p class="motivo">Motivo del cambio: {{ version.motivoDelCambio }}</p>
              }
              <p class="enunciado">{{ version.enunciado }}</p>
            </ui-panel>

            <ui-panel antetitulo="rúbrica" titulo="Criterios y pesos" plano>
              <div class="tabla-scroll">
                <table class="tabla">
                  <caption class="solo-lectores">
                    Criterios de la versión
                    {{
                      version.numero
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Criterio</th>
                      <th scope="col" class="tabla__num">Peso</th>
                      <th scope="col" class="tabla__num">Escala</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (criterio of version.criterios; track criterio.id) {
                      <tr>
                        <td>
                          <strong>{{ criterio.nombre }}</strong>
                          <p class="descripcion">{{ criterio.descripcion }}</p>
                        </td>
                        <td class="tabla__num">{{ criterio.peso }}%</td>
                        <td class="tabla__num">{{ criterio.escalaMaxima }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </ui-panel>
          </div>
        }
      }
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-4);
      align-items: end;
      justify-content: space-between;
      margin-bottom: var(--e-5);
    }
    h1 {
      font-size: var(--t-1);
    }
    .selector-version {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-2);
      margin-bottom: var(--e-4);
    }
    .columnas {
      display: grid;
      gap: var(--e-4);
      grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
    }
    .motivo {
      margin-bottom: var(--e-3);
      color: var(--c-aviso);
      font-size: var(--t-menor);
    }
    .enunciado {
      white-space: pre-wrap;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .descripcion {
      margin-top: var(--e-1);
      color: var(--c-texto-tenue);
      font-size: var(--t-micro);
      max-width: 42ch;
    }
  `,
})
export class EjercicioDetalle {
  readonly id = input.required<string>();
  readonly #servicio = inject(EjerciciosServicio);

  protected readonly ejercicio = recursoPor(this.id, (id) => this.#servicio.obtener(id));
  /** 0 es la versión más reciente: el backend las entrega de nueva a vieja. */
  protected readonly indice = signal(0);
}
