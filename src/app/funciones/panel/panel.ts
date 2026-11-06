import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoRecurso, Panel as PanelUi } from '../../compartido/ui/basicos';
import type { PanelDeEmpresa } from '../../nucleo/api/modelos';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import { recurso } from '../../nucleo/estado/recurso';
import { Sesion } from '../../nucleo/sesion/sesion';
import { ButtonDirective } from 'primeng/button';

/**
 * Inicio de la empresa (A02): lo que está pasando ahora en sus procesos.
 *
 * Las cifras vienen de una sola llamada y no se recalculan aquí: el panel y el
 * ranking tienen que decir lo mismo, y la única forma de garantizarlo es que
 * el número lo ponga el servidor.
 */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, RouterLink, DatePipe, EstadoRecurso, PanelUi],
  template: `
    <header class="cabecera">
      <div class="pila pila--sm">
        <span class="micro">tu empresa hoy</span>
        <h1>Panel</h1>
      </div>
      <div class="fila">
        <button type="button" pButton severity="secondary" size="small" (click)="panel.recargar()">
          Actualizar
        </button>
        <a routerLink="/vacantes/nueva" pButton>Nueva vacante</a>
      </div>
    </header>

    <ui-recurso
      [cargando]="panel.cargando() && !panel.datos()"
      [error]="panel.error()"
      [filas]="4"
      (reintentar)="panel.recargar()"
    />

    @if (panel.datos(); as p) {
      <section class="cifras" aria-label="Cifras de la empresa">
        <article class="cifra panel">
          <p class="micro">Vacantes publicadas</p>
          <p class="valor">{{ p.vacantes.publicadas }}</p>
          <p class="micro">
            {{ p.vacantes.borradores }} en borrador · {{ p.vacantes.cerradas }} cerradas
          </p>
        </article>
        <article class="cifra panel">
          <p class="micro">Finalistas en evaluación</p>
          <p class="valor">{{ p.finalistasEnEvaluacion }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Entregas por evaluar</p>
          <p class="valor">{{ p.entregasPorEvaluar }}</p>
          <p class="micro">{{ p.entregasEvaluadas }} ya evaluadas</p>
        </article>
        <article class="cifra panel" [class.peligro]="p.entregasFallidas > 0">
          <p class="micro">Evaluaciones fallidas</p>
          <p class="valor">{{ p.entregasFallidas }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Contratados</p>
          <p class="valor">{{ p.contratados }}</p>
        </article>
        <article class="cifra panel">
          <p class="micro">Retos en el banco</p>
          <p class="valor">{{ p.retosEnElBanco }}</p>
        </article>
      </section>

      <ui-panel antetitulo="procesos abiertos" titulo="Avance de las vacantes publicadas" plano>
        @if (p.abiertas.length === 0) {
          <p class="vacio">
            No hay vacantes publicadas. <a routerLink="/vacantes">Ve a tus vacantes</a> para
            publicar una.
          </p>
        } @else {
          <ul class="avance">
            @for (v of p.abiertas; track v.id) {
              <li>
                <div class="fila fila--entre">
                  <a [routerLink]="['/vacantes', v.id]">{{ v.titulo }}</a>
                  <span class="micro">
                    {{ v.evaluados }} evaluados · {{ v.conEntrega }} con entrega ·
                    {{ v.invitados }} invitados
                  </span>
                </div>
                <div
                  class="barra"
                  role="meter"
                  [attr.aria-valuenow]="v.avance"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-label]="'Avance de ' + v.titulo"
                >
                  <div class="barra__relleno" [style.width.%]="v.avance"></div>
                </div>
                <p class="micro">
                  @if (v.finalistasAEvaluar) {
                    Meta: {{ v.finalistasAEvaluar }} finalistas ·
                  }
                  @if (v.cierreEstimado) {
                    cierre estimado {{ v.cierreEstimado | date: 'd MMM y' }}
                  } @else {
                    sin fecha de cierre estimada
                  }
                  ·
                  <a [routerLink]="['/vacantes', v.id, 'reporte']">ver ranking</a>
                </p>
              </li>
            }
          </ul>
        }
      </ui-panel>

      <p class="micro generado">Generado {{ p.generadoEn | date: 'd MMM y, HH:mm' }}</p>
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
    .cifras {
      display: grid;
      gap: var(--e-3);
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      margin-bottom: var(--e-5);
    }
    .cifra {
      display: grid;
      gap: var(--e-2);
      padding: var(--e-4);
    }
    .valor {
      font-family: var(--fuente-display);
      font-size: var(--t-1);
      font-weight: var(--peso-display);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .cifra.peligro .valor {
      color: var(--c-peligro);
    }
    .avance {
      display: grid;
      gap: var(--e-5);
      margin: 0;
      padding: 0 var(--e-5) var(--e-5);
      list-style: none;
      font-size: var(--t-menor);
    }
    .avance li {
      display: grid;
      gap: var(--e-2);
    }
    .vacio {
      padding: 0 var(--e-5) var(--e-5);
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .generado {
      margin-top: var(--e-4);
    }
  `,
})
export class Panel {
  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #servicio = inject(ReportesServicio);

  protected readonly panel = recurso<PanelDeEmpresa | undefined>(async () => {
    // Un administrador de plataforma no pertenece a ninguna empresa: no tiene
    // cifras propias y el backend le respondería 400. Su sitio es la consola.
    if (this.#sesion.usuario()?.idEmpresa === null) {
      await this.#router.navigateByUrl('/administracion', { replaceUrl: true });
      return undefined;
    }
    return this.#servicio.panel();
  });
}
