import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Campo } from '../../compartido/ui/campo';
import { accion } from '../../nucleo/estado/recurso';
import { Sesion, inicioDe } from '../../nucleo/sesion/sesion';
import { MarcoAcceso } from './marco-acceso';

@Component({
  selector: 'app-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarcoAcceso, ReactiveFormsModule, RouterLink, Campo],
  template: `
    <app-marco-acceso>
      <form class="panel pila" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <header class="pila pila--sm">
          <span class="micro">entrar</span>
          <h2>Accede a tu cuenta</h2>
        </header>

        @if (expirada()) {
          <p class="nota-sesion" role="status">
            Tu sesión expiró por seguridad. Vuelve a entrar para continuar donde estabas.
          </p>
        }

        <ui-campo etiqueta="Correo" para="correo" [control]="formulario.controls.correo">
          <input
            id="correo"
            type="email"
            class="control"
            formControlName="correo"
            autocomplete="username"
            inputmode="email"
            [attr.aria-invalid]="
              formulario.controls.correo.touched && formulario.controls.correo.invalid
            "
          />
        </ui-campo>

        <ui-campo
          etiqueta="Contraseña"
          para="contrasena"
          [control]="formulario.controls.contrasena"
        >
          <input
            id="contrasena"
            type="password"
            class="control"
            formControlName="contrasena"
            autocomplete="current-password"
            [attr.aria-invalid]="
              formulario.controls.contrasena.touched && formulario.controls.contrasena.invalid
            "
          />
        </ui-campo>

        @if (entrar.error(); as error) {
          <p class="campo__error" role="alert"><span aria-hidden="true">▲</span> {{ error }}</p>
        }

        <button type="submit" class="btn btn--primario btn--bloque" [disabled]="entrar.enviando()">
          {{ entrar.enviando() ? 'Entrando…' : 'Entrar' }}
        </button>

        <p class="pie">
          ¿Eres candidato y aún no tienes cuenta?
          <a routerLink="/registro">Crea una</a>. ¿Representas a una empresa?
          <a routerLink="/registro-empresa">Regístrala</a>. Las demás cuentas de tu empresa las crea
          su administrador.
        </p>
      </form>
    </app-marco-acceso>
  `,
  styles: `
    .nota-sesion {
      padding: var(--e-3);
      border: 1px solid color-mix(in srgb, var(--c-aviso) 40%, transparent);
      border-radius: var(--r-md);
      background: var(--c-aviso-tenue);
      color: var(--c-aviso);
      font-size: var(--t-menor);
    }
    .pie {
      font-size: var(--t-menor);
      color: var(--c-texto-suave);
    }
  `,
})
export class Acceso {
  /** Llegan por `withComponentInputBinding`: la URL recuerda a dónde iba. */
  readonly destino = input<string>();
  readonly expirada = input<string>();

  readonly #sesion = inject(Sesion);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder).nonNullable;

  protected readonly formulario = this.#fb.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  protected readonly entrar = accion(async () => {
    const usuario = await this.#sesion.entrar(this.formulario.getRawValue());
    await this.#router.navigateByUrl(this.destino() ?? inicioDe(usuario.rol), { replaceUrl: true });
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    void this.entrar.correr();
  }
}
