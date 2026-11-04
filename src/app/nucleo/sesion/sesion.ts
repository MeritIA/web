import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from '../api/api';
import type {
  Credenciales,
  Registro,
  RegistroDeEmpresa,
  Rol,
  Sesion as RespuestaSesion,
  Usuario,
} from '../api/modelos';

/**
 * Quién está usando la aplicación.
 *
 * En web los tokens viven en cookies HttpOnly y el JavaScript no los ve nunca
 * (Plan de Seguridad §2). Por eso aquí no se guarda ningún token: la identidad
 * se le pregunta al servidor con `GET /autenticacion/yo`, que es la única
 * fuente fiable de quién eres y con qué rol.
 */
@Injectable({ providedIn: 'root' })
export class Sesion {
  readonly #api = inject(Api);
  readonly #usuario = signal<Usuario | null>(null);
  readonly #restaurada = signal(false);

  readonly usuario = this.#usuario.asReadonly();
  /** Falso hasta que sabemos si hay sesión: evita parpadeos de «no autorizado». */
  readonly restaurada = this.#restaurada.asReadonly();
  readonly autenticado = computed(() => this.#usuario() !== null);
  readonly rol = computed<Rol | null>(() => this.#usuario()?.rol ?? null);
  readonly esCandidato = computed(() => this.rol() === 'candidato');
  readonly esReclutador = computed(() => this.rol() === 'reclutador');
  readonly esAdministrador = computed(() => this.rol() === 'administrador');
  readonly esModerador = computed(() => this.rol() === 'moderador');
  /** Reclutador o administrador: quien gestiona procesos de selección. */
  readonly gestiona = computed(() => this.esReclutador() || this.esAdministrador());

  tiene(...roles: Rol[]): boolean {
    const actual = this.rol();
    return actual !== null && roles.includes(actual);
  }

  /** Se ejecuta una vez al arrancar la aplicación. */
  async restaurar(): Promise<void> {
    try {
      this.#usuario.set(await this.#api.get<Usuario>('/autenticacion/yo'));
    } catch {
      this.#usuario.set(null); // sin sesión: es un estado normal, no un fallo
    } finally {
      this.#restaurada.set(true);
    }
  }

  async entrar(credenciales: Credenciales): Promise<Usuario> {
    await this.#api.post<RespuestaSesion>('/autenticacion/login', credenciales);
    return this.#identificar();
  }

  async registrarse(datos: Registro): Promise<Usuario> {
    await this.#api.post<RespuestaSesion>('/autenticacion/registro', datos);
    return this.#identificar();
  }

  /** A01: crea la empresa con su primer administrador y deja la sesión abierta. */
  async registrarEmpresa(datos: RegistroDeEmpresa): Promise<Usuario> {
    await this.#api.post<RespuestaSesion>('/autenticacion/registro-empresa', datos);
    return this.#identificar();
  }

  /**
   * Cierra la sesión. **Nunca falla**, y eso es deliberado.
   *
   * La llamada al servidor es el mejor esfuerzo: sirve para invalidar las demás
   * sesiones de la persona. Si no responde, la sesión local ya está borrada por
   * el `finally`, así que dejar que el error subiera solo conseguía que quien
   * llama no llegara a navegar: en `marco.ts` el `await this.sesion.salir()`
   * se quedaba a medias y la persona veía la misma pantalla después de pulsar
   * «Salir». Se enteraría al siguiente clic, cuando un 401 la expulsara.
   *
   * Salir es la acción que más tiene que funcionar incluso cuando nada funciona.
   */
  async salir(): Promise<void> {
    try {
      await this.#api.post('/autenticacion/cerrar-sesiones');
    } catch {
      // Se traga a propósito: ver arriba.
    } finally {
      this.#usuario.set(null);
    }
  }

  /** Anonimiza la cuenta en el backend, que además cierra todas las sesiones. */
  async eliminarCuenta(contrasena: string): Promise<void> {
    await this.#api.borrar<void>('/autenticacion/cuenta', { contrasena });
    this.#usuario.set(null);
  }

  /** La usa el interceptor cuando un token de acceso caduca a mitad de trabajo. */
  async renovar(): Promise<void> {
    await this.#api.post<RespuestaSesion>('/autenticacion/renovar');
  }

  olvidar(): void {
    this.#usuario.set(null);
  }

  /**
   * El cuerpo del login no trae la empresa, y sin ella no se puede decidir qué
   * ve un reclutador. Una llamada más y la identidad queda completa.
   */
  async #identificar(): Promise<Usuario> {
    const usuario = await this.#api.get<Usuario>('/autenticacion/yo');
    this.#usuario.set(usuario);
    this.#restaurada.set(true);
    return usuario;
  }
}

/** A dónde mandar a cada rol después de entrar. */
export function inicioDe(rol: Rol): string {
  if (rol === 'moderador') return '/moderacion';
  return rol === 'candidato' ? '/mis-pruebas' : '/panel';
}
