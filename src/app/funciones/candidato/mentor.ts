import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstadoRecurso } from '../../compartido/ui/basicos';
import { MentorServicio } from '../../nucleo/api/mentor.servicio';
import type { TurnoDelMentor } from '../../nucleo/api/modelos';
import { accion, recurso } from '../../nucleo/estado/recurso';
import { Sesion } from '../../nucleo/sesion/sesion';

const INICIALES = [
  '¿En qué criterio debo mejorar primero?',
  '¿Qué patrón ves en mis últimas entregas?',
  'Dame un plan de práctica para esta semana.',
];

/**
 * Mentor IA.
 *
 * El mentor no ve tus entregas: ve un resumen de unas pocas líneas con tus
 * promedios por criterio y tus tres últimas evaluaciones. La pantalla enseña
 * ese resumen tal cual, para que se sepa qué sale hacia la IA y qué no.
 * La conversación se guarda en la pestaña (no en el servidor).
 */
@Component({
  selector: 'app-mentor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EstadoRecurso],
  template: `
    <header class="pila pila--sm cabecera">
      <span class="micro">acompañamiento</span>
      <h1>Mentor IA</h1>
      <p class="lectura ayuda">
        Pregunta por tus resultados y recibe consejos concretos. Responde con lo que ya sabe de tus
        evaluaciones; no revisa tus archivos de nuevo.
      </p>
    </header>

    <ui-recurso
      [cargando]="contexto.cargando()"
      [error]="contexto.error()"
      [vacio]="false"
      (reintentar)="contexto.recargar()"
    />

    @if (contexto.datos(); as c) {
      @if (c.totalEvaluaciones === 0) {
        <section class="panel pila">
          <p>Aún no tienes evaluaciones, así que el mentor no tiene con qué aconsejarte.</p>
          <a routerLink="/mis-pruebas" class="btn btn--primario">Ir a mis pruebas</a>
        </section>
      } @else {
        <details class="panel saben">
          <summary>
            Lo que el mentor sabe de ti · {{ c.totalEvaluaciones }} evaluaciones, promedio
            {{ c.promedio }}/100
          </summary>
          <ul>
            @for (p of c.perfil; track p.nombre) {
              <li>
                {{ p.nombre }}: <strong>{{ p.porcentaje }}%</strong>
                <span class="micro">({{ p.veces }})</span>
              </li>
            }
          </ul>
          @for (r of c.recientes; track $index) {
            <p class="micro">
              {{ r.reto }} — {{ r.nota }}/100
              @if (r.flojo; as f) {
                · más flojo: {{ f.criterio }} ({{ f.porcentaje }}%)
              }
            </p>
          }
        </details>

        <section class="panel chat" aria-live="polite" aria-label="Conversación con el mentor">
          @for (t of turnos(); track $index) {
            <p class="turno" [class.turno--mentor]="t.rol === 'mentor'">
              <span class="micro">{{ t.rol === 'mentor' ? 'Mentor' : 'Tú' }}</span>
              {{ t.texto }}
            </p>
          }
          @if (preguntar.enviando()) {
            <p class="turno turno--mentor"><span class="micro">Mentor</span> Pensando…</p>
          }
          @if (preguntar.error(); as error) {
            <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
          }

          <div class="fila sugerencias">
            @for (s of sugerencias(); track s) {
              <button
                type="button"
                class="btn btn--sm"
                [disabled]="preguntar.enviando()"
                (click)="enviar(s)"
              >
                {{ s }}
              </button>
            }
          </div>

          <form class="fila" [formGroup]="formulario" (ngSubmit)="enviar()">
            <input
              id="pregunta"
              aria-label="Tu pregunta"
              class="control"
              type="text"
              maxlength="500"
              formControlName="pregunta"
              placeholder="Escribe tu pregunta…"
              autocomplete="off"
            />
            <button
              type="submit"
              class="btn btn--primario"
              [disabled]="preguntar.enviando() || formulario.invalid"
            >
              Preguntar
            </button>
          </form>
          @if (turnos().length > 0) {
            <button type="button" class="btn btn--sm btn--fantasma" (click)="reiniciar()">
              Empezar de nuevo
            </button>
          }
        </section>
      }
    }
  `,
  styles: `
    .saben {
      margin-bottom: var(--e-4);
      font-size: var(--t-menor);
    }
    .saben summary {
      cursor: pointer;
    }
    .chat {
      display: grid;
      gap: var(--e-3);
    }
    .turno {
      display: grid;
      gap: var(--e-1);
      padding: var(--e-3);
      border-radius: var(--r-md);
      background: var(--c-superficie-2, transparent);
      white-space: pre-wrap;
    }
    .turno--mentor {
      border: 1px solid var(--c-borde);
    }
    .sugerencias {
      flex-wrap: wrap;
    }
    /* Una sugerencia es una frase: en pantallas estrechas debe poder partirse. */
    .sugerencias .btn {
      max-width: 100%;
      height: auto;
      padding-block: var(--e-2);
      text-align: left;
      white-space: normal;
    }
    form.fila .control {
      flex: 1;
    }
  `,
})
export class Mentor {
  readonly #mentor = inject(MentorServicio);
  readonly #sesion = inject(Sesion);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly contexto = recurso(() => this.#mentor.contexto());
  protected readonly turnos = signal<TurnoDelMentor[]>(this.#leer());
  protected readonly sugerencias = signal<string[]>(INICIALES);

  protected readonly formulario = this.#fb.group({
    pregunta: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected readonly preguntar = accion(async (pregunta: string) => {
    const historial = this.turnos();
    this.turnos.update((t) => [...t, { rol: 'candidato', texto: pregunta }]);
    this.formulario.reset();
    this.sugerencias.set([]);
    try {
      const r = await this.#mentor.preguntar(pregunta, historial);
      this.turnos.update((t) => [...t, { rol: 'mentor', texto: r.respuesta }]);
      this.sugerencias.set(r.sugerencias);
      this.#guardar();
    } catch (e) {
      // La pregunta no obtuvo respuesta: se quita para no ensuciar la conversación.
      this.turnos.update((t) => t.slice(0, -1));
      this.sugerencias.set(INICIALES);
      throw e;
    }
  });

  protected enviar(texto?: string): void {
    const pregunta = (texto ?? this.formulario.getRawValue().pregunta).trim();
    if (pregunta) void this.preguntar.correr(pregunta);
  }

  protected reiniciar(): void {
    this.turnos.set([]);
    this.sugerencias.set(INICIALES);
    this.#guardar();
  }

  get #clave(): string {
    return `meritia.mentor.${this.#sesion.usuario()?.id ?? 'anonimo'}`;
  }

  #leer(): TurnoDelMentor[] {
    try {
      const datos: unknown = JSON.parse(sessionStorage.getItem(this.#clave) ?? '[]');
      return Array.isArray(datos) ? (datos as TurnoDelMentor[]).slice(-20) : [];
    } catch {
      return [];
    }
  }

  #guardar(): void {
    try {
      sessionStorage.setItem(this.#clave, JSON.stringify(this.turnos().slice(-20)));
    } catch {
      // Sin almacenamiento la conversación vive solo mientras la pantalla esté abierta.
    }
  }
}
