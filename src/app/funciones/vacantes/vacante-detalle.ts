import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ENTREGA, POSTULACION, VACANTE } from '../../compartido/dominio';
import { CortoPipe } from '../../compartido/formato';
import { Chip, Estado, EstadoRecurso, Panel } from '../../compartido/ui/basicos';
import { Campo } from '../../compartido/ui/campo';
import { Confirmaciones } from '../../compartido/ui/confirmacion';
import { EjerciciosServicio } from '../../nucleo/api/ejercicios.servicio';
import { EntregasServicio } from '../../nucleo/api/entregas.servicio';
import { NotificacionesServicio } from '../../nucleo/api/notificaciones.servicio';
import type { Postulante, Vacante } from '../../nucleo/api/modelos';
import { PostulacionesServicio } from '../../nucleo/api/postulaciones.servicio';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { accion, recurso, recursoPor } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

/**
 * Centro de mando de una vacante.
 *
 * La pantalla se organiza alrededor de lo único que importa aquí: qué falta
 * para poder publicar. Las reglas del backend (sin ejercicios no se publica,
 * los ejercicios solo se tocan en borrador, una cerrada no vuelve) se
 * muestran como estado de la interfaz, no como errores a posteriori.
 */
@Component({
  selector: 'app-vacante-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    Chip,
    Estado,
    EstadoRecurso,
    Panel,
    Campo,
    CortoPipe,
  ],
  template: `
    <nav class="migas"><a routerLink="/vacantes">Vacantes</a> <span>/ Detalle</span></nav>

    <ui-recurso
      [cargando]="vacante.cargando()"
      [error]="vacante.error()"
      [filas]="4"
      (reintentar)="vacante.recargar()"
    />

    @if (vacante.datos(); as v) {
      <header class="cabecera">
        <div class="pila pila--sm">
          <div class="fila">
            <ui-estado [p]="presentacion(v)" />
            @if (v.publicadaEn) {
              <span class="micro">publicada {{ v.publicadaEn | date: 'd MMM y' }}</span>
            }
          </div>
          <h1>{{ v.titulo }}</h1>
          @if (v.ubicacion) {
            <p class="micro">{{ v.ubicacion }}</p>
          }
          @if (v.cierreEstimado || v.finalistasAEvaluar) {
            <p class="micro">
              @if (v.finalistasAEvaluar) {
                {{ v.finalistasAEvaluar }} finalistas por evaluar
              }
              @if (v.cierreEstimado) {
                · cierre estimado {{ v.cierreEstimado | date: 'd MMM y' }}
              }
            </p>
          }
        </div>

        <div class="fila">
          @if (v.estado !== 'borrador') {
            <a [routerLink]="['/vacantes', v.id, 'reporte']" class="btn">Ver ranking</a>
          }
          @if (v.estado === 'borrador') {
            <button
              type="button"
              class="btn btn--primario"
              [disabled]="!puedePublicar() || publicar.enviando()"
              [title]="puedePublicar() ? '' : 'Asocia al menos un ejercicio para poder publicar'"
              (click)="pedirPublicar()"
            >
              Publicar
            </button>
          }
          @if (v.estado !== 'cerrada') {
            <button type="button" class="btn btn--peligro" (click)="pedirCerrar()">Cerrar</button>
          }
        </div>
      </header>

      <p class="descripcion lectura">{{ v.descripcion }}</p>

      @if (v.estado === 'borrador') {
        <section class="checklist panel" aria-labelledby="checklist-titulo">
          <h2 id="checklist-titulo" class="micro">Para poder publicar</h2>
          <ul>
            <li [class.ok]="(v.ejercicios?.length ?? 0) > 0">
              <span aria-hidden="true">{{ (v.ejercicios?.length ?? 0) > 0 ? '✓' : '○' }}</span>
              Al menos un ejercicio asociado
            </li>
            <li [class.ok]="(v.candidatos?.length ?? 0) > 0">
              <span aria-hidden="true">{{ (v.candidatos?.length ?? 0) > 0 ? '✓' : '○' }}</span>
              Candidatos invitados
              <em>(se pueden invitar también después de publicar)</em>
            </li>
          </ul>
        </section>
      }

      <div class="columnas">
        <!-- ------------------------------------------------ Ejercicios -->
        <ui-panel antetitulo="prueba técnica" titulo="Ejercicios de la vacante">
          @if (v.estado === 'borrador') {
            <span acciones class="micro">se editan solo en borrador</span>
          }

          @if ((v.ejercicios?.length ?? 0) === 0) {
            <p class="vacio-breve">Ninguno todavía.</p>
          } @else {
            <ol class="lista-simple">
              @for (asociado of v.ejercicios ?? []; track asociado.id) {
                <li>
                  <a [routerLink]="['/ejercicios', asociado.idEjercicio]">{{
                    nombreDeEjercicio(asociado.idEjercicio)
                  }}</a>
                  <span class="micro">#{{ asociado.idEjercicio | corto }}</span>
                </li>
              }
            </ol>
          }

          @if (v.estado === 'borrador') {
            <div class="separador"></div>
            <fieldset class="selector">
              <legend class="micro">Elegir del banco</legend>
              @for (ejercicio of banco.datos() ?? []; track ejercicio.id) {
                <label class="opcion">
                  <input
                    type="checkbox"
                    [checked]="seleccionados().has(ejercicio.id)"
                    (change)="alternarEjercicio(ejercicio.id)"
                  />
                  <span>{{ ejercicio.titulo }}</span>
                  @if (ejercicio.tecnologia) {
                    <span class="micro">{{ ejercicio.tecnologia }}</span>
                  }
                </label>
              } @empty {
                <p class="vacio-breve">
                  El banco está vacío. <a routerLink="/ejercicios/nuevo">Crea un ejercicio</a>.
                </p>
              }
              <button
                type="button"
                class="btn btn--sm"
                [disabled]="guardarEjercicios.enviando() || !cambiaronEjercicios()"
                (click)="guardarEjercicios.correr()"
              >
                {{ guardarEjercicios.enviando() ? 'Guardando…' : 'Guardar selección' }}
              </button>
            </fieldset>
          }
        </ui-panel>

        <!-- ------------------------------------------------- Candidatos -->
        <ui-panel antetitulo="acceso" titulo="Candidatos invitados">
          @if ((v.candidatos?.length ?? 0) === 0) {
            <p class="vacio-breve">Sin invitaciones. Sin invitación no hay acceso ni entrega.</p>
          } @else {
            <ul class="lista-simple">
              @for (candidato of v.candidatos ?? []; track candidato.id) {
                <li>
                  <a [routerLink]="['/vacantes', v.id, 'candidatos', candidato.idCandidato]"
                    >Candidato #{{ candidato.idCandidato | corto }}</a
                  >
                  @if (candidato.contratadoEn) {
                    <span class="chip chip--exito">Contratado</span>
                  }
                </li>
              }
            </ul>
          }

          @if (v.estado !== 'cerrada') {
            <div class="separador"></div>
            <form class="pila pila--sm" [formGroup]="invitacion" (ngSubmit)="invitar.correr()">
              <ui-campo
                etiqueta="Identificador del candidato"
                para="idCandidato"
                ayuda="UUID de la cuenta del candidato, tal como lo entrega el registro."
                [control]="invitacion.controls.idCandidato"
              >
                <input
                  id="idCandidato"
                  type="text"
                  class="control"
                  formControlName="idCandidato"
                  placeholder="00000000-0000-4000-8000-000000000000"
                />
              </ui-campo>
              @if (invitar.error(); as error) {
                <p class="campo__error" role="alert">{{ error }}</p>
              }
              <button
                type="submit"
                class="btn btn--sm"
                [disabled]="invitacion.invalid || invitar.enviando()"
              >
                {{ invitar.enviando() ? 'Invitando…' : 'Invitar' }}
              </button>
            </form>
          }
        </ui-panel>
      </div>

      <!-- ------------------------------------------------- Postulantes -->
      @if (v.estado !== 'borrador') {
        <ui-panel antetitulo="quién quiere entrar" titulo="Postulantes">
          <ui-chip acciones tono="aviso">Simulado</ui-chip>

          <ui-recurso
            [cargando]="postulantes.cargando() && !postulantes.datos()"
            [error]="postulantes.error()"
            [vacio]="(postulantes.datos()?.length ?? 0) === 0 && !postulantes.cargando()"
            tituloVacio="Nadie se ha postulado todavía"
            textoVacio="Los candidatos que exploren y se postulen a esta vacante aparecerán aquí. Si aceptas a alguien, queda invitado de verdad."
            (reintentar)="postulantes.recargar()"
          />

          @if ((postulantes.datos()?.length ?? 0) > 0) {
            <ul class="lista-simple">
              @for (postulante of postulantes.datos() ?? []; track postulante.idCandidato) {
                <li>
                  <span>
                    Candidato #{{ postulante.idCandidato | corto }}
                    <span class="micro">· {{ postulante.creadaEn | date: 'd MMM, HH:mm' }}</span>
                  </span>
                  @if (postulante.estado === 'en_revision' && v.estado === 'publicada') {
                    <span class="fila">
                      <button
                        type="button"
                        class="btn btn--sm"
                        [disabled]="decidir.enviando()"
                        (click)="decidir.correr(postulante, 'rechazada')"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        class="btn btn--sm btn--primario"
                        [disabled]="decidir.enviando()"
                        (click)="decidir.correr(postulante, 'aceptada')"
                      >
                        Aceptar e invitar
                      </button>
                    </span>
                  } @else {
                    <ui-estado [p]="estadoPostulante(postulante)" />
                  }
                </li>
              }
            </ul>
          }
          @if (decidir.error(); as error) {
            <p class="campo__error" role="alert">{{ error }}</p>
          }
        </ui-panel>
      }

      <!-- ---------------------------------------------------- Entregas -->
      <ui-panel antetitulo="actividad" titulo="Entregas recibidas" plano>
        <button acciones type="button" class="btn btn--sm" (click)="entregas.recargar()">
          Actualizar
        </button>

        <ui-recurso
          [cargando]="entregas.cargando()"
          [error]="entregas.error()"
          [vacio]="(entregas.datos()?.length ?? 0) === 0 && !entregas.cargando()"
          tituloVacio="Sin entregas todavía"
          textoVacio="Aparecerán aquí en cuanto un candidato invitado envíe su solución."
          (reintentar)="entregas.recargar()"
        />

        @if ((entregas.datos()?.length ?? 0) > 0) {
          <div class="tabla-scroll">
            <table class="tabla">
              <caption class="solo-lectores">
                Entregas recibidas en esta vacante
              </caption>
              <thead>
                <tr>
                  <th scope="col">Candidato</th>
                  <th scope="col">Ejercicio</th>
                  <th scope="col">Intento</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Recibida</th>
                </tr>
              </thead>
              <tbody>
                @for (entrega of entregas.datos() ?? []; track entrega.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/vacantes', v.id, 'candidatos', entrega.idCandidato]"
                        >#{{ entrega.idCandidato | corto }}</a
                      >
                    </td>
                    <td>{{ nombreDeEjercicio(entrega.idEjercicio) }}</td>
                    <td class="tabla__num">{{ entrega.numeroIntento }}</td>
                    <td><ui-estado [p]="estadoEntrega(entrega.estado)" /></td>
                    <td>{{ entrega.creadaEn | date: 'd MMM, HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </ui-panel>

      <!-- ------------------------------------------------- Avisos -->
      @if (v.estado === 'cerrada') {
        <ui-panel antetitulo="cierre del proceso" titulo="Avisos a los candidatos">
          <button
            acciones
            type="button"
            class="btn btn--sm"
            [disabled]="reenviar.enviando()"
            (click)="reenviar.correr()"
          >
            {{ reenviar.enviando() ? 'Reenviando…' : 'Reenviar pendientes' }}
          </button>

          <ui-recurso
            [cargando]="avisosDeCierre.cargando()"
            [error]="avisosDeCierre.error()"
            [vacio]="(avisosDeCierre.datos()?.length ?? 0) === 0 && !avisosDeCierre.cargando()"
            tituloVacio="Sin avisos registrados"
            textoVacio="Al cerrar la vacante se avisa por correo a quienes participaron. Si no hay canal de correo, el aviso queda pendiente aquí."
            (reintentar)="avisosDeCierre.recargar()"
          />

          @if ((avisosDeCierre.datos()?.length ?? 0) > 0) {
            <ul class="lista-simple">
              @for (aviso of avisosDeCierre.datos() ?? []; track aviso.idCandidato + aviso.tipo) {
                <li>
                  <span>Candidato #{{ aviso.idCandidato | corto }} · {{ aviso.tipo }}</span>
                  <span
                    class="chip"
                    [class.chip--exito]="aviso.estado === 'enviada'"
                    [class.chip--peligro]="aviso.estado === 'fallida'"
                    [title]="aviso.ultimoError ?? ''"
                    >{{ estadoAviso(aviso.estado) }}</span
                  >
                </li>
              }
            </ul>
          }
        </ui-panel>
      }
    }
  `,
  styles: `
    .columnas ~ ui-panel {
      display: block;
      margin-top: var(--e-4);
    }
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: var(--e-4);
      align-items: start;
      justify-content: space-between;
    }
    h1 {
      font-size: var(--t-1);
    }
    .descripcion {
      margin: var(--e-4) 0 var(--e-5);
      color: var(--c-texto-suave);
      white-space: pre-wrap;
    }
    .checklist {
      margin-bottom: var(--e-5);
      padding: var(--e-4);
    }
    .checklist ul {
      display: grid;
      gap: var(--e-2);
      margin: var(--e-3) 0 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
    .checklist li span {
      display: inline-block;
      width: 1.4em;
      color: var(--c-texto-tenue);
    }
    .checklist li.ok {
      color: var(--c-texto);
    }
    .checklist li.ok span {
      color: var(--c-acento);
    }
    .checklist em {
      color: var(--c-texto-tenue);
      font-style: normal;
      font-size: var(--t-micro);
    }
    .lista-simple {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-menor);
    }
    .lista-simple li {
      display: flex;
      gap: var(--e-3);
      align-items: baseline;
      justify-content: space-between;
      padding-bottom: var(--e-2);
      border-bottom: 1px solid var(--c-borde);
    }
    .vacio-breve {
      color: var(--c-texto-tenue);
      font-size: var(--t-menor);
    }
    .separador {
      margin: var(--e-4) 0;
    }
    .selector {
      display: grid;
      gap: var(--e-2);
      border: 0;
      padding: 0;
      margin: 0;
      justify-items: start;
    }
    .opcion {
      display: flex;
      gap: var(--e-3);
      align-items: center;
      width: 100%;
      padding: var(--e-2);
      border-radius: var(--r-sm);
      font-size: var(--t-menor);
      cursor: pointer;
    }
    .opcion:hover {
      background: var(--c-superficie-viva);
    }
    .opcion input {
      accent-color: var(--c-acento);
      width: 16px;
      height: 16px;
    }
    .opcion span:nth-child(2) {
      flex: 1;
    }
  `,
})
export class VacanteDetalle {
  readonly id = input.required<string>();

  readonly #vacantes = inject(VacantesServicio);
  readonly #ejercicios = inject(EjerciciosServicio);
  readonly #entregas = inject(EntregasServicio);
  readonly #notificaciones = inject(NotificacionesServicio);
  readonly #postulaciones = inject(PostulacionesServicio);
  readonly #avisos = inject(Avisos);
  readonly #confirmaciones = inject(Confirmaciones);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly vacante = recursoPor(this.id, (id) => this.#vacantes.obtener(id));
  protected readonly entregas = recursoPor(this.id, (id) => this.#entregas.deVacante(id));
  protected readonly postulantes = recursoPor(this.id, (id) => this.#postulaciones.deVacante(id));
  protected readonly banco = recurso(() => this.#ejercicios.listar());
  protected readonly avisosDeCierre = recursoPor(this.id, (id) =>
    this.#notificaciones.deVacante(id),
  );

  /** Selección local de ejercicios; se envía entera porque el endpoint reemplaza. */
  protected readonly seleccionados = signal(new Set<string>());
  #asociadosAlCargar = new Set<string>();

  protected readonly invitacion = this.#fb.group({
    idCandidato: ['', [Validators.required, Validators.pattern(/^[0-9a-f-]{36}$/i)]],
  });

  protected readonly presentacion = (v: Vacante) => VACANTE[v.estado];
  protected readonly estadoEntrega = (estado: keyof typeof ENTREGA) => ENTREGA[estado];

  protected readonly puedePublicar = computed(
    () => (this.vacante.datos()?.ejercicios?.length ?? 0) > 0,
  );

  protected readonly cambiaronEjercicios = computed(() => {
    const actual = this.seleccionados();
    return (
      actual.size !== this.#asociadosAlCargar.size ||
      [...actual].some((id) => !this.#asociadosAlCargar.has(id))
    );
  });

  constructor() {
    // La selección parte de lo que ya tiene la vacante, para que el botón de
    // guardar solo se encienda cuando de verdad hay un cambio.
    // Una vacante publicada entra al catálogo simulado de «Explorar».
    effect(() => {
      const publicada = this.vacante.datos();
      if (publicada) this.#postulaciones.registrarVacante(publicada);
    });

    effect(() => {
      const asociados = new Set((this.vacante.datos()?.ejercicios ?? []).map((e) => e.idEjercicio));
      this.#asociadosAlCargar = asociados;
      this.seleccionados.set(new Set(asociados));
    });
  }

  protected nombreDeEjercicio(id: string): string {
    return this.banco.datos()?.find((e) => e.id === id)?.titulo ?? 'Ejercicio';
  }

  protected alternarEjercicio(id: string): void {
    this.seleccionados.update((actual) => {
      const copia = new Set(actual);
      if (!copia.delete(id)) copia.add(id);
      return copia;
    });
  }

  protected readonly guardarEjercicios = accion(async () => {
    const actualizada = await this.#vacantes.definirEjercicios(this.id(), [
      ...this.seleccionados(),
    ]);
    this.vacante.fijar(actualizada);
    this.#avisos.exito('Ejercicios actualizados.');
  });

  protected readonly invitar = accion(async () => {
    const { idCandidato } = this.invitacion.getRawValue();
    this.vacante.fijar(await this.#vacantes.invitarCandidato(this.id(), idCandidato));
    this.invitacion.reset();
    this.#avisos.exito('Candidato invitado. Ya puede ver la vacante y entregar.');
  });

  protected readonly publicar = accion(async () => {
    this.vacante.fijar(await this.#vacantes.publicar(this.id()));
    this.#avisos.exito('Vacante publicada. Los candidatos invitados ya pueden entregar.');
  });

  protected readonly cerrar = accion(async () => {
    this.vacante.fijar(await this.#vacantes.cerrar(this.id()));
    this.#avisos.info('Vacante cerrada. El proceso queda auditable tal como terminó.');
  });

  protected readonly estadoPostulante = (p: Postulante) => POSTULACION[p.estado];

  /** Aceptar invita de verdad en el backend; solo la postulación es simulada. */
  protected readonly decidir = accion(async (p: Postulante, estado: 'aceptada' | 'rechazada') => {
    if (estado === 'aceptada') {
      this.vacante.fijar(await this.#vacantes.invitarCandidato(this.id(), p.idCandidato));
    }
    await this.#postulaciones.decidir(this.id(), p.idCandidato, estado);
    await this.postulantes.recargar();
    this.#avisos.exito(
      estado === 'aceptada'
        ? 'Candidato aceptado e invitado a la prueba.'
        : 'Postulación rechazada.',
    );
  });

  protected readonly reenviar = accion(async () => {
    const r = await this.#notificaciones.reenviar(this.id());
    await this.avisosDeCierre.recargar();
    if (r.omitido) this.#avisos.info(r.omitido);
    else
      this.#avisos.exito(
        `Avisos: ${r.enviados} enviados, ${r.sinCanal} sin canal, ${r.fallidos} fallidos.`,
      );
  });

  protected estadoAviso = (e: string) => e.replace('_', ' ');

  protected async pedirPublicar(): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Publicar la vacante?',
      texto:
        'A partir de ahora los candidatos invitados pueden entregar, y los ejercicios y el número de intentos dejan de poder cambiarse.',
      accion: 'Publicar',
    });
    if (confirmado) void this.publicar.correr();
  }

  protected async pedirCerrar(): Promise<void> {
    const confirmado = await this.#confirmaciones.pedir({
      titulo: '¿Cerrar la vacante?',
      texto: 'No se reabre. Dejará de admitir entregas y no se podrá editar.',
      accion: 'Cerrar vacante',
      peligrosa: true,
    });
    if (confirmado) void this.cerrar.correr();
  }
}
