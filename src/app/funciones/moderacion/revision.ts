import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { ModeracionServicio } from '../../nucleo/api/moderacion.servicio';
import { accion, recursoPor } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';
import { ORIGEN } from './bandeja';
import { ButtonDirective } from 'primeng/button';
import { Textarea } from 'primeng/textarea';

/**
 * Revisión de un caso (C26): la evidencia, y una decisión binaria con
 * justificación obligatoria. La justificación la lee el candidato.
 */
@Component({
  selector: 'app-revision-de-caso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    Textarea,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    EstadoRecurso,
    Campo,
  ],
  template: `
    <nav class="migas"><a routerLink="/moderacion">Casos</a> <span>/ Revisión</span></nav>

    <ui-recurso
      [cargando]="detalle.cargando()"
      [error]="detalle.error()"
      [filas]="4"
      (reintentar)="detalle.recargar()"
    />

    @if (detalle.datos(); as d) {
      <header class="pila pila--sm cabecera">
        <span class="micro"
          >{{ origenes[d.caso.origen] }} · vence {{ d.caso.venceEn | date: 'd MMM, HH:mm' }}</span
        >
        <h1>{{ d.caso.alias }}</h1>
        <p class="micro">
          Nota {{ d.evidencia.notaFinal }} · riesgo de inyección «{{ d.evidencia.riesgo }}» (puntaje
          {{ d.evidencia.puntajeInyeccion }})
          @if (d.evidencia.descalificada) {
            · descalificada
          }
        </p>
      </header>

      @if (d.caso.explicacionDeLaDisputa; as explicacion) {
        <section class="panel bloque">
          <h2 class="micro">Lo que explica el candidato</h2>
          <p>{{ explicacion }}</p>
        </section>
      }

      <section class="panel bloque">
        <h2 class="micro">Banderas del análisis</h2>
        @if (d.evidencia.banderas.length === 0) {
          <p class="micro">Ninguna.</p>
        } @else {
          <ul>
            @for (b of d.evidencia.banderas; track b.codigo + b.archivo) {
              <li>
                <strong>{{ b.codigo }}</strong> en {{ b.archivo }}
                <span class="micro"
                  >· {{ b.ocurrencias }} {{ b.ocurrencias === 1 ? 'vez' : 'veces' }}</span
                >
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel bloque">
        <h2 class="micro">Criterios y evidencia de la IA</h2>
        <ul>
          @for (c of d.evidencia.criterios; track c.criterio) {
            <li>
              <strong>{{ c.criterio }}</strong> {{ c.puntaje }}/{{ c.escalaMaxima }}
              <p class="micro">{{ c.evidencia }}</p>
            </li>
          }
        </ul>
      </section>

      @if (d.caso.estado === 'abierto') {
        <form class="panel bloque" [formGroup]="formulario" novalidate>
          <ui-campo
            etiqueta="Justificación"
            para="justificacion"
            ayuda="Obligatoria. Si confirmas la descalificación, el candidato la lee tal cual."
            [control]="formulario.controls.justificacion"
          >
            <textarea
              id="justificacion"
              pTextarea
              rows="4"
              maxlength="1000"
              formControlName="justificacion"
            ></textarea>
          </ui-campo>
          @if (decidir.error(); as error) {
            <p class="campo__error" role="alert">{{ error }}</p>
          }
          <div class="fila">
            <button
              type="button"
              pButton
              severity="secondary"
              [disabled]="formulario.invalid || decidir.enviando()"
              (click)="decidir.correr('restaurar')"
            >
              Restaurar la evaluación
            </button>
            <button
              type="button"
              pButton
              severity="danger"
              [disabled]="formulario.invalid || decidir.enviando()"
              (click)="decidir.correr('confirmar')"
            >
              Confirmar la descalificación
            </button>
          </div>
        </form>
      } @else {
        <section class="panel bloque">
          <h2 class="micro">Decisión: {{ d.caso.estado }}</h2>
          <p>{{ d.caso.justificacion }}</p>
          <p class="micro">{{ d.caso.decididoEn | date: 'd MMM y, HH:mm' }}</p>
        </section>
      }
    }
  `,
  styles: `
    .cabecera {
      margin-bottom: var(--e-4);
    }
    h1 {
      font-size: var(--t-1);
    }
    .bloque {
      display: grid;
      gap: var(--e-3);
      margin-bottom: var(--e-4);
      padding: var(--e-4);
    }
    ul {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding-left: var(--e-4);
      font-size: var(--t-menor);
    }
  `,
})
export class RevisionDeCaso {
  readonly id = input.required<string>();
  readonly #servicio = inject(ModeracionServicio);
  readonly #avisos = inject(Avisos);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly origenes = ORIGEN;
  protected readonly detalle = recursoPor(this.id, (id) => this.#servicio.detalle(id));
  protected readonly formulario = this.#fb.group({
    justificacion: [
      '',
      [Validators.required, Validators.minLength(20), Validators.maxLength(1000)],
    ],
  });

  protected readonly decidir = accion(async (decision: 'confirmar' | 'restaurar') => {
    await this.#servicio.decidir(this.id(), decision, this.formulario.getRawValue().justificacion);
    this.#avisos.exito(
      decision === 'confirmar'
        ? 'Descalificación confirmada. La evaluación sale del ranking.'
        : 'Evaluación restaurada.',
    );
    await this.#router.navigateByUrl('/moderacion');
  });
}
