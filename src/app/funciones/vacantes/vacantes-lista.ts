import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VACANTE } from '../../compartido/dominio';
import { Estado, EstadoRecurso } from '../../compartido/ui/basicos';
import type { EstadoVacante } from '../../nucleo/api/modelos';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { recurso } from '../../nucleo/estado/recurso';

type Filtro = EstadoVacante | 'todas';

@Component({
  selector: 'app-vacantes-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Estado, EstadoRecurso],
  template: `
    <header class="cabecera">
      <div class="pila pila--sm">
        <span class="micro">procesos de selección</span>
        <h1>Vacantes</h1>
      </div>
      <a routerLink="/vacantes/nueva" class="btn btn--primario">Nueva vacante</a>
    </header>

    @if (vacantes.datos(); as todas) {
      <div class="filtros" role="group" aria-label="Filtrar por estado">
        @for (opcion of filtros; track opcion.valor) {
          <button
            type="button"
            class="btn btn--sm"
            [class.btn--primario]="filtro() === opcion.valor"
            [attr.aria-pressed]="filtro() === opcion.valor"
            (click)="filtro.set(opcion.valor)"
          >
            {{ opcion.texto }} ({{ cuenta(todas, opcion.valor) }})
          </button>
        }
      </div>
    }

    <ui-recurso
      [cargando]="vacantes.cargando()"
      [error]="vacantes.error()"
      [vacio]="visibles().length === 0 && !vacantes.cargando()"
      tituloVacio="Todavía no hay vacantes aquí"
      textoVacio="Una vacante agrupa los ejercicios que resolverá un candidato. Se crea en borrador y no es visible para nadie hasta que la publicas."
      (reintentar)="vacantes.recargar()"
    >
      <a accion-vacio routerLink="/vacantes/nueva" class="btn btn--primario">Crear la primera</a>
    </ui-recurso>

    <div class="rejilla rejilla--ancha">
      @for (vacante of visibles(); track vacante.id) {
        <article class="panel tarjeta">
          <div class="fila fila--entre">
            <ui-estado [p]="presentacion(vacante.estado)" />
            <span class="micro">{{ vacante.creadaEn | date: 'd MMM y' }}</span>
          </div>

          <h2>
            <a [routerLink]="['/vacantes', vacante.id]">{{ vacante.titulo }}</a>
          </h2>

          @if (vacante.ubicacion) {
            <p class="micro">{{ vacante.ubicacion }}</p>
          }
          <p class="descripcion">{{ vacante.descripcion }}</p>

          <dl class="cifras">
            <div>
              <dt class="micro">Ejercicios</dt>
              <dd>{{ vacante.ejercicios?.length ?? 0 }}</dd>
            </div>
            <div>
              <dt class="micro">Invitados</dt>
              <dd>{{ vacante.candidatos?.length ?? 0 }}</dd>
            </div>
            <div>
              <dt class="micro">Intentos</dt>
              <dd>{{ vacante.intentosPermitidos }}</dd>
            </div>
          </dl>

          <div class="fila">
            <a [routerLink]="['/vacantes', vacante.id]" class="btn btn--sm">Gestionar</a>
            @if (vacante.estado !== 'borrador') {
              <a [routerLink]="['/vacantes', vacante.id, 'reporte']" class="btn btn--sm"
                >Ver ranking</a
              >
            }
          </div>
        </article>
      }
    </div>
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
    .filtros {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-2);
      margin-bottom: var(--e-5);
    }
    .tarjeta {
      display: grid;
      gap: var(--e-3);
      align-content: start;
      transition: border-color var(--mov) var(--curva);
    }
    .tarjeta:hover {
      border-color: var(--c-borde-fuerte);
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
      margin: var(--e-2) 0;
      padding-top: var(--e-3);
      border-top: 1px solid var(--c-borde);
    }
    .cifras dd {
      margin: 0;
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
    }
  `,
})
export class VacantesLista {
  readonly #servicio = inject(VacantesServicio);

  protected readonly vacantes = recurso(() => this.#servicio.listar());
  protected readonly filtro = signal<Filtro>('todas');
  protected readonly presentacion = (estado: EstadoVacante) => VACANTE[estado];

  protected readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'todas', texto: 'Todas' },
    { valor: 'borrador', texto: 'Borradores' },
    { valor: 'publicada', texto: 'Publicadas' },
    { valor: 'cerrada', texto: 'Cerradas' },
  ];

  protected readonly visibles = computed(() => {
    const todas = this.vacantes.datos() ?? [];
    const filtro = this.filtro();
    return filtro === 'todas' ? todas : todas.filter((v) => v.estado === filtro);
  });

  protected cuenta(todas: { estado: EstadoVacante }[], filtro: Filtro): number {
    return filtro === 'todas' ? todas.length : todas.filter((v) => v.estado === filtro).length;
  }
}
