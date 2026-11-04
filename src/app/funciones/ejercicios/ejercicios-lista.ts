import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chip, EstadoRecurso } from '../../compartido/ui/basicos';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import type { UsoDeEjercicio } from '../../nucleo/api/modelos';
import { EjerciciosServicio } from '../../nucleo/api/ejercicios.servicio';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

@Component({
  selector: 'app-ejercicios-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Chip, EstadoRecurso],
  template: `
    <header class="cabecera">
      <div class="pila pila--sm">
        <span class="micro">pruebas técnicas reutilizables</span>
        <h1>Banco de ejercicios</h1>
      </div>
      <a routerLink="/ejercicios/nuevo" class="btn btn--primario">Nuevo ejercicio</a>
    </header>

    <div class="buscador">
      <label class="solo-lectores" for="buscar">Buscar ejercicio</label>
      <input
        id="buscar"
        type="search"
        class="control"
        placeholder="Buscar por título o tecnología…"
        [value]="busqueda()"
        (input)="busqueda.set($any($event.target).value)"
      />
    </div>

    <ui-recurso
      [cargando]="ejercicios.cargando()"
      [error]="ejercicios.error()"
      [vacio]="visibles().length === 0 && !ejercicios.cargando()"
      [tituloVacio]="busqueda() ? 'Ningún ejercicio coincide' : 'El banco todavía está vacío'"
      textoVacio="Un ejercicio se crea una vez y se reutiliza en todas las vacantes que lo necesiten."
      (reintentar)="ejercicios.recargar()"
    >
      <a accion-vacio routerLink="/ejercicios/nuevo" class="btn btn--primario">Crear ejercicio</a>
    </ui-recurso>

    <div class="rejilla">
      @for (ejercicio of visibles(); track ejercicio.id) {
        <article class="panel tarjeta" [class.retirado]="!ejercicio.activo">
          <div class="fila fila--entre">
            <span class="micro">{{ ejercicio.tecnologia || 'general' }}</span>
            @if (!ejercicio.activo) {
              <ui-chip tono="peligro">Retirado</ui-chip>
            }
          </div>

          <h2>
            <a [routerLink]="['/ejercicios', ejercicio.id]">{{ ejercicio.titulo }}</a>
          </h2>

          <p class="micro">
            v{{ ejercicio.versiones?.length ?? 1 }} · creado
            {{ ejercicio.creadoEn | date: 'd MMM y' }}
          </p>

          @if (usoDe(ejercicio.id); as uso) {
            <p class="micro uso">
              En {{ uso.vacantes }} {{ uso.vacantes === 1 ? 'vacante' : 'vacantes' }} ·
              {{ uso.evaluaciones }} {{ uso.evaluaciones === 1 ? 'evaluación' : 'evaluaciones' }}
              @if (uso.notaPromedio !== null) {
                · promedio {{ uso.notaPromedio }}
              }
            </p>
          } @else {
            <p class="micro uso">Aún sin usar en ninguna vacante.</p>
          }

          <div class="fila">
            <a [routerLink]="['/ejercicios', ejercicio.id]" class="btn btn--sm">Ver rúbrica</a>
            @if (ejercicio.activo) {
              <a [routerLink]="['/ejercicios', ejercicio.id, 'version']" class="btn btn--sm"
                >Versionar</a
              >
              <button
                type="button"
                class="btn btn--sm btn--fantasma"
                (click)="pedirRetirar(ejercicio.id, ejercicio.titulo)"
              >
                Retirar
              </button>
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
      margin-bottom: var(--e-4);
    }
    h1 {
      font-size: var(--t-1);
    }
    .buscador {
      max-width: 420px;
      margin-bottom: var(--e-5);
    }
    .tarjeta {
      display: grid;
      gap: var(--e-3);
      align-content: start;
    }
    .tarjeta h2 {
      font-size: var(--t-3);
    }
    .tarjeta h2 a {
      text-decoration: none;
    }
    .retirado {
      opacity: 0.6;
    }
  `,
})
export class EjerciciosLista {
  readonly #servicio = inject(EjerciciosServicio);
  readonly #avisos = inject(Avisos);
  readonly #confirmaciones = inject(Confirmaciones);

  protected readonly ejercicios = recurso(() => this.#servicio.listar());
  readonly #reportes = inject(ReportesServicio);
  /** Uso por ejercicio (A10). Un administrador no tiene empresa y recibe 400: sin cifras. */
  protected readonly uso = recurso(() => this.#reportes.usoDeEjercicios().catch(() => []));

  protected usoDe(id: string): UsoDeEjercicio | undefined {
    return this.uso.datos()?.find((u) => u.idEjercicio === id);
  }
  protected readonly busqueda = signal('');

  protected readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const todos = this.ejercicios.datos() ?? [];
    if (!texto) return todos;
    return todos.filter((e) => `${e.titulo} ${e.tecnologia ?? ''}`.toLowerCase().includes(texto));
  });

  protected readonly retirar = accion(async (id: string) => {
    await this.#servicio.retirar(id);
    await this.ejercicios.recargar();
    this.#avisos.info('Ejercicio retirado. Las evaluaciones ya emitidas siguen siendo auditables.');
  });

  protected async pedirRetirar(id: string, titulo: string): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: `¿Retirar «${titulo}»?`,
      texto:
        'No se borra: deja de poder asociarse a vacantes nuevas, pero se conserva para que las notas emitidas con él sigan explicándose.',
      accion: 'Retirar del banco',
      peligrosa: true,
    });
    if (confirmado) void this.retirar.correr(id);
  }
}
