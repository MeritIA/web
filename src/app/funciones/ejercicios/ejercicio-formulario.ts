import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import {
  type AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { EjerciciosServicio } from '../../nucleo/api/ejercicios.servicio';
import { LIMITES, type Criterio } from '../../nucleo/api/modelos';
import { accion, recursoPor } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';

/** La regla que hace comparables las notas entre ejercicios. */
const sumanCien = (control: AbstractControl): ValidationErrors | null => {
  const suma = (control as FormArray).controls.reduce(
    (total, criterio) => total + Number(criterio.get('peso')?.value ?? 0),
    0,
  );
  return suma === LIMITES.pesoTotalRubrica ? null : { pesoTotal: { suma } };
};

const CRITERIO_VACIO: Criterio = { nombre: '', descripcion: '', peso: 0, escalaMaxima: 5 };

/**
 * Crear un ejercicio, o versionar uno existente.
 *
 * Es el mismo formulario porque es la misma decisión —enunciado y rúbrica—, y
 * tenerlo dos veces garantizaría que la validación de pesos se arreglara en
 * uno y no en el otro. Lo que cambia entre modos es el título, el endpoint y
 * si se piden los datos de cabecera.
 */
@Component({
  selector: 'app-ejercicio-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Campo],
  template: `
    <nav class="migas">
      <a routerLink="/ejercicios">Ejercicios</a>
      <span>/ {{ versionando() ? 'Nueva versión' : 'Nuevo' }}</span>
    </nav>

    <header class="pila pila--sm">
      <span class="micro">{{
        versionando() ? 'las versiones anteriores no se tocan' : 'banco de ejercicios'
      }}</span>
      <h1>{{ versionando() ? 'Nueva versión del ejercicio' : 'Nuevo ejercicio' }}</h1>
      <p class="lectura ayuda">
        @if (versionando()) {
          Las calificaciones ya emitidas siguen mostrando el enunciado y los pesos con los que se
          calcularon. Corregir un ejercicio es versionarlo, nunca editarlo.
        } @else {
          Un ejercicio es un enunciado más una rúbrica. La rúbrica es lo que permite calificar a
          todos con el mismo estándar.
        }
      </p>
    </header>

    <form
      class="pila pila--lg formulario"
      [formGroup]="formulario"
      (ngSubmit)="enviar()"
      novalidate
    >
      @if (!versionando()) {
        <section class="panel pila">
          <h2 class="micro">Identificación</h2>
          <div class="dos">
            <ui-campo etiqueta="Título" para="titulo" [control]="formulario.controls.titulo">
              <input
                id="titulo"
                type="text"
                class="control"
                formControlName="titulo"
                maxlength="160"
                placeholder="API REST con control de concurrencia"
              />
            </ui-campo>
            <ui-campo
              etiqueta="Tecnología"
              para="tecnologia"
              opcional
              [control]="formulario.controls.tecnologia"
            >
              <input
                id="tecnologia"
                type="text"
                class="control"
                formControlName="tecnologia"
                maxlength="80"
                placeholder="Node · PostgreSQL"
              />
            </ui-campo>
          </div>
        </section>
      }

      <section class="panel pila">
        <h2 class="micro">Enunciado</h2>
        <ui-campo
          etiqueta="Qué debe resolver el candidato"
          para="enunciado"
          ayuda="Sé concreto en el entregable y en las restricciones: la IA califica contra la rúbrica, no adivina intenciones."
          [control]="formulario.controls.enunciado"
        >
          <textarea id="enunciado" class="control" formControlName="enunciado" rows="10"></textarea>
        </ui-campo>

        <ui-campo
          etiqueta="Tiempo límite (minutos)"
          para="duracion"
          opcional
          ayuda="Si lo pones, el candidato inicia el ejercicio y tiene ese tiempo, medido por el servidor. Sin valor: sin límite."
          [control]="formulario.controls.duracionMinutos"
        >
          <input
            id="duracion"
            type="number"
            class="control"
            formControlName="duracionMinutos"
            min="1"
            max="600"
          />
        </ui-campo>

        @if (versionando()) {
          <ui-campo
            etiqueta="Motivo del cambio"
            para="motivo"
            opcional
            ayuda="Queda en el historial del ejercicio."
            [control]="formulario.controls.motivoDelCambio"
          >
            <input id="motivo" type="text" class="control" formControlName="motivoDelCambio" />
          </ui-campo>
        }
      </section>

      <section class="panel pila">
        <header class="panel__cab">
          <div class="pila pila--sm">
            <span class="micro">rúbrica</span>
            <h2 class="titulo-seccion">Criterios de calificación</h2>
          </div>
          <div class="fila">
            <span
              class="chip"
              [class.chip--exito]="suma() === 100"
              [class.chip--aviso]="suma() !== 100"
              role="status"
            >
              Pesos: {{ suma() }} / 100
            </span>
            <button type="button" class="btn btn--sm" (click)="anadirCriterio()">
              Añadir criterio
            </button>
          </div>
        </header>

        <div class="barra" aria-hidden="true">
          <div
            class="barra__relleno"
            [style.width.%]="progresoPeso()"
            [style.background]="suma() === 100 ? 'var(--c-acento)' : 'var(--c-aviso)'"
          ></div>
        </div>

        <ol class="criterios" formArrayName="criterios">
          @for (grupo of criterios.controls; track $index; let i = $index) {
            <li class="criterio" [formGroupName]="i">
              <div class="criterio__cab">
                <span class="indice">{{ i + 1 }}</span>
                <ui-campo
                  etiqueta="Nombre"
                  [para]="'criterio-' + i"
                  [control]="grupo.get('nombre')"
                >
                  <input
                    [id]="'criterio-' + i"
                    type="text"
                    class="control"
                    formControlName="nombre"
                    placeholder="Corrección funcional"
                  />
                </ui-campo>
                <ui-campo etiqueta="Peso %" [para]="'peso-' + i" [control]="grupo.get('peso')">
                  <input
                    [id]="'peso-' + i"
                    type="number"
                    class="control"
                    formControlName="peso"
                    min="1"
                    max="100"
                  />
                </ui-campo>
                <ui-campo
                  etiqueta="Escala"
                  [para]="'escala-' + i"
                  [control]="grupo.get('escalaMaxima')"
                >
                  <input
                    [id]="'escala-' + i"
                    type="number"
                    class="control"
                    formControlName="escalaMaxima"
                    min="1"
                    max="100"
                  />
                </ui-campo>
                <button
                  type="button"
                  class="btn btn--sm quitar"
                  [disabled]="criterios.length === 1"
                  (click)="quitarCriterio(i)"
                  [attr.aria-label]="'Quitar criterio ' + (i + 1)"
                >
                  ✕
                </button>
              </div>

              <ui-campo
                etiqueta="Qué se evalúa"
                [para]="'descripcion-' + i"
                ayuda="Esta descripción es lo que el modelo usa para decidir el puntaje y citar evidencia."
                [control]="grupo.get('descripcion')"
              >
                <textarea
                  [id]="'descripcion-' + i"
                  class="control"
                  formControlName="descripcion"
                  rows="2"
                ></textarea>
              </ui-campo>
            </li>
          }
        </ol>

        @if (criterios.errors?.['pesoTotal'] && criterios.touched) {
          <p class="campo__error" role="alert">
            <span aria-hidden="true">▲</span> Los pesos suman {{ suma() }}. Deben sumar exactamente
            100 para que la nota final sea comparable entre ejercicios.
          </p>
        }
      </section>

      @if (guardar.error(); as error) {
        <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
      }

      <div class="fila fila--entre">
        <a routerLink="/ejercicios" class="btn btn--fantasma">Cancelar</a>
        <button type="submit" class="btn btn--primario" [disabled]="guardar.enviando()">
          {{
            guardar.enviando()
              ? 'Guardando…'
              : versionando()
                ? 'Publicar versión'
                : 'Crear ejercicio'
          }}
        </button>
      </div>
    </form>
  `,
  styles: `
    h1 {
      font-size: var(--t-1);
    }
    .titulo-seccion {
      font-size: var(--t-3);
    }
    .ayuda {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .formulario {
      max-width: 860px;
      margin-top: var(--e-5);
    }
    .dos {
      display: grid;
      gap: var(--e-4);
      grid-template-columns: 2fr 1fr;
    }
    .criterios {
      display: grid;
      gap: var(--e-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .criterio {
      display: grid;
      gap: var(--e-3);
      padding: var(--e-4);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
      background: var(--c-superficie-alta);
    }
    .criterio__cab {
      display: grid;
      gap: var(--e-3);
      align-items: end;
      grid-template-columns: auto 1fr 90px 90px auto;
    }
    .quitar {
      align-self: end;
      margin-bottom: 1px;
      min-width: 40px;
    }
    .indice {
      font-family: var(--fuente-display);
      font-size: var(--t-2);
      font-weight: var(--peso-display);
      color: var(--c-texto-tenue);
      line-height: 2.2;
    }
    @media (max-width: 760px) {
      .dos,
      .criterio__cab {
        grid-template-columns: 1fr;
      }
      .quitar {
        align-self: end;
        margin-bottom: 1px;
        min-width: 40px;
      }
      .indice {
        display: none;
      }
    }
  `,
})
export class EjercicioFormulario {
  /** Presente solo en la ruta de versionado. */
  readonly id = input<string>();

  readonly #servicio = inject(EjerciciosServicio);
  readonly #router = inject(Router);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly versionando = computed(() => !!this.id());

  protected readonly formulario = this.#fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(160)]],
    tecnologia: [''],
    enunciado: ['', [Validators.required, Validators.minLength(30)]],
    duracionMinutos: [null as number | null, [Validators.min(1), Validators.max(600)]],
    motivoDelCambio: [''],
    criterios: this.#fb.array([this.#grupoDeCriterio(CRITERIO_VACIO)], { validators: sumanCien }),
  });

  protected get criterios(): FormArray {
    return this.formulario.controls.criterios;
  }

  /** La suma se recalcula en cada ciclo: es barata y nunca queda obsoleta. */
  protected suma(): number {
    return this.criterios.controls.reduce(
      (total, criterio) => total + Number(criterio.get('peso')?.value ?? 0),
      0,
    );
  }

  protected progresoPeso(): number {
    return Math.min(100, this.suma());
  }

  /** En modo versión, se parte de la rúbrica vigente en vez de la hoja en blanco. */
  protected readonly ejercicio = recursoPor(this.id, (id) =>
    id ? this.#servicio.obtener(id) : Promise.resolve(undefined),
  );

  constructor() {
    effect(() => {
      const ultima = this.ejercicio.datos()?.versiones?.[0];
      if (!ultima) return;
      this.formulario.controls.titulo.clearValidators();
      this.formulario.controls.enunciado.setValue(ultima.enunciado);
      this.criterios.clear();
      for (const criterio of ultima.criterios) this.criterios.push(this.#grupoDeCriterio(criterio));
    });
  }

  protected anadirCriterio(): void {
    this.criterios.push(this.#grupoDeCriterio(CRITERIO_VACIO));
  }

  protected quitarCriterio(indice: number): void {
    this.criterios.removeAt(indice);
  }

  protected readonly guardar = accion(async () => {
    const valores = this.formulario.getRawValue();
    const criterios = valores.criterios as Criterio[];

    if (this.versionando()) {
      await this.#servicio.nuevaVersion(this.id()!, {
        enunciado: valores.enunciado,
        criterios,
        ...(valores.duracionMinutos ? { duracionMinutos: valores.duracionMinutos } : {}),
        ...(valores.motivoDelCambio ? { motivoDelCambio: valores.motivoDelCambio } : {}),
      });
      this.#avisos.exito('Nueva versión publicada. Las notas anteriores no cambian.');
      await this.#router.navigate(['/ejercicios', this.id()]);
      return;
    }

    const creado = await this.#servicio.crear({
      titulo: valores.titulo,
      enunciado: valores.enunciado,
      criterios,
      ...(valores.duracionMinutos ? { duracionMinutos: valores.duracionMinutos } : {}),
      ...(valores.tecnologia ? { tecnologia: valores.tecnologia } : {}),
    });
    this.#avisos.exito('Ejercicio creado con su versión 1.');
    await this.#router.navigate(['/ejercicios', creado.id]);
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.criterios.markAsTouched();
      return;
    }
    void this.guardar.correr();
  }

  #grupoDeCriterio(criterio: Criterio) {
    return this.#fb.group({
      nombre: [criterio.nombre, [Validators.required, Validators.maxLength(120)]],
      descripcion: [criterio.descripcion, [Validators.required, Validators.minLength(10)]],
      peso: [criterio.peso, [Validators.required, Validators.min(1), Validators.max(100)]],
      escalaMaxima: [
        criterio.escalaMaxima,
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
    });
  }
}
