import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FalloDeApi } from '../../../nucleo/api/api';
import { inicioDe } from '../../../nucleo/sesion/guardias';
import { Sesion } from '../../../nucleo/sesion/sesion';

/**
 * Entrar a MeritIA.
 *
 * QUE NO HACE ESTA PANTALLA
 *
 * No valida la contrasena contra reglas propias. El backend ya tiene las
 * suyas, y duplicarlas aqui garantiza que algun dia digan cosas distintas: el
 * usuario leeria "minimo 8" mientras el servidor exige otra cosa. Lo unico que
 * se comprueba antes de enviar es que los dos campos tengan algo, para no
 * gastar una peticion en un formulario vacio.
 *
 * EL MENSAJE DE ERROR ES EL DEL BACKEND
 *
 * Y es a proposito que sea el mismo para "no existe ese correo" y para
 * "contrasena incorrecta": decir cual de los dos falla le confirma a quien
 * prueba correos cuales estan registrados.
 */
@Component({
  selector: 'app-entrar',
  imports: [FormsModule],
  templateUrl: './entrar.html',
  styleUrl: './entrar.css',
})
export class Entrar {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly correo = signal('');
  protected readonly contrasena = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;

    this.enviando.set(true);
    this.error.set(null);

    try {
      const quien = await this.sesion.entrar(this.correo().trim(), this.contrasena());

      // Si llego aqui redirigido desde una ruta protegida, se vuelve a ella.
      const volverA = this.ruta.snapshot.queryParamMap.get('volverA');
      await this.router.navigateByUrl(volverA ?? inicioDe(quien.rol));
    } catch (fallo) {
      this.error.set(fallo instanceof FalloDeApi ? fallo.message : 'No se pudo iniciar sesion.');
    } finally {
      this.enviando.set(false);
    }
  }
}
