# Prompt 1 — Planificación del Ticket

> **Cuándo usarlo:** Al comenzar cualquier ticket (`T01` a `T12`), antes de escribir código.
> **Objetivo:** Que la IA lea las reglas del proyecto y el ticket, revise las pantallas de referencia si aplica, y proponga un plan técnico corto, claro y en castellano para que el desarrollador lo apruebe.

---

## Copiar y pegar en el chat de la IA (reemplazando `TXX`):

```markdown
Vamos a trabajar en el ticket **[INDICAR CARPETA DEL TICKET, ej: tickets/T01-base-datos-errores-y-formatos/ticket.md]**.

Antes de proponer nada, leé obligatoriamente:
1. `AGENTS.md` (reglas de arquitectura, nombres en castellano y separación de errores, validaciones, flujo normal y testing).
2. El archivo `ticket.md` del ticket indicado.
3. Si el ticket incluye interfaz (Frontend), leé las imágenes de referencia listadas en el `ticket.md` dentro de `docs/pantallas/`.

NO escribas el código final todavía. Entregame únicamente un **Plan de Implementación Breve** en castellano con estas 5 secciones:

1. **Resumen del flujo:** En 4 o 5 renglones, qué problema resuelve este ticket y cómo funciona de punta a punta.
2. **Archivos a crear o modificar:** Lista exacta de rutas divididas según nuestra arquitectura:
   - Base de datos / Utilidades (`src/base-de-datos/`, `src/utilidades/`)
   - Validaciones Zod (`src/validaciones/`)
   - Control de errores y verificadores (`src/errores/`)
   - Flujo normal en servicios (`src/servicios/`)
   - Adaptadores API / Páginas / Componentes (`src/app/`, `src/componentes/`)
   - Pruebas separadas (`src/pruebas/`)
3. **Firmas de funciones principales (en castellano):** Nombre descriptivo de cada función que vas a crear, qué parámetros recibe y qué devuelve.
4. **Reglas de negocio y errores controlados:** Qué códigos de error de la sección 11.8 (`ErrorApi`) se van a verificar y en qué archivo separado de `src/errores/` vivirán.
5. **Preguntas de defensa cubiertas:** Qué preguntas de `respuestas-defensa.md` quedarán resueltas al terminar este ticket.

Esperá mi confirmación antes de pasar a la etapa de desarrollo.
```
