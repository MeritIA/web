import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ENTREGA } from '../../compartido/dominio';
import { Chip, Estado, EstadoRecurso } from '../../compartido/ui/basicos';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { recurso } from '../../nucleo/estado/recurso';

/**
 * Lo primero que ve un candidato: qué tiene pendiente y qué ya envió.
 *
 * Solo aparecen las vacantes publicadas a las que fue invitado, porque es lo
 * único que el backend le deja ver. La pantalla no filtra nada por su cuenta.
 */
@Component({
  selector: 'app-mis-pruebas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Chip, Estado, EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">pruebas asignadas</span>
      <h1>Mis pruebas</h1>
      <p class="lectura ayuda">
        Cada prueba tiene uno o más ejercicios. Resuelves, subes tu archivo y la calificación llega
        con el desglose por criterio.
      </p>
    </header>

    <ui-recurso
      [cargando]="vacantes.cargando()"
      [error]="vacantes.error()"
      [vacio]="(vacantes.datos()?.length ?? 0) === 0 && !vacantes.cargando()"
      tituloVacio="Todavía no te han invitado a ninguna prueba"
      textoVacio="Cuando una empresa te invite a su proceso, la prueba aparecerá aquí automáticamente."
      (reintentar)="vacantes.recargar()"
    >
      <a accion-vacio routerLink="/explorar" class="btn btn--primario">Explorar vacantes</a>
    </ui-recurso>

    <div class="rejilla rejilla--ancha">
      @for (vacante of vacantes.datos() ?? []; track vacante.id) {
        <article class="panel tarjeta">
          <div class="fila fila--entre">
            <span class="micro">{{ vacante.ubicacion || 'remoto' }}</span>
            @if (estadoDe(vacante.id); as estado) {
              <ui-chip
                [tono]="estado === 'Entregada' ? 'exito' : 'info'"
                [vivo]="estado !== 'Entregada'"
              >
                {{ estado }}
              </ui-chip>
            }
          </div>

          <h2>
            <a [routerLink]="['/mis-pruebas', vacante.id]">{{ vacante.titulo }}</a>
          </h2>
          <p class="descripcion">{{ vacante.descripcion }}</p>

          <dl class="cifras">
            <div>
              <dt class="micro">Ejercicios</dt>
              <dd>{{ vacante.ejercicios?.length ?? 0 }}</dd>
            </div>
            <div>
              <dt class="micro">Intentos c/u</dt>
              <dd>{{ vacante.intentosPermitidos }}</dd>
            </div>
            <div>
              <dt class="micro">Enviados</dt>
              <dd>{{ enviadas(vacante.id) }}</dd>
            </div>
          </dl>

          @if (vacante.publicadaEn) {
            <p class="micro">Abierta desde {{ vacante.publicadaEn | date: 'd MMM y' }}</p>
          }

          <a [routerLink]="['/mis-pruebas', vacante.id]" class="btn btn--primario">
            {{ enviadas(vacante.id) > 0 ? 'Ver y entregar' : 'Empezar' }}
          </a>
        </article>
      }
    </div>

    @if (enProceso().length > 0) {
      <aside class="recordatorio panel" role="status">
        <ui-estado [p]="evaluando" />
        <p>
          Tienes {{ enProceso().length }} {{ enProceso().length === 1 ? 'entrega' : 'entregas' }} en
          evaluación. No hace falta que esperes aquí: te la encontrarás calificada en
          <a routerLink="/mis-resultados">Mis resultados</a>.
        </p>
      </aside>
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
    .tarjeta {
      display: grid;
      gap: var(--e-3);
      align-content: start;
      justify-items: start;
    }
    .tarjeta h2 {
      font-size: var(--t-3);
    }
    .tarjeta h2 a {
      text-decoration: none;
    }
    .descripcion {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .cifras {
      display: flex;
      gap: var(--e-5);
      width: 100%;
      margin: 0;
      padding-top: var(--e-3);
      border-top: 1px solid var(--c-borde);
    }
    .cifras dd {
      margin: 0;
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
    }
    .recordatorio {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      margin-top: var(--e-5);
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
  `,
})
export class MisPruebas {
  readonly #vacantes = inject(VacantesServicio);
  readonly #entregas = inject(EntregasServicio);

  protected readonly vacantes = recurso(() => this.#vacantes.listar());
  protected readonly entregas = recurso(() => this.#entregas.mias());
  protected readonly evaluando = ENTREGA.en_evaluacion;

  protected readonly enProceso = computed(() =>
    (this.entregas.datos() ?? []).filter((e) => e.enProcesoDeEvaluacion),
  );

  protected enviadas(idVacante: string): number {
    return (this.entregas.datos() ?? []).filter((e) => e.idVacante === idVacante).length;
  }

  protected estadoDe(idVacante: string): string | null {
    const suyas = (this.entregas.datos() ?? []).filter((e) => e.idVacante === idVacante);
    if (suyas.length === 0) return null;
    if (suyas.some((e) => e.enProcesoDeEvaluacion)) return 'En evaluación';
    return 'Entregada';
  }
}
