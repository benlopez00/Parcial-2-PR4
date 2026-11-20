# Prompt 3 — Auditoría, Informe para el Desarrollador y Respuestas de Defensa

> **Cuándo usarlo:** Al terminar el desarrollo de un ticket con el **Prompt 2** (puede ejecutarse en cualquier proveedor o sesión de IA).
> **Objetivo:** Verificar que el código cumpla todas las reglas de `AGENTS.md`, `ticket.md` y `plan.md`, generar el informe explicativo en `informe-auditoria.md` y completar las respuestas de defensa en `respuestas-defensa.md`.

---

## Copiar y pegar en el chat de la IA (reemplazando `TXX`):

```markdown
Realizá la **Auditoría Final y Documentación de Defensa** del ticket ubicado en **[INDICAR CARPETA DEL TICKET, ej: docs/tickets/T01-base-datos-errores-y-formatos]**.

Leé primero `AGENTS.md`, el `ticket.md` y el `plan.md` de esa carpeta, y luego seguí estos 4 pasos en orden:

### Paso 1: Auditoría Técnica y de Legibilidad
Revisá todos los archivos creados o modificados según `plan.md` y comprobá:
1. ¿Se cumplen todos los requerimientos y criterios de aceptación del `ticket.md` y del `plan.md`?
2. ¿Los nombres de archivos, variables y funciones están en castellano claro y descriptivo?
3. ¿El flujo normal en `src/servicios/` está limpio y separado del control de errores (`src/errores/`), de las validaciones (`src/validaciones/`) y de las pruebas (`src/pruebas/`)?
4. ¿Ningún `route.ts`, Server Action o componente contiene lógica de negocio ni formateos manuales?
5. Ejecutá las pruebas (`pnpm test` / verificación de tipos) y corregí cualquier fallo o desvío que encuentres.

### Paso 2: Generar el Informe del Ticket (`informe-auditoria.md`)
Completá el archivo `informe-auditoria.md` dentro de la carpeta del ticket con:
1. **Resumen para el desarrollador (fácil de leer en 2 minutos):** Qué se construyó y cómo viajan los datos paso a paso.
2. **Mapa de archivos del ticket:** Tabla con cada archivo tocado, qué hace y cuál es su función clave.
3. **Resultado de la auditoría y correcciones aplicadas:** Qué verificaste y **qué errores o mejoras detectaste y corregiste** (importante para responder la pregunta de defensa: *"Muestren algo que el agente hizo mal y cómo lo corrigieron"*).
4. **Guía de defensa rápida del ticket:** 3 preguntas que el profesor podría hacer sobre este ticket y dónde hacer clic en el código para responderlas.

### Paso 3: Actualizar `respuestas-defensa.md`
Abrí `respuestas-defensa.md`, buscá las preguntas asociadas a este ticket (indicadas en el `ticket.md`) y actualizá el campo **Archivo y función/línea** con la ruta real, el nombre exacto de la función y una explicación clara de cómo quedó implementado en nuestro código. Si encontraste algún error de la IA durante la auditoría, agregalo también en la pregunta **P6.4**.

### Paso 4: Actualizar estado en `README.md`
Cambiá el estado de este ticket en la tabla de `README.md` de `Pendiente` a `Completado`.
```
