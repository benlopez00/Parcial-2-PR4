# Prompt 2 — Desarrollo del Ticket (Optimizado para Cualquier Proveedor / Modelo Económico)

> **Cuándo usarlo:** Una vez generado y revisado el archivo `plan.md` del **Prompt 1**.
> **Objetivo:** Ejecutar la programación leyendo directamente `plan.md` desde el disco, permitiendo cambiar de chat, de modelo o de proveedor de IA sin perder contexto.

---

## Copiar y pegar en el chat de la IA (reemplazando `TXX`):

```markdown
Ejecutá el desarrollo del ticket ubicado en **[INDICAR CARPETA DEL TICKET, ej: tickets/T01-base-datos-errores-y-formatos]**.

Leé primero estos tres archivos en orden:
1. `AGENTS.md` (reglas obligatorias de arquitectura y nombres en castellano).
2. `ticket.md` de la carpeta del ticket.
3. `plan.md` de la carpeta del ticket (seguí este plan paso a paso).

Reglas obligatorias de implementación (pensadas para un código fácil de leer y defender en examen oral):
1. **Todo en castellano y descriptivo:** Nombres de archivos propios, variables, funciones, tipos y componentes en español claro (salvo archivos fijos de Next.js como `route.ts`, `page.tsx`, `layout.tsx`).
2. **Flujo normal separado del control de errores:**
   - En `src/servicios/` escribí el flujo principal limpio y secuencial (1. validar con Zod, 2. verificar permiso/reglas llamando a funciones de `src/errores/verificadores-negocio.ts`, 3. ejecutar consulta o transacción, 4. retornar resultado).
   - Todo chequeo que lance `ErrorApi` debe estar encapsulado en `src/errores/verificadores-negocio.ts` y las respuestas HTTP de error en `src/errores/manejador-errores.ts`.
3. **Validaciones compartidas:** Los esquemas Zod van en `src/validaciones/` usando `.strict()` en altas y ediciones.
4. **Comentarios de trazabilidad:** Arriba de cada función de servicio o verificador agregá un comentario de una línea indicando qué requerimiento o regla implementa (ej. `// Implementa RF-P2 y Regla 1`).
5. **Testing separado:** Escribí las pruebas del ticket en su archivo correspondiente dentro de `src/pruebas/*.prueba.ts`.
6. **Si el ticket tiene Frontend:**
   - Respetá todos los datos, columnas, filtros, pestañas, modales y atajos de las capturas de `docs/pantallas/` indicadas en `ticket.md` y `plan.md`.
   - Usá `shadcn/ui`, clases de Tailwind y los componentes de `src/componentes/` (sin etiquetas HTML sueltas en `page.tsx` y usando `src/utilidades/formatos.ts` para moneda y fechas).

Sé conciso en tus respuestas de texto: priorizá crear/editar los archivos definidos en `plan.md` y verificar que compilen sin errores de TypeScript.
```
