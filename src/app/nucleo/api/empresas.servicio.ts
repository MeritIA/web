import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Empresa, NuevaEmpresa, NuevoUsuarioDeEmpresa, UsuarioDeEmpresa } from './modelos';

@Injectable({ providedIn: 'root' })
export class EmpresasServicio {
  readonly #api = inject(Api);

  listar = () => this.#api.get<Empresa[]>('/empresas');
  crear = (datos: NuevaEmpresa) => this.#api.post<Empresa>('/empresas', datos);
  crearUsuario = (idEmpresa: string, datos: NuevoUsuarioDeEmpresa) =>
    this.#api.post<UsuarioDeEmpresa>(`/empresas/${idEmpresa}/usuarios`, datos);
}
