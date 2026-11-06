import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RIESGO } from '../../compartido/dominio';
import { NotaPipe } from '../../compartido/formato';
import { Estado, EstadoRecurso, Nota, Panel } from '../../compartido/ui/basicos';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import type { IdentidadRevelada, PromedioDeCriterio, Riesgo } from '../../nucleo/api/modelos';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import { accion, recursoPor } from '../../nucleo/estado/recurso';
import { Archivos } from '../../nucleo/plataforma/archivos';
import { ButtonDirective } from 'primeng/button';
import { TableModule } from 'primeng/table';

/**
 * Ranking de una vacante (HU-20).
 *
 * Las cifras del resumen son números sueltos y se muestran como tales: un
 * gráfico de cuatro valores sin eje común no añade nada que el número no diga
 * ya. Lo único que sí se dibuja es el promedio por criterio, porque ahí la
 * comparación entre barras es la lectura.
 */
@Component({
  selector: 'app-reporte-vacante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonDirective,
    RouterLink,
    DatePipe,
    NotaPipe,
    Estado,
    EstadoRecurso,
    Nota,
    Panel,
  ],
  template: `
    <nav class="migas">
      <a routerLink="/vacantes">Vacantes</a>
      <a [routerLink]="['/vacantes', id()]">Detalle</a>
      <span>/ Ranking</span>
    </nav>

    <ui-recurso
      [cargando]="reporte.cargando()"
      [error]="reporte.error()"
      [filas]="5"
      (reintentar)="reporte.recargar()"
    />

    @if (reporte.datos(); as r) {
      <header class="cabecera">
        <div class="pila pila--sm">
          <span class="micro">ranking · mejor intento de cada candidato</span>
          <h1>{{ r.vacante.titulo }}</h1>
          <p class="micro">Generado {{ r.generadoEn | date: 'd MMM y, HH:mm' }}</p>
        </div>
        <div class="fila">
          <button
            type="button"
            pButton
            severity="secondary"
            size="small"
            (click)="reporte.recargar()"
          >
            Actualizar
          </button>
          <button
            type="button"
            pButton
            [disabled]="exportar.enviando()"
            (click)="exportar.correr()"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      <!-- ------------------------------------------------- Resumen -->
      <section class="cifras" aria-label="Resumen de la vacante">
        <article class="cifra panel">
          <p class="micro">Candidatos evaluados</p>
          <p class="valor">{{ r.resumen.candidatosEvaluados }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Nota promedio</p>
          <p class="valor">{{ r.resumen.notaPromedio | nota }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Mediana</p>
          <p class="valor">{{ r.resumen.notaMediana | nota }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Mejor nota</p>
          <p class="valor">{{ r.resumen.notaMaxima | nota }}</p>
        </article>
        <article class="cifra panel" [class.alerta]="r.resumen.entregasEnProceso > 0">
          <p class="micro">En evaluación</p>
          <p class="valor">{{ r.resumen.entregasEnProceso }}</p>
        </article>
        <article class="cifra panel" [class.peligro]="r.resumen.entregasConRiesgoAlto > 0">
          <p class="micro">Riesgo alto</p>
          <p class="valor">{{ r.resumen.entregasConRiesgoAlto }}</p>
        </article>
      </section>

      @if (r.resumen.entregasFallidas > 0) {
        <p class="incidencia" role="status">
          {{ r.resumen.entregasFallidas }} entrega(s) con la evaluación fallida. No es un suspenso:
          falló el servicio de calificación. Un administrador puede reintentarlas sin gastar un
          intento del candidato.
        </p>
      }

      <div class="columnas">
        <!-- ------------------------------------------- Por criterio -->
        <ui-panel antetitulo="dónde se gana y se pierde" titulo="Promedio por criterio">
          @if (r.resumen.porCriterio.length === 0) {
            <p class="apagado">Sin datos todavía.</p>
          } @else {
            <ul class="criterios">
              @for (criterio of r.resumen.porCriterio; track criterio.criterio) {
                <li [title]="detalle(criterio)">
                  <div class="fila fila--entre">
                    <span>{{ criterio.criterio }}</span>
                    <span class="dato">
                      {{ criterio.promedioLogrado | nota }}%
                      <span class="micro">peso {{ criterio.peso }}</span>
                    </span>
                  </div>
                  <div
                    class="barra"
                    role="meter"
                    [attr.aria-valuenow]="criterio.promedioLogrado"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-label]="'Promedio logrado en ' + criterio.criterio"
                  >
                    <div class="barra__relleno" [style.width.%]="criterio.promedioLogrado"></div>
                  </div>
                </li>
              }
            </ul>
          }
        </ui-panel>

        <!-- ------------------------------------------------ Ranking -->
        <ui-panel antetitulo="orden de mérito" titulo="Candidatos" plano>
          <ui-recurso
            [vacio]="r.ranking.length === 0"
            tituloVacio="Nadie evaluado todavía"
            textoVacio="El ranking aparece cuando se califica la primera entrega."
          />

          @if (r.ranking.length > 0) {
            <div class="tabla-scroll">
              <p-table
                [value]="r.ranking"
                [scrollable]="true"
                [tableStyle]="{ 'min-width': '40rem' }"
                styleClass="p-datatable-sm"
              >
                <ng-template #caption
                  ><span class="solo-lectores"
                    >Ranking de candidatos por nota del mejor intento</span
                  ></ng-template
                >
                <ng-template #header
                  ><tr>
                    <th scope="col">#</th>
                    <th scope="col">Candidato</th>
                    <th scope="col">Punto fuerte</th>
                    <th scope="col" class="tabla__num">Nota</th>
                    <th scope="col" class="tabla__num">Intentos</th>
                    <th scope="col">Integridad</th>
                    <th scope="col"><span class="solo-lectores">Acciones</span></th>
                  </tr></ng-template
                >
                <ng-template #body let-fila
                  ><tr [class.podio]="fila.posicion <= 3">
                    <td class="posicion">{{ fila.posicion }}</td>
                    <td>
                      @if (reveladas()[fila.idCandidato]; as identidad) {
                        <strong>{{ identidad.nombre }}</strong>
                        <p class="micro">{{ identidad.correo }} · {{ fila.alias }}</p>
                      } @else {
                        <strong>{{ fila.alias }}</strong>
                        <p class="micro">identidad oculta</p>
                      }
                    </td>
                    <td>
                      @if (fila.habilidadDestacada; as h) {
                        <span class="fuerte">{{ h.criterio }}</span>
                        <p class="micro">{{ h.porcentajeLogrado | nota }}% logrado</p>
                      } @else {
                        <span class="micro">—</span>
                      }
                    </td>
                    <td class="tabla__num celda-nota">
                      <ui-nota [valor]="fila.notaFinal" />
                    </td>
                    <td class="tabla__num">{{ fila.intentosEvaluados }}</td>
                    <td><ui-estado [p]="riesgo(fila.riesgoInyeccion)" /></td>
                    <td>
                      <div class="acciones">
                        @if (!reveladas()[fila.idCandidato]) {
                          <button
                            type="button"
                            pButton
                            [text]="true"
                            severity="secondary"
                            size="small"
                            [disabled]="revelar.enviando()"
                            (click)="pedirRevelar(fila.idCandidato, fila.alias)"
                          >
                            Revelar
                          </button>
                        }
                        <a
                          pButton
                          severity="secondary"
                          size="small"
                          [routerLink]="['/vacantes', id(), 'candidatos', fila.idCandidato]"
                          >Detalle</a
                        >
                      </div>
                    </td>
                  </tr></ng-template
                >
              </p-table>
            </div>
          }
        </ui-panel>
      </div>

      <ui-panel antetitulo="auditoría" titulo="Identidades reveladas">
        <p class="apagado nota-ciega">
          El ranking se lee a ciegas para no sesgar la comparación. Revelar un nombre queda
          registrado con quién lo pidió y cuándo.
        </p>
        @if (revelar.error(); as error) {
          <p class="campo__error" role="alert">{{ error }}</p>
        }
        @if ((revelaciones.datos()?.length ?? 0) === 0) {
          <p class="apagado">Nadie ha revelado ninguna identidad en esta vacante.</p>
        } @else {
          <ul class="auditoria">
            @for (r of revelaciones.datos() ?? []; track r.idCandidato + r.reveladaEn) {
              <li>
                <span>{{ r.alias }}</span>
                <span class="micro">{{ r.reveladaEn | date: 'd MMM y, HH:mm' }}</span>
              </li>
            }
          </ul>
        }
      </ui-panel>
    }
  `,
  styles: `
    .fuerte {
      font-size: var(--t-menor);
    }
    .acciones {
      display: grid;
      gap: var(--e-2);
      justify-items: stretch;
      min-width: 92px;
    }
    .nota-ciega {
      margin-bottom: var(--e-3);
    }
    .auditoria {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .auditoria li {
      display: flex;
      justify-content: space-between;
      padding-bottom: var(--e-2);
      border-bottom: 1px solid var(--c-borde);
    }
    .columnas + ui-panel {
      display: block;
      margin-top: var(--e-4);
    }
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
    .cifras {
      display: grid;
      gap: var(--e-3);
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      margin-bottom: var(--e-4);
    }
    .cifra {
      display: grid;
      gap: var(--e-2);
      padding: var(--e-4);
    }
    .valor {
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .cifra.alerta .valor {
      color: var(--c-info);
    }
    .cifra.peligro .valor {
      color: var(--c-peligro);
    }
    .incidencia {
      margin-bottom: var(--e-4);
      padding: var(--e-3) var(--e-4);
      border: 1px solid color-mix(in srgb, var(--c-aviso) 40%, transparent);
      border-radius: var(--r-md);
      background: var(--c-aviso-tenue);
      color: var(--c-aviso);
      font-size: var(--t-menor);
    }
    .columnas {
      display: grid;
      gap: var(--e-4);
      grid-template-columns: minmax(280px, 1fr) minmax(420px, 2fr);
    }
    @media (max-width: 980px) {
      .columnas {
        grid-template-columns: 1fr;
      }
    }
    .criterios {
      display: grid;
      gap: var(--e-4);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .criterios li {
      display: grid;
      gap: var(--e-2);
    }
    .dato {
      font-family: var(--fuente-mono);
      font-variant-numeric: tabular-nums;
    }
    .apagado {
      color: var(--c-texto-tenue);
      font-size: var(--t-menor);
    }
    .posicion {
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
      color: var(--c-texto-tenue);
    }
    .podio .posicion {
      color: var(--c-acento);
    }
    .celda-nota {
      min-width: 120px;
    }
  `,
})
export class ReporteVacante {
  readonly id = input.required<string>();
  readonly #servicio = inject(ReportesServicio);

  readonly #confirmaciones = inject(Confirmaciones);
  readonly #archivos = inject(Archivos);

  protected readonly reporte = recursoPor(this.id, (id) => this.#servicio.deVacante(id));
  protected readonly revelaciones = recursoPor(this.id, (id) => this.#servicio.revelaciones(id));
  /** Identidades abiertas en esta sesión; el backend no vuelve a mandarlas en el ranking. */
  protected readonly reveladas = signal<Record<string, IdentidadRevelada>>({});
  protected readonly riesgo = (valor: Riesgo) => RIESGO[valor];
  protected readonly exportar = accion(async () => {
    const csv = await this.#servicio.csvDeVacante(this.id());
    await this.#archivos.guardar(`vacante-${this.id()}.csv`, csv, 'text/csv');
  });

  protected async pedirRevelar(idCandidato: string, alias: string): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: `¿Revelar la identidad de ${alias}?`,
      texto:
        'Verás su nombre y su correo. Queda registrado quién lo pidió y cuándo, para que la comparación a ciegas siga siendo auditable.',
      accion: 'Revelar',
    });
    if (confirmado) void this.revelar.correr(idCandidato);
  }

  protected readonly revelar = accion(async (idCandidato: string) => {
    const identidad = await this.#servicio.revelar(this.id(), idCandidato);
    this.reveladas.update((actual) => ({ ...actual, [idCandidato]: identidad }));
    await this.revelaciones.recargar();
  });

  protected detalle(criterio: PromedioDeCriterio): string {
    return `${criterio.criterio}: ${criterio.promedioLogrado}% logrado sobre ${criterio.evaluaciones} evaluaciones, peso ${criterio.peso}%`;
  }
}
