import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { ModeracionServicio } from '../../nucleo/api/moderacion.servicio';
import { recurso } from '../../nucleo/estado/recurso';

/** Métricas de la moderación (C27). No hay tasas por grupo: no se recogen datos demográficos. */
@Component({
  selector: 'app-metricas-de-moderacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">calidad del modelo</span>
      <h1>Métricas de moderación</h1>
    </header>

    <ui-recurso
      [cargando]="metricas.cargando()"
      [error]="metricas.error()"
      [filas]="3"
      (reintentar)="metricas.recargar()"
    />

    @if (metricas.datos(); as m) {
      <dl class="cifras panel">
        <div>
          <dt class="micro">Casos</dt>
          <dd>{{ m.casos.total }}</dd>
        </div>
        <div>
          <dt class="micro">Abiertos</dt>
          <dd>{{ m.casos.abiertos }}</dd>
        </div>
        <div>
          <dt class="micro">Confirmados</dt>
          <dd>{{ m.casos.confirmados }}</dd>
        </div>
        <div>
          <dt class="micro">Restaurados</dt>
          <dd>{{ m.casos.restaurados }}</dd>
        </div>
        <div>
          <dt class="micro">Vencidos sin decidir (plazo {{ m.slaHoras }} h)</dt>
          <dd>{{ m.vencidosSinDecidir }}</dd>
        </div>
        <div>
          <dt class="micro">Falsos positivos (antifraude restauradas)</dt>
          <dd>{{ porcentaje(m.tasaDeFalsosPositivos) }}</dd>
        </div>
        <div>
          <dt class="micro">Cobertura del muestreo</dt>
          <dd>{{ porcentaje(m.coberturaDelMuestreo) }}</dd>
        </div>
        <div>
          <dt class="micro">Resolución promedio</dt>
          <dd>
            {{
              m.horasPromedioDeResolucion === null
                ? '—'
                : m.horasPromedioDeResolucion.toFixed(1) + ' h'
            }}
          </dd>
        </div>
      </dl>
      <p class="micro">
        Por origen: {{ m.casos.porOrigen.antifraude }} antifraude ·
        {{ m.casos.porOrigen.muestreo }} muestreo · {{ m.casos.porOrigen.disputa }} disputas. La
        tasa de marcas por grupo no se calcula: la plataforma no recoge datos demográficos.
      </p>
    }
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-5);
    }
    h1 {
      font-size: var(--t-1);
    }
    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--e-4);
      padding: var(--e-4);
      margin: 0 0 var(--e-4);
    }
    dd {
      margin: 0;
      font-size: var(--t-2, 1.5rem);
    }
  `,
})
export class MetricasDeModeracion {
  protected readonly metricas = recurso(() => inject(ModeracionServicio).metricas());

  protected porcentaje(valor: number | null): string {
    return valor === null ? '—' : `${(valor * 100).toFixed(1)} %`;
  }
}
