import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Solo sostiene el router: cada pantalla trae su propia barra y su diseño. */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: '<router-outlet />',
})
export class App {}
