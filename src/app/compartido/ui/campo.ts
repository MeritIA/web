import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Mensajes de validación, en un solo sitio.
 *
 * Que «obligatorio» se diga igual en las nueve pantallas no es cosmética: un
 * sistema que se explica de nueve maneras distintas se aprende nueve veces.
 */
const MENSAJES: Record<string, (detalle: ValidationErrors[string]) => string> = {
  required: () => 'Este campo es obligatorio.',
  email: () => 'Escribe un correo con formato válido.',
  minlength: (d) => `Mínimo ${d.requiredLength} caracteres.`,
  maxlength: (d) => `Máximo ${d.requiredLength} caracteres.`,
  min: (d) => `El valor mínimo es ${d.min}.`,
  max: (d) => `El valor máximo es ${d.max}.`,
  pesoTotal: (d) => `Los pesos suman ${d.suma}. Deben sumar exactamente 100.`,
  coincide: () => 'Las contraseñas no coinciden.',
};

/**
 * Etiqueta, control, ayuda y error de un campo de formulario.
 *
 * El error aparece solo cuando la persona ya tocó el campo: señalar en rojo lo
 * que todavía no ha tenido ocasión de escribir es regañar por adelantado.
 */
@Component({
  selector: 'ui-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="campo">
      <label class="campo__etiqueta" [attr.for]="para()">
        {{ etiqueta() }}
        @if (opcional()) {
          <span class="opcional">· opcional</span>
        }
      </label>

      <ng-content />

      @if (ayuda()) {
        <p class="campo__ayuda" [id]="para() + '-ayuda'">{{ ayuda() }}</p>
      }
      @if (mensaje) {
        <p class="campo__error" [id]="para() + '-error'" role="alert">
          <span aria-hidden="true">▲</span> {{ mensaje }}
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .opcional {
      color: var(--c-texto-tenue);
    }
  `,
})
export class Campo {
  readonly etiqueta = input.required<string>();
  readonly para = input.required<string>();
  readonly control = input<AbstractControl | null>(null);
  readonly ayuda = input('');
  readonly opcional = input(false, { transform: booleanAttribute });

  /** Un solo error a la vez: la lista completa abruma y no ayuda a corregir. */
  get mensaje(): string | null {
    const control = this.control();
    if (!control || control.valid || !(control.touched || control.dirty)) return null;
    const [clave, detalle] = Object.entries(control.errors ?? {})[0] ?? [];
    if (!clave) return null;
    return MENSAJES[clave]?.(detalle) ?? 'Revisa este campo.';
  }
}
