import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { MODALIDAD } from '../../compartido/dominio';
import { LIMITES, type Modalidad } from '../../nucleo/api/modelos';
import { VacantesServicio } from '../../nucleo/api/vacantes.servicio';
import { accion } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

/**
 * Alta de vacante. Nace siempre en borrador: el estado no es un campo del
 * formulario porque tampoco lo es del endpoint, y ofrecerlo aquí sería
 * prometer algo que el backend rechaza con un 400.
 */
@Component({
  selector: 'app-vacante-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputText, Textarea, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <nav class="migas"><a routerLink="/vacantes">Vacantes</a> <span>Nueva</span></nav>

    <header class="pila pila--sm">
      <span class="micro">paso 1 de 3 · se crea en borrador</span>
      <h1>Nueva vacante</h1>
      <p class="lectura ayuda">
        Después podrás asociarle ejercicios e invitar candidatos. Nadie la ve hasta que la
        publiques.
      </p>
    </header>

    <form class="panel pila formulario" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
      <ui-campo etiqueta="Título" para="titulo" [control]="formulario.controls.titulo">
        <input
          id="titulo"
          type="text"
          pInputText
          formControlName="titulo"
          maxlength="160"
          placeholder="Desarrollador backend · Node"
        />
      </ui-campo>

      <ui-campo
        etiqueta="Descripción"
        para="descripcion"
        ayuda="Qué hace el equipo y qué se espera de la persona. Lo lee el candidato invitado."
        [control]="formulario.controls.descripcion"
      >
        <textarea id="descripcion" pTextarea formControlName="descripcion" rows="6"></textarea>
      </ui-campo>

      <div class="dos">
        <ui-campo
          etiqueta="Ubicación"
          para="ubicacion"
          opcional
          [control]="formulario.controls.ubicacion"
        >
          <input
            id="ubicacion"
            type="text"
            pInputText
            formControlName="ubicacion"
            maxlength="120"
            placeholder="Bogotá"
          />
        </ui-campo>

        <ui-campo etiqueta="Modalidad" para="modalidad" opcional>
          <select id="modalidad" pInputText formControlName="modalidad">
            <option value="">Sin definir</option>
            @for (m of opciones; track m) {
              <option [value]="m">{{ modalidades[m] }}</option>
            }
          </select>
        </ui-campo>
      </div>

      <ui-campo
        etiqueta="Tecnologías"
        para="tecnologias"
        opcional
        ayuda="Separadas por coma, hasta 10. El candidato las usa para filtrar."
      >
        <input
          id="tecnologias"
          type="text"
          pInputText
          formControlName="tecnologias"
          placeholder="Node.js, TypeScript, PostgreSQL"
        />
      </ui-campo>

      <div class="dos">
        <ui-campo
          etiqueta="Intentos por ejercicio"
          para="intentos"
          ayuda="De 1 a 10. Solo se puede cambiar mientras sea borrador."
          [control]="formulario.controls.intentosPermitidos"
        >
          <input
            id="intentos"
            type="number"
            pInputText
            formControlName="intentosPermitidos"
            [min]="limites.intentosMin"
            [max]="limites.intentosMax"
          />
        </ui-campo>
      </div>

      <div class="dos dos--iguales">
        <ui-campo
          etiqueta="Cierre estimado"
          para="cierre"
          opcional
          ayuda="Informativo: llegada la fecha no se cierra nada solo."
          [control]="formulario.controls.cierreEstimado"
        >
          <input id="cierre" type="date" pInputText formControlName="cierreEstimado" />
        </ui-campo>

        <ui-campo
          etiqueta="Finalistas a evaluar"
          para="finalistas"
          opcional
          ayuda="Es un plan, no un tope. Alimenta el avance en tu panel."
          [control]="formulario.controls.finalistasAEvaluar"
        >
          <input
            id="finalistas"
            type="number"
            pInputText
            formControlName="finalistasAEvaluar"
            min="1"
            max="1000"
          />
        </ui-campo>
      </div>

      @if (crear.error(); as error) {
        <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
      }

      <div class="fila fila--entre">
        <a routerLink="/vacantes" pButton [text]="true" severity="secondary">Cancelar</a>
        <button type="submit" pButton [disabled]="crear.enviando()">
          {{ crear.enviando() ? 'Creando…' : 'Crear borrador' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    h1 {
      font-size: var(--t-1);
    }
    .ayuda {
      color: var(--c-texto-suave);
      font-size: var(--t-menor);
    }
    .formulario {
      max-width: 720px;
      margin-top: var(--e-5);
    }
    .dos {
      display: grid;
      gap: var(--e-4);
      grid-template-columns: 2fr 1fr;
    }
    .dos--iguales {
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 620px) {
      .dos {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class VacanteFormulario {
  readonly #servicio = inject(VacantesServicio);
  readonly #router = inject(Router);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly limites = LIMITES;
  protected readonly modalidades = MODALIDAD;
  protected readonly opciones = Object.keys(MODALIDAD) as Modalidad[];

  protected readonly formulario = this.#fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    ubicacion: [''],
    modalidad: this.#fb.control<Modalidad | ''>(''),
    tecnologias: [''],
    cierreEstimado: [''],
    finalistasAEvaluar: [null as number | null, [Validators.min(1), Validators.max(1000)]],
    intentosPermitidos: [
      1,
      [
        Validators.required,
        Validators.min(LIMITES.intentosMin),
        Validators.max(LIMITES.intentosMax),
      ],
    ],
  });

  protected readonly crear = accion(async () => {
    const { ubicacion, modalidad, tecnologias, cierreEstimado, finalistasAEvaluar, ...resto } =
      this.formulario.getRawValue();
    const etiquetas = tecnologias
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const vacante = await this.#servicio.crear({
      ...resto,
      ...(ubicacion ? { ubicacion } : {}),
      ...(modalidad ? { modalidad } : {}),
      ...(etiquetas.length ? { tecnologias: etiquetas } : {}),
      // El backend pide fecha-hora ISO; el campo entrega solo el día. Se cierra al final de ese día.
      ...(cierreEstimado
        ? { cierreEstimado: new Date(`${cierreEstimado}T23:59:59`).toISOString() }
        : {}),
      ...(finalistasAEvaluar ? { finalistasAEvaluar } : {}),
    });
    this.#avisos.exito('Vacante creada en borrador. Ahora asígnale ejercicios.');
    await this.#router.navigate(['/vacantes', vacante.id]);
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.crear.correr();
  }
}
