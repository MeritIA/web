import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'bytes' })
export class BytesPipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const unidades = ['KiB', 'MiB', 'GiB'];
    let valor = bytes / 1024;
    let i = 0;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(valor < 10 ? 1 : 0)} ${unidades[i]}`;
  }
}

/** Nota sobre 100, con un decimal solo cuando aporta. */
@Pipe({ name: 'nota' })
export class NotaPipe implements PipeTransform {
  transform(nota: number | null | undefined): string {
    if (nota === null || nota === undefined) return '—';
    return Number.isInteger(nota) ? String(nota) : nota.toFixed(1);
  }
}

/** «hace 3 min». Para que el estado de una evaluación se lea de un vistazo. */
@Pipe({ name: 'desde' })
export class DesdePipe implements PipeTransform {
  readonly #formato = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  readonly #tramos: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ];

  transform(fecha: string | Date | null | undefined): string {
    if (!fecha) return '—';
    let diferencia = (new Date(fecha).getTime() - Date.now()) / 1000;
    for (const [unidad, limite] of this.#tramos) {
      if (Math.abs(diferencia) < limite)
        return this.#formato.format(Math.round(diferencia), unidad);
      diferencia /= limite;
    }
    return this.#formato.format(Math.round(diferencia), 'year');
  }
}

/** Identificadores largos: se muestran cortos y completos en el `title`. */
@Pipe({ name: 'corto' })
export class CortoPipe implements PipeTransform {
  transform(id: string | null | undefined, longitud = 8): string {
    return id ? id.slice(0, longitud) : '—';
  }
}
