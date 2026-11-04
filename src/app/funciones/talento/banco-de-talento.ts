import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { ReportesServicio } from '../../nucleo/api/reportes.servicio';
import type { FilaDeTalento } from '../../nucleo/api/modelos';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Personas que autorizaron mostrar su perfil, de cualquier empresa.
 *
 * Aparecen con alias y mejor nota, igual que en el ranking. Para quedarse con
 * alguien se la invita a una vacante propia: la identidad sigue el camino de
 * siempre (revelarla desde el ranking de esa vacante).
 */
@Component({
  selector: 'app-banco-de-talento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">personas que lo autorizaron</span>
      <h1>Banco de talento</h1>
      <p class="lectura ayuda">
        Solo aparece quien activó «Publicación de tu perfil» en su cuenta, y deja de aparecer en
        cuanto lo retira. Verás su alias y su mejor nota; para contar con alguien, invítalo a una de
        tus vacantes.
      </p>
    </header>

    <div class="campo destino">
      <label class="campo__etiqueta" for="vacante">Invitar a la vacante</label>
      <select
        id="vacante"
        class="control"
        [value]="destino()"
        (change)="destino.set($any($event.target).value)"
      >
        <option value="">Elige una vacante…</option>
        @for (v of vacantesAbiertas(); track v.id) {
          <option [value]="v.id">{{ v.titulo }}</option>
        }
      </select>
    </div>

    <ui-recurso
      [cargando]="talento.cargando()"
      [error]="talento.error()"
      [vacio]="(talento.datos()?.length ?? 0) === 0 && !talento.cargando()"
      tituloVacio="Todavía nadie lo ha autorizado"
      textoVacio="Cuando un candidato con evaluaciones active la publicación de su perfil, aparecerá aquí."
      (reintentar)="talento.recargar()"
    />

    @if ((talento.datos()?.length ?? 0) > 0) {
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Candidato</th>
              <th scope="col">Mejor nota</th>
              <th scope="col">Evaluaciones</th>
              <th scope="col"><span>Acción</span></th>
            </tr>
          </thead>
          <tbody>
            @for (fila of talento.datos() ?? []; track fila.idCandidato) {
              <tr>
                <td>{{ fila.alias }}</td>
                <td class="tabla__num">{{ fila.mejorNota }}</td>
                <td class="tabla__num">{{ fila.evaluaciones }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--sm btn--primario"
                    [disabled]="!destino() || invitar.enviando()"
                    [title]="destino() ? '' : 'Elige primero una vacante'"
                    (click)="invitar.correr(fila)"
                  >
                    Invitar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (invitar.error(); as error) {
      <p class="campo__error" role="alert">{{ error }}</p>
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
    .destino {
      max-width: 420px;
      margin-bottom: var(--e-5);
    }
  `,
})
export class BancoDeTalento {
  readonly #reportes = inject(ReportesServicio);
  readonly #vacantes = inject(VacantesServicio);
  readonly #avisos = inject(Avisos);

  protected readonly talento = recurso(() => this.#reportes.bancoDeTalento());
  protected readonly vacantes = recurso(() => this.#vacantes.listar());
  protected readonly destino = signal('');

  /** Solo se invita a una vacante que admite entregas: ni borrador ni cerrada. */
  protected readonly vacantesAbiertas = computed(() =>
    (this.vacantes.datos() ?? []).filter((v) => v.estado === 'publicada'),
  );

  protected readonly invitar = accion(async (fila: FilaDeTalento) => {
    await this.#vacantes.invitarCandidato(this.destino(), fila.idCandidato);
    this.#avisos.exito(`${fila.alias} quedó invitado a la vacante.`);
  });
}
