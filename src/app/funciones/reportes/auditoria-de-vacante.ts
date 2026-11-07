import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import { recursoPor } from '../../nucleo/estado/recurso';
import { Archivos } from '../../nucleo/plataforma/archivos';
import { Plataforma } from '../../nucleo/plataforma/plataforma';
import { ButtonDirective } from 'primeng/button';

/**
 * Informe de auditoría de una vacante (A09).
 *
 * Dice lo que se puede afirmar con los datos que hay, y dice con todas sus
 * letras lo que no: la auditoría de sesgo por grupo no se calcula porque la
 * plataforma no recoge datos demográficos. Se baja como JSON o se imprime a PDF.
 */
@Component({
  selector: 'app-auditoria-de-vacante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, DatePipe, RouterLink, EstadoRecurso],
  template: `
    <nav class="migas no-imprimir">
      <a routerLink="/vacantes">Vacantes</a> <a [routerLink]="['/vacantes', id()]">Vacante</a>
      <span>Auditoría</span>
    </nav>

    <ui-recurso
      [cargando]="informe.cargando()"
      [error]="informe.error()"
      [filas]="4"
      (reintentar)="informe.recargar()"
    />

    @if (informe.datos(); as a) {
      <header class="pila pila--sm cabecera">
        <span class="micro"
          >informe de auditoría · {{ a.generadoEn | date: 'd MMM y, HH:mm' }}</span
        >
        <h1>{{ a.vacante.titulo }}</h1>
        <div class="fila no-imprimir">
          <button type="button" pButton severity="secondary" size="small" (click)="descargar()">
            Descargar (JSON)
          </button>
          @if (!nativa()) {
            <button type="button" pButton severity="secondary" size="small" (click)="imprimir()">
              Imprimir o guardar PDF
            </button>
          }
        </div>
      </header>

      <section class="panel bloque">
        <h2 class="micro">Integridad de las evaluaciones</h2>
        <dl class="cifras">
          <div>
            <dt class="micro">Evaluaciones</dt>
            <dd>{{ a.integridad.evaluaciones }}</dd>
          </div>
          <div>
            <dt class="micro">Descalificadas por moderación</dt>
            <dd>{{ a.integridad.descalificadas }}</dd>
          </div>
          <div>
            <dt class="micro">Riesgo alto</dt>
            <dd>{{ a.integridad.riesgoAlto }}</dd>
          </div>
          <div>
            <dt class="micro">Riesgo medio</dt>
            <dd>{{ a.integridad.riesgoMedio }}</dd>
          </div>
          <div>
            <dt class="micro">Entregas fallidas</dt>
            <dd>{{ a.integridad.entregasFallidas }}</dd>
          </div>
          <div>
            <dt class="micro">En proceso</dt>
            <dd>{{ a.integridad.entregasEnProceso }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel bloque">
        <h2 class="micro">Distribución de las notas (sin descalificadas)</h2>
        <p class="micro">
          {{ a.distribucion.candidatosEvaluados }} candidatos · promedio
          {{ a.distribucion.notaPromedio ?? '—' }} · mediana
          {{ a.distribucion.notaMediana ?? '—' }} · de {{ a.distribucion.notaMinima ?? '—' }} a
          {{ a.distribucion.notaMaxima ?? '—' }}
        </p>
        <ul class="histograma">
          @for (b of a.distribucion.histograma; track b.desde) {
            <li>
              <span class="micro">{{ b.desde }}–{{ b.hasta }}</span>
              <span
                class="barra"
                [style.width.%]="ancho(b.candidatos, a.distribucion.histograma)"
              ></span>
              <span>{{ b.candidatos }}</span>
            </li>
          }
        </ul>
      </section>

      <section class="panel bloque">
        <h2 class="micro">Trazabilidad</h2>
        <p>
          {{ a.trazabilidad.identidadesReveladas }} identidades reveladas ·
          {{ a.trazabilidad.contratados }} contratados
        </p>
        @if (a.trazabilidad.revelaciones.length > 0) {
          <ul>
            @for (r of a.trazabilidad.revelaciones; track r.alias + r.reveladaEn) {
              <li>
                {{ r.alias }}
                <span class="micro">· {{ r.reveladaEn | date: 'd MMM y, HH:mm' }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel bloque">
        <h2 class="micro">Sesgo</h2>
        <p>No medible. {{ a.sesgo.motivo }}</p>
      </section>
    }
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-4);
    }
    h1 {
      font-size: var(--t-1);
    }
    .bloque {
      display: grid;
      gap: var(--e-3);
      margin-bottom: var(--e-4);
      padding: var(--e-4);
    }
    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--e-3);
      margin: 0;
    }
    dd {
      margin: 0;
      font-size: var(--t-2, 1.4rem);
    }
    .histograma {
      display: grid;
      gap: var(--e-1, 4px);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .histograma li {
      display: grid;
      grid-template-columns: 70px 1fr 30px;
      gap: var(--e-2);
      align-items: center;
    }
    .barra {
      display: block;
      height: 10px;
      min-width: 2px;
      background: var(--c-acento);
      border-radius: 2px;
    }
    @media print {
      .no-imprimir {
        display: none;
      }
    }
  `,
})
export class AuditoriaDeVacante {
  readonly id = input.required<string>();
  readonly #reportes = inject(ReportesServicio);
  readonly #archivos = inject(Archivos);
  protected readonly nativa = inject(Plataforma).nativa;

  protected readonly informe = recursoPor(this.id, (id) => this.#reportes.auditoria(id));

  protected ancho(valor: number, todos: { candidatos: number }[]): number {
    const max = Math.max(1, ...todos.map((b) => b.candidatos));
    return (valor / max) * 100;
  }

  protected async descargar(): Promise<void> {
    const datos = this.informe.datos();
    if (!datos) return;
    await this.#archivos.guardar(
      `auditoria-${this.id()}.json`,
      JSON.stringify(datos, null, 2),
      'application/json',
    );
  }

  protected imprimir(): void {
    window.print();
  }
}
