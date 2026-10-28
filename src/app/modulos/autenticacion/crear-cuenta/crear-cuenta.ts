import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, FalloDeApi } from '../../../nucleo/api/api';
import { Sesion } from '../../../nucleo/sesion/sesion';

/**
 * Crear cuenta, pantalla B11.
 *
 * EL REGISTRO PÚBLICO CREA CANDIDATOS, Y SOLO CANDIDATOS
 *
 * No hay un selector de rol porque el backend no lo acepta: un reclutador lo
 * da de alta la empresa. Poner aquí un desplegable que el servidor va a
 * ignorar sería prometer algo que no pasa.
 *
 * LO ÚNICO QUE SE VALIDA ANTES DE ENVIAR ES QUE NO ESTÉ VACÍO
 *
 * Las reglas de la contraseña las tiene el backend. Repetirlas aquí garantiza
 * que algún día digan cosas distintas, y el usuario leería «mínimo 8» mientras
 * el servidor exige otra cosa. El mensaje que se muestra es el suyo.
 *
 * LOS CONSENTIMIENTOS NO ESTÁN AQUÍ, Y FALTAN
 *
 * B12 es el paso 2 de 3 de este registro y el backend ya los sirve en
 * `GET /autenticacion/consentimientos`. Esta pantalla es el paso 1: el 2 está
 * sin construir, y hasta que lo esté nadie acepta nada explícitamente.
 */
@Component({
  selector: 'app-crear-cuenta',
  imports: [FormsModule],
  templateUrl: './crear-cuenta.html',
  styleUrl: './crear-cuenta.css',
})
export class CrearCuenta {
  private readonly api = inject(Api);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly nombreCompleto = signal('');
  protected readonly correo = signal('');
  protected readonly contrasena = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly puedeEnviar = computed(
    () =>
      !this.enviando() &&
      this.nombreCompleto().trim().length > 0 &&
      this.correo().trim().length > 0 &&
      this.contrasena().length > 0,
  );

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.puedeEnviar()) return;

    this.enviando.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(
        this.api.post<unknown>('/autenticacion/registro', {
          nombreCompleto: this.nombreCompleto().trim(),
          correo: this.correo().trim(),
          contrasena: this.contrasena(),
          cliente: 'web',
        }),
      );

      // Se entra en el acto en vez de mandar a la pantalla de entrar: pedirle
      // la contraseña otra vez a quien acaba de escribirla es trabajo inútil.
      await this.sesion.entrar(this.correo().trim(), this.contrasena());
      await this.router.navigateByUrl('/mis-retos');
    } catch (fallo) {
      this.error.set(fallo instanceof FalloDeApi ? fallo.message : 'No se pudo crear la cuenta.');
    } finally {
      this.enviando.set(false);
    }
  }
}
