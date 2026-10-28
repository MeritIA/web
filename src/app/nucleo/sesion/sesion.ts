import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../api/api';
import type { Credenciales, Identidad, SesionIniciada } from '../api/contrato';

/**
 * Quien esta dentro.
 *
 * EL FRONT NO GUARDA NINGUN TOKEN, Y NO ES UNA OMISION
 *
 * En web el token viaja en una cookie HttpOnly: JavaScript no lo puede leer.
 * Ese es el control central del paquete 3.5 del backend, y significa que este
 * servicio **no puede** saber si hay sesion mirando el navegador. Lo pregunta:
 * `GET /autenticacion/yo` responde 200 con la identidad o 401 sin ella.
 *
 * POR QUE NO SE GUARDA LA IDENTIDAD EN sessionStorage
 *
 * Seria un atajo para no preguntar en cada recarga, y mentiria: la cookie pudo
 * vencer, o el usuario pudo cerrar sesion en otra pestaña, y el front seguiria
 * pintando un panel de reclutador que el servidor ya no sirve. La unica
 * respuesta honesta a "sigo dentro" la tiene el servidor.
 *
 * POR QUE `yo` TAMBIEN DESPUES DE ENTRAR
 *
 * El login devuelve `rol` e `idUsuario`, pero no `idEmpresa`, y el panel lo
 * necesita. En vez de juntar dos medias identidades, se pregunta una vez y hay
 * una sola forma de saber quien eres.
 */
@Injectable({ providedIn: 'root' })
export class Sesion {
  private readonly api = inject(Api);

  private readonly identidad = signal<Identidad | null>(null);
  /** Si ya se le pregunto al servidor alguna vez en esta carga de la pagina. */
  private readonly comprobada = signal(false);

  /** Quien esta dentro, o null. Lo leen las pantallas. */
  readonly quien = this.identidad.asReadonly();

  async entrar(correo: string, contrasena: string): Promise<Identidad> {
    const credenciales: Credenciales = { correo, contrasena, cliente: 'web' };
    // La respuesta se descarta a proposito: en web no trae tokens, y el rol lo
    // vuelve a decir `yo` junto con la empresa.
    await firstValueFrom(this.api.post<SesionIniciada>('/autenticacion/login', credenciales));

    const quien = await firstValueFrom(this.api.get<Identidad>('/autenticacion/yo'));
    this.identidad.set(quien);
    this.comprobada.set(true);
    return quien;
  }

  /**
   * Pregunta al servidor si hay sesion. Lo llaman los guardias al entrar a una
   * ruta protegida y al recargar la pagina.
   *
   * Solo pregunta una vez por carga: si ya se comprobo, devuelve lo que hay. Un
   * 401 posterior en cualquier llamada es lo que vuelve a poner esto en null.
   */
  async restaurar(): Promise<Identidad | null> {
    if (this.comprobada()) return this.identidad();

    try {
      const quien = await firstValueFrom(this.api.get<Identidad>('/autenticacion/yo'));
      this.identidad.set(quien);
      return quien;
    } catch (error) {
      // Un 401 aqui es lo normal, no un fallo: significa "no has entrado".
      if (!(error instanceof FalloDeApi) || !error.esSinSesion) throw error;
      this.identidad.set(null);
      return null;
    } finally {
      this.comprobada.set(true);
    }
  }

  /**
   * Olvida la sesion en este navegador.
   *
   * Llama a `cerrar-sesiones`, que invalida TODOS los tokens del usuario y
   * borra las cookies. Es mas de lo que un "salir" suele hacer, y es lo
   * correcto mientras no exista un cierre de una sola sesion: dejar la cookie
   * viva en el servidor y borrarla solo aqui daria una falsa sensacion de
   * haber salido.
   */
  async salir(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<void>('/autenticacion/cerrar-sesiones', {}));
    } catch {
      // Si el servidor no responde, la sesion local se olvida igual: dejar al
      // usuario dentro de una pantalla que ya no puede usar es peor.
    }
    this.identidad.set(null);
    this.comprobada.set(true);
  }

  /** Lo que una llamada cualquiera invoca al recibir 401. */
  caducada(): void {
    this.identidad.set(null);
    this.comprobada.set(true);
  }
}
