import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { ConsentimientosServicio } from '../../nucleo/api/consentimientos.servicio';
import { accion } from '../../nucleo/estado/recurso';
import { Avisos } from '../../nucleo/ui/avisos';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { MarcoAcceso } from './marco-acceso';

/**
 * Registro público. Crea siempre un candidato: el rol no se elige desde aquí
 * y el backend rechaza cualquier intento de enviarlo, así que la interfaz ni
 * siquiera lo insinúa.
 */
@Component({
  selector: 'app-registro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarcoAcceso, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <app-marco-acceso>
      <form class="panel pila" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <header class="pila pila--sm">
          <span class="micro">crear cuenta · candidato</span>
          <h2>Empieza a resolver pruebas</h2>
        </header>

        <ui-campo
          etiqueta="Nombre completo"
          para="nombre"
          [control]="formulario.controls.nombreCompleto"
        >
          <input
            id="nombre"
            type="text"
            class="control"
            formControlName="nombreCompleto"
            autocomplete="name"
          />
        </ui-campo>

        <ui-campo etiqueta="Correo" para="correo" [control]="formulario.controls.correo">
          <input
            id="correo"
            type="email"
            class="control"
            formControlName="correo"
            autocomplete="username"
            inputmode="email"
          />
        </ui-campo>

        <ui-campo
          etiqueta="Contraseña"
          para="contrasena"
          ayuda="Mínimo 12 caracteres. No la reutilices de otro servicio."
          [control]="formulario.controls.contrasena"
        >
          <input
            id="contrasena"
            type="password"
            class="control"
            formControlName="contrasena"
            autocomplete="new-password"
          />
        </ui-campo>

        <label class="consentimiento">
          <input type="checkbox" formControlName="consiente" />
          <span>
            Autorizo el tratamiento de mis datos personales para participar en procesos de
            selección, conforme a la Ley 1581 de 2012. Mi nombre y mi correo se guardan cifrados.
          </span>
        </label>

        <fieldset class="permisos">
          <legend class="micro">Qué permites hacer con tus datos</legend>
          @for (permiso of permisos; track permiso.tipo) {
            <label class="consentimiento">
              <input type="checkbox" [formControlName]="permiso.tipo" />
              <span>
                <strong>{{ permiso.titulo }}.</strong> {{ permiso.texto }}
              </span>
            </label>
          }
          <p class="micro">Puedes cambiarlos cuando quieras desde «Mi cuenta».</p>
        </fieldset>

        @if (crear.error(); as error) {
          <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
        }

        <button
          type="submit"
          class="btn btn--primario btn--bloque"
          [disabled]="crear.enviando() || !formulario.controls.consiente.value"
        >
          {{ crear.enviando() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>

        <p class="pie">¿Ya tienes cuenta? <a routerLink="/acceso">Entra</a>.</p>
      </form>
    </app-marco-acceso>
  `,
  styles: `
    .consentimiento {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--e-3);
      align-items: start;
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
      cursor: pointer;
    }
    .consentimiento input {
      margin-top: 3px;
      accent-color: var(--c-acento);
      width: 16px;
      height: 16px;
    }
    .permisos {
      display: grid;
      gap: var(--e-3);
      margin: 0;
      padding: var(--e-4);
      border: 1px solid var(--c-borde);
      border-radius: var(--r-md);
    }
    .pie {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
  `,
})
export class Registro {
  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #avisos = inject(Avisos);
  readonly #consentimientos = inject(ConsentimientosServicio);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly formulario = this.#fb.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(12)]],
    consiente: [false, [Validators.requiredTrue]],
    // Los mismos valores iniciales que el catálogo del backend.
    biometria: [true],
    calificacion_ia: [true],
    perfil_publico: [false],
  });

  protected readonly permisos = [
    {
      tipo: 'biometria',
      titulo: 'Verificación biométrica',
      texto: 'Cámara solo durante los retos, para prevenir suplantación.',
    },
    {
      tipo: 'calificacion_ia',
      titulo: 'Calificación por IA',
      texto: 'Tu entrega se evalúa contra la rúbrica. Sin este permiso no puedes entregar retos.',
    },
    {
      tipo: 'perfil_publico',
      titulo: 'Perfil visible a otras empresas',
      texto: 'Tu puntaje aparece en el banco de talento aunque no ganes esta vacante.',
    },
  ] as const;

  protected readonly crear = accion(async () => {
    const {
      consiente: _,
      biometria,
      calificacion_ia,
      perfil_publico,
      ...datos
    } = this.formulario.getRawValue();
    const usuario = await this.#sesion.registrarse(datos);
    try {
      await this.#consentimientos.registrar(
        [
          { tipo: 'biometria', concedido: biometria },
          { tipo: 'calificacion_ia', concedido: calificacion_ia },
          { tipo: 'perfil_publico', concedido: perfil_publico },
        ],
        'registro',
      );
    } catch {
      // La cuenta ya existe: no se la desdice por esto. Se puede decidir en «Mi cuenta».
      this.#avisos.info('No pudimos guardar tus permisos. Revísalos en «Mi cuenta».');
    }
    this.#avisos.exito('Cuenta creada. Ya puedes ver las pruebas a las que te inviten.');
    await this.#router.navigateByUrl(inicioDe(usuario.rol));
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.crear.correr();
  }
}
