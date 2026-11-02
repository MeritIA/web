import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import type { Consentimientos, TipoDeConsentimiento } from './modelos';

@Injectable({ providedIn: 'root' })
export class ConsentimientosServicio {
  readonly #api = inject(Api);

  mios = () => this.#api.get<Consentimientos>('/autenticacion/consentimientos');
  registrar = (
    decisiones: { tipo: TipoDeConsentimiento; concedido: boolean }[],
    origen: 'registro' | 'perfil' = 'perfil',
  ) => this.#api.put<Consentimientos>('/autenticacion/consentimientos', { decisiones, origen });
}
