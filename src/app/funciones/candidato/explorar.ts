import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MODALIDAD, POSTULACION } from '../../compartido/dominio';
import { Estado, EstadoRecurso } from '../../compartido/ui/basicos';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import type { Postulacion, VacanteAbierta } from '../../nucleo/api/modelos';
import { PostulacionesServicio } from '../../nucleo/api/postulaciones.servicio';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

type Vista = 'todas' | 'postuladas';

/**
 * Explorar vacantes abiertas y postularse.
 *
 * Postularse no da acceso al reto: lo da la invitación, que la empresa crea al
 * aceptar. Quien ya fue invitado por otra vía entra directo a su prueba.
 */
@Component({
  selector: 'app-explorar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputText, DatePipe, RouterLink, Estado, EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">vacantes abiertas</span>
      <h1>Explorar</h1>
      <p class="lectura ayuda">
        Mira qué procesos hay abiertos y postúlate a los que te interesen. Si la empresa te invita,
        la prueba aparece en <a routerLink="/mis-pruebas">Mis pruebas</a>.
      </p>
    </header>

    <div class="herramientas">
      <div class="campo">
        <label class="campo__etiqueta" for="buscar">Buscar</label>
        <input
          id="buscar"
          type="search"
          pInputText
          placeholder="Cargo, empresa o tecnología"
          [value]="texto()"
          (input)="texto.set($any($event.target).value)"
        />
      </div>

      <div class="campo">
        <label class="campo__etiqueta" for="modalidad">Modalidad</label>
        <select
          id="modalidad"
          pInputText
          [value]="modalidad()"
          (change)="modalidad.set($any($event.target).value)"
        >
          <option value="">Cualquiera</option>
          <option value="remoto">Remoto</option>
          <option value="hibrido">Híbrido</option>
          <option value="presencial">Presencial</option>
        </select>
      </div>

      <div class="fila pestanas" role="group" aria-label="Qué vacantes ver">
        <button
          type="button"
          pButton
          severity="secondary"
          size="small"
          [class.btn--primario]="vista() === 'todas'"
          [attr.aria-pressed]="vista() === 'todas'"
          (click)="vista.set('todas')"
        >
          Todas
        </button>
        <button
          type="button"
          pButton
          severity="secondary"
          size="small"
          [class.btn--primario]="vista() === 'postuladas'"
          [attr.aria-pressed]="vista() === 'postuladas'"
          (click)="vista.set('postuladas')"
        >
          Mis postulaciones ({{ postulaciones.datos()?.length ?? 0 }})
        </button>
      </div>
    </div>

    <ui-recurso
      [cargando]="abiertas.cargando() || postulaciones.cargando()"
      [error]="abiertas.error() || postulaciones.error()"
      [vacio]="!abiertas.cargando() && !postulaciones.cargando() && visibles().length === 0"
      [tituloVacio]="
        vista() === 'postuladas' ? 'Aún no te has postulado' : 'Nada coincide con tu búsqueda'
      "
      [textoVacio]="
        vista() === 'postuladas'
          ? 'Cuando te postules a una vacante la verás aquí con su estado.'
          : 'Prueba con otra palabra o quita el filtro de modalidad.'
      "
      (reintentar)="recargar()"
    />

    <div class="rejilla rejilla--ancha">
      @for (vacante of visibles(); track vacante.id) {
        <article class="panel tarjeta">
          <div class="fila fila--entre">
            <span class="micro">{{ vacante.empresa }} · {{ vacante.sector }}</span>
            @if (postulacionDe(vacante.id); as p) {
              <ui-estado [p]="estado(p)" />
            }
          </div>

          <h2>{{ vacante.titulo }}</h2>
          <p class="micro">
            {{ vacante.ubicacion || 'Sin ubicación' }}
            @if (vacante.modalidad; as modalidad) {
              · {{ modalidades[modalidad] }}
            }
          </p>

          <p class="descripcion" [class.descripcion--abierta]="abierta() === vacante.id">
            {{ vacante.descripcion }}
          </p>

          <ul class="etiquetas" aria-label="Tecnologías">
            @for (tecnologia of vacante.tecnologias; track tecnologia) {
              <li class="chip chip--limpio">{{ tecnologia }}</li>
            }
          </ul>

          <dl class="cifras">
            <div>
              <dt class="micro">Ejercicios</dt>
              <dd>{{ vacante.ejercicios }}</dd>
            </div>
            <div>
              <dt class="micro" title="Intentos por ejercicio">Intentos</dt>
              <dd>{{ vacante.intentosPorEjercicio }}</dd>
            </div>
            <div>
              <dt class="micro">Cierre estimado</dt>
              <dd class="fecha">
                {{
                  vacante.cierreEstimado ? (vacante.cierreEstimado | date: 'd MMM y') : 'sin fecha'
                }}
              </dd>
            </div>
          </dl>

          @if (postulacionDe(vacante.id)?.motivoDelRechazo; as motivo) {
            <p class="motivo" role="note">
              <span class="micro"
                >Lo que respondió la empresa
                @if (postulacionDe(vacante.id)?.decididaEn; as cuando) {
                  · {{ cuando | date: 'd MMM y' }}
                }</span
              ><br />{{ motivo }}
            </p>
          }

          <div class="fila fila--entre acciones">
            <button
              type="button"
              pButton
              [text]="true"
              severity="secondary"
              size="small"
              (click)="alternar(vacante.id)"
            >
              {{ abierta() === vacante.id ? 'Ver menos' : 'Ver más' }}
            </button>

            @if (vacante.yaInvitado) {
              <a [routerLink]="['/mis-pruebas', vacante.id]" pButton> Hacer la prueba </a>
            } @else if (postulacionDe(vacante.id); as p) {
              @if (p.estado === 'en_revision') {
                <button
                  type="button"
                  pButton
                  severity="secondary"
                  size="small"
                  [disabled]="retirar.enviando()"
                  (click)="pedirRetirar(vacante)"
                >
                  Retirar postulación
                </button>
              }
            } @else {
              <button
                type="button"
                pButton
                [disabled]="postular.enviando()"
                (click)="postular.correr(vacante)"
              >
                {{ postular.enviando() ? 'Enviando…' : 'Postularme' }}
              </button>
            }
          </div>
        </article>
      }
    </div>

    @if (postular.error() || retirar.error(); as error) {
      <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
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
    .herramientas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-4);
      align-items: end;
      margin-bottom: var(--e-5);
    }
    .herramientas .campo:first-child {
      flex: 1 1 260px;
    }
    .pestanas {
      margin-left: auto;
    }
    @media (max-width: 560px) {
      .herramientas .campo,
      .herramientas .campo select {
        flex: 1 1 100%;
        width: 100%;
      }
      .pestanas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
        margin-left: 0;
      }
    }
    .tarjeta {
      display: grid;
      gap: var(--e-3);
      align-content: start;
    }
    .tarjeta h2 {
      font-size: var(--t-3);
    }
    .descripcion {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .descripcion--abierta {
      display: block;
    }
    .etiquetas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
      gap: var(--e-4);
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
    .cifras .fecha {
      font-size: var(--t-menor);
      font-family: var(--fuente-mono);
      font-weight: normal;
    }
    .motivo {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    .acciones {
      padding-top: var(--e-2);
    }
  `,
})
export class Explorar {
  readonly #servicio = inject(PostulacionesServicio);
  readonly #avisos = inject(Avisos);
  readonly #confirmaciones = inject(Confirmaciones);

  protected readonly abiertas = recurso(() => this.#servicio.abiertas());
  protected readonly postulaciones = recurso(() => this.#servicio.mias());

  protected readonly texto = signal('');
  protected readonly modalidad = signal('');
  protected readonly vista = signal<Vista>('todas');
  protected readonly abierta = signal<string | null>(null);

  protected readonly visibles = computed(() => {
    const buscado = this.texto().trim().toLowerCase();
    const mias = new Set((this.postulaciones.datos() ?? []).map((p) => p.idVacante));
    return (this.abiertas.datos() ?? []).filter((v) => {
      if (this.vista() === 'postuladas' && !mias.has(v.id) && !v.yaInvitado) return false;
      if (this.modalidad() && v.modalidad !== this.modalidad()) return false;
      if (!buscado) return true;
      return [v.titulo, v.empresa, ...v.tecnologias].some((t) => t.toLowerCase().includes(buscado));
    });
  });

  protected readonly modalidades = MODALIDAD;
  protected readonly estado = (p: Postulacion) => POSTULACION[p.estado];

  protected postulacionDe(idVacante: string): Postulacion | undefined {
    return this.postulaciones.datos()?.find((p) => p.idVacante === idVacante);
  }

  protected alternar(id: string): void {
    this.abierta.update((actual) => (actual === id ? null : id));
  }

  protected recargar(): void {
    void this.abiertas.recargar();
    void this.postulaciones.recargar();
  }

  protected readonly postular = accion(async (vacante: VacanteAbierta) => {
    await this.#servicio.postular(vacante.id);
    await this.postulaciones.recargar();
    this.#avisos.exito(`Te postulaste a «${vacante.titulo}». Te avisaremos si te invitan.`);
  });

  protected async pedirRetirar(vacante: VacanteAbierta): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Retirar tu postulación?',
      texto: `Dejarás de aparecer como postulado a «${vacante.titulo}». Puedes volver a postularte mientras siga abierta.`,
      accion: 'Retirar',
      peligrosa: true,
    });
    if (confirmado) void this.retirar.correr(vacante);
  }

  protected readonly retirar = accion(async (vacante: VacanteAbierta) => {
    await this.#servicio.retirar(vacante.id);
    await this.postulaciones.recargar();
    this.#avisos.info('Postulación retirada.');
  });
}
