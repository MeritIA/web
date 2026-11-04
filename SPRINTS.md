# MeritIA · Plan de cuatro sprints

Cuatro sprints de una semana. Cada uno cierra con un **incremento funcional
demostrable**: algo que un usuario real puede hacer de principio a fin, no un
avance interno. El orden sigue las dependencias del backlog
(`MeritIA_Historias_de_Usuario.pdf`) y la ruta de hitos H1→H5.

La columna **Estado** dice la verdad medible, con el mismo criterio que
`backend/docs/requisitos.md`: `hecho` solo si existe y se puede enseñar.

---

## Sprint 1 · Entrar y ver lo mío

**Objetivo.** Que cualquiera de los tres roles entre a la plataforma y vea su
espacio de trabajo, con el sistema de diseño ya en pie.

**Historias.** HU-04, HU-05, HU-06, HU-07, HU-08.

| Entregable | Estado |
|---|---|
| Sistema de diseño por tokens, tema oscuro y claro | hecho |
| Registro de candidato con consentimiento de datos (Ley 1581) | hecho |
| Inicio de sesión sobre cookie HttpOnly, sin tokens en JavaScript | hecho |
| Renovación automática de sesión y expulsión limpia al caducar | hecho |
| Navegación y rutas por rol, con guardias | hecho |
| Alta de empresas y de usuarios por el administrador | hecho |

**Demostración.** Registrar un candidato, entrar como reclutador y como
administrador, y comprobar que cada uno ve exactamente su navegación. Cerrar
sesión en todos los dispositivos.

**Hecho cuando.** Un token manipulado o caducado lleva a la pantalla de acceso
sin dejar la interfaz a medias; ningún rol ve una opción que el backend le
negaría.

---

## Sprint 2 · El reclutador prepara el proceso

**Objetivo.** Que un reclutador deje una vacante lista para recibir entregas sin
ayuda técnica.

**Historias.** HU-09, HU-10, HU-11, HU-12.

| Entregable | Estado |
|---|---|
| Banco de ejercicios con buscador y retirada | hecho |
| Editor de rúbrica con suma de pesos en vivo (exige 100) | hecho |
| Versionado de enunciado y rúbrica, con línea de tiempo de versiones | hecho |
| Ciclo de vacante: borrador → publicada → cerrada, con confirmaciones | hecho |
| Lista de comprobación de publicación (no se publica sin ejercicios) | hecho |
| Invitación de candidatos por correo (o por identificador) | hecho |
| Explorar vacantes abiertas y postularse, con modalidad, tecnologías y retirada de la postulación | hecho |
| Postulantes de la vacante: aceptar (invita en la misma transacción) o rechazar con el motivo que lee el candidato | hecho |
| Banco de talento: la empresa ve (con alias) a quien autorizó su perfil público e invita a una vacante propia | hecho |
| Verificación de la entrega con foto de cámara (90 días de conservación) o modalidad alterna sin cámara; la empresa ve el estado y la foto | hecho |
| Respuesta escrita en línea (se entrega como respuesta.md) | hecho |
| «Descargar mis datos» y «Eliminar cuenta» (Ley 1581) | hecho |
| Uso de cada ejercicio del banco: vacantes, evaluaciones y nota promedio | hecho |
| Ejercicios con tiempo límite: la sesión se inicia y el servidor mide el plazo; verificación técnica de cámara, micrófono y conexión | hecho |
| Archivos adjuntos al enunciado (dataset, esqueleto): la empresa los sube, el candidato invitado los descarga | hecho |
| Auto-registro de empresa (A01): la empresa y su primer administrador, con NIT verificado por su dígito | hecho |
| Moderación: bandeja, revisión con justificación, descalificación del ranking, disputa ante otro moderador y métricas; el candidato ve su caso | hecho |
| Historial de estados de cada entrega, con momento y motivo | hecho |
| Informe de auditoría de la vacante: integridad, distribución, rastro; declara que el sesgo no es medible | hecho |
| Descarga de entregas con enlace firmado, para la empresa y para el propio candidato | hecho |
| Edición de los datos de la vacante (título, descripción, ubicación, modalidad, tecnologías, cierre, finalistas) | hecho |
| Panel de la empresa con avance por vacante, meta de finalistas y cierre estimado | hecho |

**Demostración.** Crear un ejercicio con cuatro criterios, publicar una segunda
versión, crear una vacante, asociarle el ejercicio, invitar a un candidato y
publicarla.

**Hecho cuando.** Intentar publicar sin ejercicios es imposible desde la
interfaz, y la vacante publicada deja de permitir cambiar ejercicios e intentos.

---

## Sprint 3 · El candidato entrega

**Objetivo.** Que el candidato complete su flujo de extremo a extremo desde el
navegador, que es el criterio de aceptación explícito de HU-13.

**Historias.** HU-13, HU-14, HU-15, HU-16.

| Entregable | Estado |
|---|---|
| Lista de pruebas asignadas, solo las publicadas donde fue invitado | hecho |
| Zona de entrega con arrastrar y soltar, y progreso de subida | hecho |
| Validación previa de formato y tamaño, igual a la del backend | hecho |
| Intentos usados y restantes siempre a la vista | hecho |
| Estado de cada intento en vivo, con sondeo que se detiene solo | hecho |
| Enunciado y rúbrica del ejercicio visibles para el candidato (`GET /vacantes/:id/ejercicios`) | hecho |
| Permisos sobre los datos (Ley 1581) al registrarse y en «Mi cuenta» | hecho |

**Demostración.** Entrar como candidato invitado, subir un `.zip`, ver la
entrega pasar a «en evaluación» sin esperar en pantalla, recargar y encontrarla
calificada.

**Hecho cuando.** Un archivo de formato no admitido o de más de 25 MiB se
rechaza antes de subirse, y agotar los intentos lo dice la interfaz antes de
que el backend devuelva 409.

> **Resuelto.** El backend expuso `GET /vacantes/:id/ejercicios`, que entrega el
> enunciado y la rúbrica vigentes a los candidatos invitados. La pantalla de
> prueba ya los muestra.

---

## Sprint 4 · La decisión, con evidencia

**Objetivo.** Que el reclutador elija candidato en menos tiempo y pueda
defender la elección, y que el candidato entienda su nota.

**Historias.** HU-17, HU-20, HU-21, HU-22, HU-24, HU-25.

| Entregable | Estado |
|---|---|
| Ranking de la vacante con resumen, promedio por criterio y riesgo | hecho |
| Detalle de candidato con todos sus intentos y su desglose | hecho |
| Evidencia citada bajo cada criterio, sin recortar | hecho |
| Exportación del ranking a CSV | hecho |
| Resultados del candidato con desglose propio y su puesto al cerrar la vacante | hecho |
| Ranking a ciegas por alias, con revelación de identidad auditada | hecho |
| Registro de contratación y avisos de cierre a candidatos (con reenvío) | hecho |
| Consola de administración: cola de evaluación y reintentos | hecho |
| Mentor IA: conversación sobre las propias evaluaciones, con el resumen que ve la IA a la vista | hecho |
| Pagos al candidato: **simulados en el navegador**; abono por reto, saldo acumulado y retiro desde 200.000 | simulado |
| Manual básico de uso para el cliente piloto (HU-27) | pendiente |

**Demostración.** Abrir el ranking de una vacante con varios candidatos, entrar
al detalle del primero, leer la evidencia de cada criterio y exportar el CSV.
Como administrador, ver la cola y reintentar una evaluación fallida.

**Hecho cuando.** Ninguna nota se muestra sin su desglose a un clic, y el
reporte no deja ver datos de otra empresa.

---

## Qué queda fuera, a propósito

Lo que la Declaración de Alcance excluye y no debe pedirse como hueco:
analítica predictiva (W-03), multi-idioma (W-05), integración con ATS (W-01) y
pagos (W-02). La APK (HU-23) es un entregable aparte del equipo móvil; esta web
y esa aplicación comparten el mismo backend y la misma política de sesión, pero
no el mismo código.

## Cómo se mide cada sprint

1. Incremento desplegado y navegable, no una rama.
2. `npm run verificar` en verde (build de producción sin errores).
3. Revisión del flujo con alguien que no lo haya construido.
4. Lo que no se terminó vuelve al backlog nombrado, no se da por hecho.

## Fuera de alcance, decidido el 02/11/2026

Pagos y cesión de derechos, recolección de datos demográficos (sesgo por grupo) y comparación biométrica o grabación no se construyen. Ver `backend/docs/matriz-pantallas.md` §5.1.
