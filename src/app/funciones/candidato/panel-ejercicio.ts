import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ENTREGA } from '../../compartido/dominio';
import { BytesPipe, DesdePipe } from '../../compartido/formato';
import { Estado } from '../../compartido/ui/basicos';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import { LIMITES, type Criterio, type Entrega } from '../../nucleo/api/modelos';
import { accion } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Un ejercicio de la prueba, con sus intentos y su zona de entrega.
 *
 * Tres cosas tienen que estar siempre a la vista, porque son las tres que el
 * candidato puede perder por error: cuántos intentos le quedan, qué formatos
 * se admiten y en qué estado quedó lo que ya envió.
 */
@Component({
  selector: 'app-panel-ejercicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BytesPipe, DesdePipe, Estado],
  template: `
    <article class="panel ejercicio">
      <header class="fila fila--entre">
        <div class="pila pila--sm">
          <span class="micro">ejercicio {{ orden() }}</span>
          <h2>{{ titulo() }}</h2>
        </div>
        <span
          class="chip"
          [class.chip--exito]="restantes() > 0"
          [class.chip--peligro]="restantes() === 0"
        >
          {{ restantes() }} de {{ intentosPermitidos() }} intentos
        </span>
      </header>

      @if (enunciado()) {
        <p class="enunciado">{{ enunciado() }}</p>
      } @else {
        <p class="aviso-enunciado">
          No se pudo cargar el enunciado de este ejercicio. Recarga la página; si sigue igual,
          escríbele a la empresa antes de entregar.
        </p>
      }

      @if (criterios().length > 0) {
        <details class="rubrica">
          <summary class="micro">Cómo se califica · {{ criterios().length }} criterios</summary>
          <ul>
            @for (criterio of criterios(); track criterio.nombre) {
              <li>
                <div class="fila fila--entre">
                  <strong>{{ criterio.nombre }}</strong>
                  <span class="micro">{{ criterio.peso }}%</span>
                </div>
                <p class="micro">{{ criterio.descripcion }}</p>
              </li>
            }
          </ul>
        </details>
      }

      <!-- ------------------------------------------------ Intentos -->
      @if (entregas().length > 0) {
        <ol class="intentos">
          @for (entrega of entregas(); track entrega.id) {
            <li>
              <span class="numero">#{{ entrega.numeroIntento }}</span>
              <div class="datos">
                <p class="nombre" [title]="entrega.archivoNombre">{{ entrega.archivoNombre }}</p>
                <p class="micro">
                  {{ entrega.archivoBytes | bytes }} · {{ entrega.creadaEn | desde }}
                </p>
              </div>
              <ui-estado [p]="presentacion(entrega)" />
            </li>
          }
        </ol>
      }

      <!-- ------------------------------------------------ Entrega -->
      @if (restantes() === 0) {
        <p class="agotado">
          Usaste todos tus intentos en este ejercicio. Tu mejor resultado es el que cuenta en el
          ranking.
        </p>
      } @else if (!admiteEntregas()) {
        <p class="agotado">Esta vacante ya no admite entregas.</p>
      } @else {
        <div
          class="zona"
          [class.zona--encima]="encima()"
          [class.zona--error]="!!problema()"
          (dragover)="$event.preventDefault(); encima.set(true)"
          (dragleave)="encima.set(false)"
          (drop)="soltar($event)"
        >
          <input
            #entrada
            type="file"
            class="solo-lectores"
            [id]="'archivo-' + idEjercicio()"
            [accept]="aceptados"
            (change)="elegir($any($event.target).files?.[0])"
          />

          @if (archivo(); as seleccionado) {
            <p class="nombre">{{ seleccionado.name }}</p>
            <p class="micro">{{ seleccionado.size | bytes }}</p>
          } @else {
            <p class="invitacion">Arrastra tu archivo aquí</p>
            <p class="micro">{{ formatos }} · máximo 25 MiB</p>
          }

          <div class="fila">
            <label class="btn btn--sm" [attr.for]="'archivo-' + idEjercicio()">
              {{ archivo() ? 'Cambiar archivo' : 'Elegir archivo' }}
            </label>
            @if (archivo()) {
              <button
                type="button"
                class="btn btn--sm btn--primario"
                [disabled]="enviar.enviando()"
                (click)="enviar.correr()"
              >
                {{
                  enviar.enviando()
                    ? 'Subiendo ' + progreso() + '%'
                    : 'Entregar intento ' + siguiente()
                }}
              </button>
            }
          </div>

          @if (enviar.enviando()) {
            <div
              class="barra"
              role="progressbar"
              [attr.aria-valuenow]="progreso()"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Progreso de la subida"
            >
              <div class="barra__relleno" [style.width.%]="progreso()"></div>
            </div>
          }

          @if (problema() || enviar.error(); as error) {
            <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
          }
        </div>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .ejercicio {
      display: grid;
      gap: var(--e-4);
    }
    h2 {
      font-size: var(--t-3);
    }
    .enunciado {
      white-space: pre-wrap;
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .aviso-enunciado {
      padding: var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie-viva);
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .rubrica {
      padding: var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
    }
    .rubrica summary {
      cursor: pointer;
    }
    .rubrica ul {
      display: grid;
      gap: var(--e-3);
      margin: var(--e-3) 0 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .intentos {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .intentos li {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      padding: var(--e-3);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
    }
    .numero {
      font-family: var(--fuente-mono);
      font-size: var(--t-micro);
      color: var(--c-texto-tenue);
    }
    .datos {
      flex: 1;
      min-width: 0;
    }
    .nombre {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--t-menor);
    }
    .zona {
      display: grid;
      gap: var(--e-3);
      justify-items: center;
      padding: var(--e-5);
      border: 1px dashed var(--c-borde-fuerte);
      border-radius: var(--r-lg);
      text-align: center;
      transition:
        border-color var(--mov) var(--curva),
        background var(--mov) var(--curva);
    }
    .zona--encima {
      border-color: var(--c-acento);
      background: var(--c-acento-tenue);
    }
    .zona--error {
      border-color: var(--c-peligro);
    }
    .invitacion {
      font-family: var(--fuente-display);
      font-size: var(--t-3);
      font-weight: var(--peso-display);
    }
    .zona .barra {
      width: 100%;
    }
    .agotado {
      padding: var(--e-3);
      border-radius: var(--r-md);
      background: var(--c-neutro-tenue);
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
  `,
})
export class PanelEjercicio {
  readonly idVacante = input.required<string>();
  readonly idEjercicio = input.required<string>();
  readonly orden = input.required<number>();
  readonly titulo = input('Ejercicio');
  readonly enunciado = input<string | null>(null);
  readonly criterios = input<readonly Criterio[]>([]);
  readonly intentosPermitidos = input.required<number>();
  readonly entregas = input.required<readonly Entrega[]>();
  readonly admiteEntregas = input(true);
  readonly entregado = output<Entrega>();

  readonly #servicio = inject(EntregasServicio);
  readonly #avisos = inject(Avisos);

  protected readonly archivo = signal<File | null>(null);
  protected readonly problema = signal<string | null>(null);
  protected readonly progreso = signal(0);
  protected readonly encima = signal(false);
  protected readonly formatos = LIMITES.extensiones.join(', ');
  protected readonly aceptados = LIMITES.extensiones.map((e) => `.${e}`).join(',');

  protected readonly restantes = computed(() =>
    Math.max(0, this.intentosPermitidos() - this.entregas().length),
  );
  protected readonly siguiente = computed(() => this.entregas().length + 1);
  protected readonly presentacion = (entrega: Entrega) => ENTREGA[entrega.estado];

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.encima.set(false);
    this.elegir(evento.dataTransfer?.files?.[0]);
  }

  protected elegir(archivo: File | undefined | null): void {
    if (!archivo) return;
    const problema = this.#servicio.revisarArchivo(archivo);
    this.problema.set(problema);
    this.archivo.set(problema ? null : archivo);
  }

  protected readonly enviar = accion(async () => {
    const archivo = this.archivo();
    if (!archivo) return;
    this.progreso.set(0);
    const entrega = await this.#servicio.entregar(
      this.idVacante(),
      this.idEjercicio(),
      archivo,
      (porcentaje) => this.progreso.set(porcentaje),
    );
    this.archivo.set(null);
    this.#avisos.exito(
      'Entrega recibida. Se está evaluando: puedes cerrar esta página sin perder nada.',
    );
    this.entregado.emit(entrega);
  });
}
