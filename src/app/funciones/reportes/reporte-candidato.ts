import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RIESGO } from '../../compartido/dominio';
import { CortoPipe } from '../../compartido/formato';
import { Estado, EstadoRecurso, Nota, Panel } from '../../compartido/ui/basicos';
import { Desglose } from '../../compartido/ui/desglose';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import type { IdentidadRevelada, Riesgo } from '../../nucleo/api/modelos';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { Avisos } from '../../nucleo/ui/avisos';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import { accion, recursoPor } from '../../nucleo/estado/recurso';
import { ButtonDirective } from 'primeng/button';

/**
 * Un candidato dentro de una vacante (HU-21).
 *
 * Se ven **todos** sus intentos, no solo el que puntúa. El ranking usa el
 * mejor, y mostrar el resto es lo que impide que esa decisión parezca
 * arbitraria: quien lee puede comprobarla.
 */
@Component({
  selector: 'app-reporte-candidato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    RouterLink,
    DatePipe,
    CortoPipe,
    Estado,
    EstadoRecurso,
    Nota,
    Panel,
    Desglose,
  ],
  template: `
    <nav class="migas">
      <a routerLink="/vacantes">Vacantes</a>
      <a [routerLink]="['/vacantes', id(), 'reporte']">Ranking</a>
      <span>/ Candidato</span>
    </nav>

    <ui-recurso
      [cargando]="reporte.cargando()"
      [error]="reporte.error()"
      [filas]="4"
      (reintentar)="reporte.recargar()"
    />

    @if (reporte.datos(); as r) {
      <header class="cabecera">
        <div class="pila pila--sm">
          <span class="micro">{{ r.vacante.titulo }}</span>
          @if (identidad(); as i) {
            <h1>{{ i.nombre }}</h1>
            <p class="micro">{{ i.correo }} · {{ r.alias }}</p>
          } @else {
            <h1>{{ r.alias }}</h1>
            <p class="micro">identidad oculta</p>
          }
        </div>
        <div class="resumen">
          @if (r.posicionEnLaVacante !== null) {
            <div class="posicion">
              <span class="micro">posición</span>
              <p>{{ r.posicionEnLaVacante }}</p>
            </div>
          }
          @if (mejor(); as nota) {
            <div>
              <span class="micro">mejor intento</span>
              <ui-nota [valor]="nota" grande />
            </div>
          }
        </div>
        <div class="fila">
          @if (!identidad()) {
            <button
              type="button"
              pButton
              severity="secondary"
              [disabled]="revelar.enviando()"
              (click)="pedirRevelar()"
            >
              Revelar identidad
            </button>
          }
          @if (contratadoEn(); as cuando) {
            <span class="chip chip--exito">Contratado {{ cuando | date: 'd MMM y' }}</span>
          } @else {
            <button
              type="button"
              pButton
              [disabled]="contratar.enviando()"
              (click)="pedirContratar()"
            >
              Registrar contratación
            </button>
          }
        </div>
      </header>

      @if (revelar.error() || contratar.error(); as error) {
        <p class="campo__error" role="alert">{{ error }}</p>
      }

      <ui-recurso
        [vacio]="r.intentos.length === 0"
        tituloVacio="Sin intentos evaluados"
        textoVacio="Este candidato todavía no tiene ninguna entrega calificada en esta vacante."
      />

      <div class="pila pila--lg">
        @for (intento of r.intentos; track intento.idEvaluacion; let i = $index) {
          <ui-panel
            [antetitulo]="'intento ' + (i + 1)"
            [titulo]="'Entrega #' + (intento.idEntrega | corto)"
          >
            <div acciones class="fila">
              <ui-estado [p]="riesgo(intento.riesgoInyeccion)" />
              <span class="micro">{{ intento.creadaEn | date: 'd MMM y, HH:mm' }}</span>
              @if (intento.notaFinal === mejor()) {
                <span class="chip chip--exito">Cuenta en el ranking</span>
              }
            </div>

            <div class="cuerpo">
              <ui-nota [valor]="intento.notaFinal" grande />
              <ui-desglose [criterios]="intento.criterios" />
            </div>
          </ui-panel>
        }
      </div>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-5);
      align-items: end;
      justify-content: space-between;
      margin-bottom: var(--e-5);
    }
    h1 {
      font-size: var(--t-1);
    }
    .resumen {
      display: flex;
      gap: var(--e-6);
      align-items: end;
    }
    .posicion p {
      font-family: var(--fuente-display);
      font-size: var(--t-1);
      font-weight: var(--peso-display);
      line-height: 1;
    }
    .cuerpo {
      display: grid;
      gap: var(--e-5);
      grid-template-columns: 150px 1fr;
      align-items: start;
    }
    @media (max-width: 720px) {
      .cuerpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ReporteCandidato {
  readonly id = input.required<string>();
  readonly idCandidato = input.required<string>();
  readonly #servicio = inject(ReportesServicio);
  readonly #vacantes = inject(VacantesServicio);
  readonly #confirmaciones = inject(Confirmaciones);
  readonly #avisos = inject(Avisos);

  protected readonly identidad = signal<IdentidadRevelada | null>(null);
  protected readonly vacante = recursoPor(this.id, (id) => this.#vacantes.obtener(id));
  protected readonly contratadoEn = computed(
    () =>
      this.vacante.datos()?.candidatos?.find((c) => c.idCandidato === this.idCandidato())
        ?.contratadoEn ?? null,
  );

  protected readonly reporte = recursoPor(
    computed(() => [this.id(), this.idCandidato()] as const),
    ([idVacante, idCandidato]) => this.#servicio.deCandidato(idVacante, idCandidato),
  );

  protected async pedirRevelar(): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Revelar la identidad?',
      texto: 'Verás su nombre y su correo. Queda registrado quién lo pidió y cuándo.',
      accion: 'Revelar',
    });
    if (confirmado) void this.revelar.correr();
  }

  protected readonly revelar = accion(async () => {
    this.identidad.set(await this.#servicio.revelar(this.id(), this.idCandidato()));
  });

  protected async pedirContratar(): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Registrar la contratación?',
      texto:
        'Queda constancia de quién lo registró y cuándo. Suma al contador de contratados de tu panel; no se puede deshacer.',
      accion: 'Registrar contratación',
    });
    if (confirmado) void this.contratar.correr();
  }

  protected readonly contratar = accion(async () => {
    await this.#vacantes.contratar(this.id(), this.idCandidato());
    await this.vacante.recargar();
    this.#avisos.exito('Contratación registrada.');
  });

  protected readonly riesgo = (valor: Riesgo) => RIESGO[valor];

  /** El criterio D-1 del alcance: puntúa el mejor intento, no el último. */
  protected readonly mejor = computed(() => {
    const intentos = this.reporte.datos()?.intentos ?? [];
    return intentos.length ? Math.max(...intentos.map((i) => i.notaFinal)) : null;
  });
}
