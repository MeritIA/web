import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisosOutlet } from './compartido/ui/avisos-outlet';
import { Confirmacion } from './compartido/ui/confirmacion';

@Component({
  selector: 'app-raiz',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AvisosOutlet, Confirmacion],
  template: `
    <router-outlet />
    <ui-avisos />
    <ui-confirmacion />
  `,
})
export class App {}
