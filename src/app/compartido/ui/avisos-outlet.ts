import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';

/**
 * Pila de avisos. `p-toast` ya es una región `aria-live`. En móvil ocupa todo
 * el ancho y se coloca arriba, lejos del pulgar y del teclado.
 */
@Component({
  selector: 'ui-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastModule],
  template: `<p-toast
    position="top-right"
    [breakpoints]="{ '640px': { width: 'calc(100% - 2rem)', left: '1rem', right: '1rem' } }"
  />`,
})
export class AvisosOutlet {}
