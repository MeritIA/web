import { DatePipe } from '@angular/common';
import { Component, computed, inject, type OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import type { EntregaPropia, Vacante } from '../../../nucleo/api/contrato';
import { Sesion } from '../../../nucleo/sesion/sesion';

/** Un reto del candidato, con en qué va su entrega. */
export interface RetoPropio {
  readonly vacante: Vacante;
  readonly entregas: readonly EntregaPropia[];
  readonly yaEntrego: boolean;
  readonly evaluada: boolean;
}

/**
 * La casa del candidato: los retos a los que le invitaron.
 *
 * NO ES UN CATÁLOGO, Y ESO ES EL PRODUCTO HOY
 *
 * `GET /vacantes` le devuelve a un candidato **solo las vacantes a las que fue
 * invitado**, y solo las publicadas. No hay búsqueda ni descubrimiento: en
 * MeritIA la empresa invita. La pantalla B13 de los mockups insinúa lo
 * contrario —descubrir vacantes por afinidad— y eso está anotado como
 * contradicción §6.2; cuando se decida, esta pantalla cambia.
 */
@Component({
  selector: 'app-mis-retos',
  imports: [DatePipe],
  templateUrl: './mis-retos.html',
  styleUrl: './mis-retos.css',
})
export class MisRetos implements OnInit {
  private readonly api = inject(Api);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly retos = signal<readonly RetoPropio[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly pendientes = computed(() => this.retos().filter((r) => !r.yaEntrego).length);

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      // Las dos juntas: la lista de vacantes no sabe si ya entregué, y pedir
      // las entregas vacante por vacante serían N llamadas para una lista.
      const [vacantes, entregas] = await Promise.all([
        firstValueFrom(this.api.get<Vacante[]>('/vacantes')),
        firstValueFrom(this.api.get<EntregaPropia[]>('/entregas/mias')),
      ]);

      this.retos.set(
        vacantes.map((vacante) => {
          const mias = entregas.filter((e) => e.idVacante === vacante.id);
          return {
            vacante,
            entregas: mias,
            yaEntrego: mias.length > 0,
            evaluada: mias.some((e) => e.estado === 'evaluada'),
          };
        }),
      );
    } catch (fallo) {
      this.error.set(
        fallo instanceof FalloDeApi
          ? fallo.message
          : `No se pudieron cargar tus retos: ${String(fallo)}`,
      );
    } finally {
      this.cargando.set(false);
    }
  }

  protected async salir(): Promise<void> {
    await this.sesion.salir();
    await this.router.navigateByUrl('/entrar');
  }
}
