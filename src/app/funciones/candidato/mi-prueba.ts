import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import type { Entrega } from '../../nucleo/api/modelos';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { recursoPor } from '../../nucleo/estado/recurso';
import { entorno } from '../../../entornos/entorno';
import { PanelEjercicio } from './panel-ejercicio';
import { VerificacionTecnica } from './verificacion-tecnica';

/**
 * La prueba de un candidato: un ejercicio tras otro, con sus intentos.
 *
 * Mientras haya algo evaluándose, la pantalla se refresca sola. El criterio
 * de HU-16 es que el candidato no tenga que esperar delante de la pantalla;
 * el de HU-15, que pueda ver el estado cuando quiera mirarlo. El sondeo se
 * detiene en cuanto no queda nada en proceso, para no castigar al servidor
 * por una pestaña olvidada.
 */
@Component({
  selector: 'app-mi-prueba',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EstadoRecurso, PanelEjercicio, VerificacionTecnica],
  template: `
    <nav class="migas"><a routerLink="/mis-pruebas">Mis pruebas</a> <span>Prueba</span></nav>

    <ui-recurso
      [cargando]="vacante.cargando()"
      [error]="vacante.error()"
      [filas]="3"
      (reintentar)="vacante.recargar()"
    />

    @if (vacante.datos(); as v) {
      <header class="pila pila--sm cabecera">
        <span class="micro">{{ v.ubicacion || 'remoto' }}</span>
        <h1>{{ v.titulo }}</h1>
        <p class="descripcion lectura">{{ v.descripcion }}</p>
        <p class="micro">
          {{ v.ejercicios?.length ?? 0 }}
          {{ v.ejercicios?.length === 1 ? 'ejercicio' : 'ejercicios' }} · {{ v.intentosPermitidos }}
          {{ v.intentosPermitidos === 1 ? 'intento' : 'intentos' }} por ejercicio
        </p>
      </header>

      <app-verificacion-tecnica />

      <div class="pila pila--lg">
        @for (asociado of ordenados(); track asociado.id; let i = $index) {
          <app-panel-ejercicio
            [idVacante]="v.id"
            [idEjercicio]="asociado.idEjercicio"
            [orden]="i + 1"
            [titulo]="detalleDe(asociado.idEjercicio)?.titulo ?? 'Ejercicio ' + (i + 1)"
            [enunciado]="detalleDe(asociado.idEjercicio)?.enunciado ?? null"
            [criterios]="detalleDe(asociado.idEjercicio)?.criterios ?? []"
            [duracionMinutos]="detalleDe(asociado.idEjercicio)?.duracionMinutos ?? null"
            [adjuntos]="detalleDe(asociado.idEjercicio)?.adjuntos ?? []"
            [intentosPermitidos]="v.intentosPermitidos"
            [entregas]="entregasDe(asociado.idEjercicio)"
            [admiteEntregas]="v.estado === 'publicada'"
            (entregado)="registrar($event)"
          />
        } @empty {
          <p class="descripcion">Esta prueba todavía no tiene ejercicios asignados.</p>
        }
      </div>
    }
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-6);
    }
    h1 {
      font-size: var(--t-1);
    }
    .descripcion {
      color: var(--c-texto-suave);
      white-space: pre-wrap;
    }
  `,
})
export class MiPrueba {
  readonly id = input.required<string>();

  readonly #vacantes = inject(VacantesServicio);
  readonly #entregas = inject(EntregasServicio);

  protected readonly vacante = recursoPor(this.id, (id) => this.#vacantes.obtener(id));
  protected readonly entregas = recursoPor(this.id, (id) => this.#entregas.mias(id));
  /** Enunciado y rúbrica: el candidato no ve el banco de la empresa, lee esto. */
  protected readonly enunciados = recursoPor(this.id, (id) => this.#vacantes.ejercicios(id));

  protected readonly ordenados = computed(() =>
    [...(this.vacante.datos()?.ejercicios ?? [])].sort((a, b) => a.orden - b.orden),
  );

  constructor() {
    const reloj = setInterval(() => {
      if ((this.entregas.datos() ?? []).some((e) => e.enProcesoDeEvaluacion)) {
        void this.entregas.recargar();
      }
    }, entorno.sondeoEvaluacionMs);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected detalleDe(idEjercicio: string) {
    return this.enunciados.datos()?.find((e) => e.idEjercicio === idEjercicio);
  }

  protected entregasDe(idEjercicio: string): Entrega[] {
    return (this.entregas.datos() ?? [])
      .filter((e) => e.idEjercicio === idEjercicio)
      .sort((a, b) => a.numeroIntento - b.numeroIntento);
  }

  protected registrar(entrega: Entrega): void {
    this.entregas.fijar([...(this.entregas.datos() ?? []), entrega]);
  }
}
