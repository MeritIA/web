import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { SECTORES, type Sector } from '../../nucleo/api/modelos';
import { accion } from '../../nucleo/estado/recurso';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { Avisos } from '../../nucleo/ui/avisos';
import { MarcoAcceso } from './marco-acceso';

/**
 * Auto-registro de una empresa (A01).
 *
 * Crea la empresa y a su primer administrador de una vez. El NIT es obligatorio
 * y el backend comprueba su dígito de verificación; la validación contra la
 * Cámara de Comercio es una integración externa que no existe todavía.
 */
@Component({
  selector: 'app-registro-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarcoAcceso, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <app-marco-acceso>
      <form class="panel pila" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <header class="pila pila--sm">
          <span class="micro">crear cuenta · empresa</span>
          <h2>Registra tu empresa</h2>
        </header>

        <ui-campo
          etiqueta="Nombre de la empresa"
          para="nombreEmpresa"
          [control]="formulario.controls.nombreEmpresa"
        >
          <input
            id="nombreEmpresa"
            type="text"
            class="control"
            formControlName="nombreEmpresa"
            autocomplete="organization"
          />
        </ui-campo>

        <ui-campo etiqueta="Sector" para="sector" [control]="formulario.controls.sector">
          <select id="sector" class="control" formControlName="sector">
            @for (sector of sectores; track sector) {
              <option [value]="sector">{{ sector }}</option>
            }
          </select>
        </ui-campo>

        <ui-campo
          etiqueta="NIT"
          para="nit"
          ayuda="Con dígito de verificación, por ejemplo 890903938-8."
          [control]="formulario.controls.nit"
        >
          <input id="nit" type="text" class="control" formControlName="nit" inputmode="numeric" />
        </ui-campo>

        <ui-campo
          etiqueta="Tu nombre completo"
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
          ayuda="Mínimo 12 caracteres. Serás el administrador de la empresa y podrás crear a tus reclutadores."
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

        @if (registrar.error(); as error) {
          <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
        }

        <button
          type="submit"
          class="btn btn--primario btn--bloque"
          [disabled]="registrar.enviando()"
        >
          {{ registrar.enviando() ? 'Registrando…' : 'Registrar empresa' }}
        </button>

        <p class="pie">¿Ya tienes cuenta? <a routerLink="/acceso">Entra</a>.</p>
      </form>
    </app-marco-acceso>
  `,
  styles: `
    .pie {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
  `,
})
export class RegistroEmpresa {
  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #avisos = inject(Avisos);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly sectores = SECTORES;

  protected readonly formulario = this.#fb.group({
    nombreEmpresa: ['', [Validators.required, Validators.minLength(2)]],
    sector: ['tecnologia' as Sector, [Validators.required]],
    // Forma, no cálculo: el dígito de verificación lo comprueba el backend.
    nit: ['', [Validators.required, Validators.pattern(/^[\d.\s]{8,18}-\s?\d$/)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(12)]],
  });

  protected readonly registrar = accion(async () => {
    const usuario = await this.#sesion.registrarEmpresa(this.formulario.getRawValue());
    this.#avisos.exito('Empresa registrada. Ya puedes crear tu primer ejercicio.');
    await this.#router.navigateByUrl(inicioDe(usuario.rol));
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.registrar.correr();
  }
}
