import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import type { PanelDeEmpresa, ProgresoDeVacante } from '../../../nucleo/api/contrato';
import { Sesion } from '../../../nucleo/sesion/sesion';

/** Una tarjeta de vacante, ya con lo que la pantalla necesita decidido. */
export interface TarjetaDeVacante extends ProgresoDeVacante {
  /** El estimado ya pasó. Es un hecho que el panel tiene que mostrar. */
  readonly vencida: boolean;
  /** Nadie invitado: la barra no se pinta y se pide invitar. */
  readonly sinEmpezar: boolean;
  /** Se evaluó a más gente de la planeada. No es un error. */
  readonly superaElPlan: boolean;
}

/**
 * Panel de la empresa, pantalla A02.
 *
 * UNA SOLA LLAMADA
 *
 * `GET /reportes/panel` trae las cuatro cifras Y una fila por vacante abierta
 * con su avance. Pedirlo vacante por vacante es lo que esta pantalla no se
 * puede permitir con veinte procesos abiertos, y por eso el backend lo compone
 * del lado del servidor.
 *
 * LA EMPRESA NO VA EN LA URL
 *
 * Sale del token. No hay identificador que cambiar para ver el panel de otra,
 * asi que aqui no hay nada que proteger: no hay superficie.
 *
 * NULL NO ES CERO
 *
 * `avance === null` significa "no has invitado a nadie" y `0` significa
 * "invitaste y nadie ha avanzado". Pintarlos igual haria que el panel mienta
 * justo en la vacante recien publicada, que es cuando mas se mira.
 */
@Component({
  selector: 'app-panel',
  imports: [DatePipe],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class Panel {
  private readonly api = inject(Api);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly datos = signal<PanelDeEmpresa | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly quien = this.sesion.quien;

  protected readonly tarjetas = computed<TarjetaDeVacante[]>(() => {
    const panel = this.datos();
    if (!panel) return [];
    const ahora = Date.now();

    return panel.abiertas.map((v) => ({
      ...v,
      vencida: v.cierreEstimado !== null && new Date(v.cierreEstimado).getTime() < ahora,
      sinEmpezar: v.avance === null,
      superaElPlan: v.finalistasAEvaluar !== null && v.evaluados > v.finalistasAEvaluar,
    }));
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.datos.set(await firstValueFrom(this.api.get<PanelDeEmpresa>('/reportes/panel')));
    } catch (fallo) {
      // El backend devuelve 400 con un mensaje claro cuando quien pregunta es
      // un administrador de plataforma, que no pertenece a ninguna empresa. Se
      // muestra tal cual: inventar "no hay datos" pareceria una empresa sin
      // actividad, que es justo lo que el backend evita decir.
      this.error.set(fallo instanceof FalloDeApi ? fallo.message : 'No se pudo cargar el panel.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected async salir(): Promise<void> {
    await this.sesion.salir();
    // Por el router y no con `location.assign`: una recarga entera tira el
    // paquete de la aplicacion para volver a bajarlo, y de paso se pierde el
    // titulo de la pagina hasta que el router lo repone.
    await this.router.navigateByUrl('/entrar');
  }
}
