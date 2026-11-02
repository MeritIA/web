import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ENTREGA } from '../../compartido/dominio';
import { Estado, EstadoRecurso, Nota } from '../../compartido/ui/basicos';
import { Desglose } from '../../compartido/ui/desglose';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import { EvaluacionesServicio } from '../../nucleo/api/evaluaciones.servicio';
import type { MiPuesto } from '../../nucleo/api/modelos';
import { recurso } from '../../nucleo/estado/recurso';

/**
 * Resultados del candidato, con el desglose que los explica (HU-22).
 *
 * La nota se muestra junto a la evidencia, nunca sola: el valor del producto
 * para quien la recibe es entender en qué acertó y en qué no.
 */
@Component({
  selector: 'app-mis-resultados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Estado, EstadoRecurso, Nota, Desglose],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">calificaciones recibidas</span>
      <h1>Mis resultados</h1>
      <p class="lectura ayuda">
        Cada nota es la suma ponderada de los criterios de la rúbrica. Debajo de cada criterio está
        la parte de tu entrega que la justifica.
      </p>
    </header>

    @if (pendientes().length > 0) {
      <section class="pendientes panel" aria-live="polite">
        <h2 class="micro">En evaluación</h2>
        <ul>
          @for (entrega of pendientes(); track entrega.id) {
            <li>
              <span>Intento {{ entrega.numeroIntento }} · {{ entrega.archivoNombre }}</span>
              <ui-estado [p]="estado(entrega.estado)" />
            </li>
          }
        </ul>
      </section>
    }

    <ui-recurso
      [cargando]="evaluaciones.cargando()"
      [error]="evaluaciones.error()"
      [vacio]="(evaluaciones.datos()?.length ?? 0) === 0 && !evaluaciones.cargando()"
      tituloVacio="Todavía no tienes resultados"
      textoVacio="En cuanto se califique una entrega la verás aquí, con el detalle por criterio."
      (reintentar)="evaluaciones.recargar()"
    >
      <a accion-vacio routerLink="/mis-pruebas" class="btn btn--primario">Ver mis pruebas</a>
    </ui-recurso>

    <div class="pila">
      @for (evaluacion of evaluaciones.datos() ?? []; track evaluacion.id) {
        <article class="panel resultado">
          <header class="fila fila--entre">
            <div class="pila pila--sm">
              <span class="micro">evaluada {{ evaluacion.creadaEn | date: 'd MMM y, HH:mm' }}</span>
              <h2>Entrega #{{ evaluacion.idEntrega.slice(0, 8) }}</h2>
            </div>
            <ui-nota [valor]="evaluacion.notaFinal" grande />
          </header>

          @if (puestos()[evaluacion.idVacante]; as puesto) {
            @if (puesto.disponible) {
              <p class="puesto">
                <span class="chip chip--info"
                  >Puesto {{ puesto.puesto }} de {{ puesto.total }}</span
                >
                <span class="micro">en la vacante, ya cerrada · nota {{ puesto.notaFinal }}</span>
              </p>
            } @else if (puesto.motivo === 'proceso_en_curso') {
              <p class="micro">
                Tu puesto se publica cuando la empresa cierre la vacante: mientras el proceso sigue
                abierto cambiaría con cada entrega de los demás.
              </p>
            }
          }

          <button
            type="button"
            class="btn btn--sm"
            [attr.aria-expanded]="abierta() === evaluacion.id"
            [attr.aria-controls]="'desglose-' + evaluacion.id"
            (click)="alternar(evaluacion.id)"
          >
            {{ abierta() === evaluacion.id ? 'Ocultar desglose' : 'Ver desglose y evidencia' }}
          </button>

          @if (abierta() === evaluacion.id) {
            <div [id]="'desglose-' + evaluacion.id">
              <ui-desglose [criterios]="evaluacion.criterios" />
            </div>
          }
        </article>
      }
    </div>
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
    .pendientes {
      margin-bottom: var(--e-5);
      padding: var(--e-4);
    }
    .pendientes ul {
      display: grid;
      gap: var(--e-2);
      margin: var(--e-3) 0 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .pendientes li {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      justify-content: space-between;
    }
    .resultado {
      display: grid;
      gap: var(--e-4);
      justify-items: start;
    }
    .puesto {
      display: flex;
      gap: var(--e-3);
      align-items: center;
    }
    .resultado h2 {
      font-size: var(--t-3);
    }
    .resultado > div {
      width: 100%;
    }
  `,
})
export class MisResultados {
  readonly #evaluaciones = inject(EvaluacionesServicio);
  readonly #entregas = inject(EntregasServicio);

  protected readonly evaluaciones = recurso(() => this.#evaluaciones.mias());
  protected readonly entregas = recurso(() => this.#entregas.mias());
  protected readonly abierta = signal<string | null>(null);
  protected readonly puestos = signal<Record<string, MiPuesto>>({});
  protected readonly estado = (clave: keyof typeof ENTREGA) => ENTREGA[clave];

  protected readonly pendientes = computed(() =>
    (this.entregas.datos() ?? []).filter((e) => e.enProcesoDeEvaluacion || e.estado === 'fallida'),
  );

  constructor() {
    // El puesto se pide una vez por vacante, no por evaluación: varias entregas
    // de la misma prueba comparten respuesta.
    effect(() => {
      const ids = new Set((this.evaluaciones.datos() ?? []).map((e) => e.idVacante));
      for (const idVacante of ids) {
        this.#evaluaciones
          .miPuesto(idVacante)
          .then((puesto) => this.puestos.update((actual) => ({ ...actual, [idVacante]: puesto })))
          .catch(() => undefined); // sin puesto no es un error: la nota se muestra igual
      }
    });
  }

  protected alternar(id: string): void {
    this.abierta.update((actual) => (actual === id ? null : id));
  }
}
