/**
 * Navegación por anclas que respeta la barra fija.
 *
 * El desplazamiento nativo a un `#id` coloca el destino en el borde superior y
 * la cabecera pegajosa lo tapa. `scrollIntoView` sí honra `scroll-margin-top`,
 * así que se usa esa vía y se actualiza la URL sin provocar un segundo salto.
 */
export function irAAncla(evento: Event, ancla: string): void {
  const id = ancla.startsWith('#') ? ancla.slice(1) : ancla;
  const destino = document.getElementById(id);
  if (!destino) return;

  evento.preventDefault();
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ block: 'start', behavior: reducido ? 'auto' : 'smooth' });
  destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
  history.replaceState(null, '', `#${id}`);
}
