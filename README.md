# MeritIA · Frontend web

Interfaz web de MeritIA: evaluación de candidatos mediante ejercicios prácticos
calificados contra una rúbrica, con puntaje, desglose por criterio y evidencia.

Consume el backend NestJS de `../backend` (contrato en `backend/docs/openapi.json`)
y cubre los tres roles del producto: candidato, reclutador y administrador.

---

## Arrancar

```bash
npm install
npm start          # http://localhost:4200
```

`ng serve` usa `proxy.conf.json`, que reenvía `/api` a `http://127.0.0.1:3000`.
Esto no es un detalle de comodidad: el backend entrega la sesión en una **cookie
HttpOnly** y, al servir la web y la API bajo el mismo origen, la cookie viaja
sola y no hace falta CORS ni guardar ningún token en JavaScript.

Para apuntar a otro backend se cambia el `target` de `proxy.conf.json` (en
desarrollo) o la configuración del proxy que sirva el build (en producción).

```bash
npm run build      # build de producción en dist/
npm run formato    # prettier sobre todo el código
```

Requisitos: Node ≥ 20.19 (el backend ya fija su versión en `.nvmrc`).

---

## Cómo está organizado

```
src/
  styles/            tokens, reinicio y vocabulario visual compartido
  entornos/          configuración por entorno (apiBase, sondeos)
  app/
    nucleo/          lo que no es pantalla
      api/           modelos del contrato + un servicio por módulo del backend
      sesion/        identidad, guardias de ruta
      http/          interceptores (credenciales, renovación, avisos)
      estado/        `recurso()` y `accion()`
      ui/            avisos y tema
    compartido/      dominio, formatos y componentes de interfaz reutilizables
    layout/          el marco de la aplicación
    funciones/       una carpeta por área de producto, toda carga diferida
```

### Las tres decisiones que explican el resto

**1. Los tokens mandan.** Ningún componente escribe un color, una fuente ni un
espaciado literal: todo sale de `src/styles/_tokens.scss`. Cambiar la paleta, la
tipografía o el ritmo de la aplicación entera es editar ese archivo. El tema
claro existe precisamente porque el sistema de tokens lo hace barato: redefine
color y no toca nada más.

**2. El aspecto es global; el comportamiento, del componente.** Botones, campos,
tablas, chips y paneles se definen una vez en `_componentes.scss`. Por eso un
componente nuevo nace ya con el aspecto correcto y una pantalla se escribe en
decenas de líneas y no en cientos.

**3. Cargar y enviar se resuelven una vez.** `recurso()` da el trío
`cargando / error / datos` con recarga, y `accion()` da `enviando / error` con
protección contra doble clic. Ninguna pantalla repite ese andamiaje, y por eso
tampoco puede olvidarse de apagar un indicador de carga en un `catch`.

### Añadir una pantalla

1. Crea el componente en `src/app/funciones/<area>/`.
2. Decláralo en `app.routes.ts` con `loadComponent` y su guardia de rol.
3. Si habla con el backend, añade el método al servicio del módulo que
   corresponda en `nucleo/api/` y el tipo en `modelos.ts`.
4. Usa `recurso()` / `accion()` y las clases de `_componentes.scss`. Si necesitas
   un estilo que no existe, pregúntate primero si debería existir para todos: si
   la respuesta es sí, va a `_componentes.scss`.

---

## Decisiones de interfaz, y por qué

| Decisión | Motivo |
|---|---|
| Sin tokens en `localStorage` | El backend los entrega en cookie HttpOnly. Guardar algo en JavaScript sería deshacer esa protección. |
| La identidad se pregunta a `/autenticacion/yo` al arrancar | Es la única fuente fiable de quién eres y con qué rol; los guardias deciden con la verdad y no con una suposición. |
| La navegación se arma desde el rol | Un candidato nunca ve que existe «Ejercicios» ni descubre sus límites a base de 403. |
| Validación de archivo antes de subir | Las mismas reglas que aplica el backend (extensiones, 25 MiB), adelantadas para no gastar un minuto subiendo algo que va a rebotar. |
| Suma de pesos de la rúbrica en vivo | El backend exige que sumen 100. Verlo mientras se escribe evita el 400 en vez de explicarlo después. |
| Confirmación solo en lo irreversible | Publicar, cerrar y retirar no se deshacen. Preguntar por todo enseña a confirmar sin leer. |
| Sondeo mientras algo se evalúa, y solo entonces | HU-16 pide que el candidato no espere en pantalla; HU-15, que pueda consultar el estado. El sondeo se detiene cuando no queda nada en proceso. |
| El ranking enlaza siempre al detalle | Una nota sin la evidencia que la sostiene es justo lo que MeritIA existe para evitar. |

## Accesibilidad

- Un único anillo de foco visible en todo el producto, y enlace para saltar al
  contenido.
- Estados comunicados con texto y forma, nunca solo con color; los chips llevan
  siempre su etiqueta.
- `role="status"` / `aria-live` en avisos, cola y estados de evaluación.
- Barras de nota con `role="meter"` y sus valores accesibles.
- Errores de formulario con `role="alert"`, anunciados solo cuando el campo ya
  fue tocado.
- `prefers-reduced-motion` respetado globalmente.
- Objetivos táctiles de 40 px o más y sin desbordamiento horizontal desde 360 px.

---

## Dependencia del backend que todavía falta

`GET /ejercicios/:id` exige el permiso `ejercicios:leer`, que la matriz de roles
concede solo a reclutador y administrador. Un candidato, por tanto, **no puede
leer el enunciado del ejercicio que debe resolver**, y `GET /vacantes/:id` le
devuelve únicamente los identificadores asociados.

Eso deja incompleta la HU-13 («consultar el enunciado de cada ejercicio»). La
interfaz lo resuelve hoy sin romperse: muestra el ejercicio por su orden y avisa
de que el enunciado lo comparte la empresa. En cuanto el backend exponga el
enunciado al candidato invitado —un endpoint de solo lectura, o incluir la
versión vigente en `GET /vacantes/:id`—, basta con pasarlo a la entrada
`enunciado` de `app-panel-ejercicio`, que ya lo pinta.

Lo mismo, en menor grado, con invitar candidatos: el backend acepta el UUID de
la cuenta y no existe una búsqueda por correo, así que la interfaz pide el UUID.
