import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

export interface Peticion {
  titulo: string;
  texto: string;
  /** Texto del botón que confirma. Describe la acción, nunca «Aceptar». */
  accion: string;
  peligrosa?: boolean;
}

/**
 * Confirmación para lo que no se puede deshacer.
 *
 * Publicar una vacante, cerrarla o retirar un ejercicio son decisiones sin
 * marcha atrás en el backend; pedir confirmación es la única prevención de
 * error posible. Lo reversible NO pasa por aquí: preguntar por todo enseña a
 * confirmar sin leer.
 */
@Injectable({ providedIn: 'root' })
export class Confirmaciones {
  readonly #servicio = inject(ConfirmationService);

  pedir(p: Peticion): Promise<boolean> {
    return new Promise((resolver) =>
      this.#servicio.confirm({
        header: p.titulo,
        message: p.texto,
        icon: p.peligrosa ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: p.accion,
        rejectLabel: 'Cancelar',
        acceptButtonProps: { severity: p.peligrosa ? 'danger' : 'primary', size: 'small' },
        rejectButtonProps: { severity: 'secondary', text: true, size: 'small' },
        // Escape o clic fuera cuentan como cancelar.
        closeOnEscape: true,
        dismissableMask: true,
        accept: () => resolver(true),
        reject: () => resolver(false),
      }),
    );
  }
}

/** El diálogo gestiona foco, `role="alertdialog"` y Escape; en móvil ocupa el ancho útil. */
@Component({
  selector: 'ui-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogModule],
  template: `<p-confirmdialog [style]="{ width: '440px', maxWidth: 'calc(100vw - 2rem)' }" />`,
})
export class Confirmacion {}
