# Prompt 2 — Desarrollo del Ticket (Optimizado para Modelo Económico en Tokens)

> **Cuándo usarlo:** Una vez aprobado el plan del **Prompt 1**.
> **Objetivo:** Ejecutar la programación de forma directa, modular y sin gastar tokens en explicaciones largas, cumpliendo al 100% la arquitectura en castellano de `AGENTS.md`.

---

## Copiar y pegar en el chat de la IA (reemplazando `TXX`):

```markdown
Ejecutá el desarrollo del ticket **[INDICAR CARPETA DEL TICKET, ej: tickets/T01-base-datos-errores-y-formatos/ticket.md]** siguiendo el plan acordado y las reglas estrictas de `AGENTS.md`.

Reglas obligatorias de implementación (pensadas para un código fácil de leer y defender en examen oral):
1. **Todo en castellano y descriptivo:** Nombres de archivos propios, variables, funciones, tipos y componentes en español claro (salvo archivos fijos de Next.js como `route.ts`, `page.tsx`, `layout.tsx`).
2. **Flujo normal separado del control de errores:**
   - En `src/servicios/` escribí el flujo principal limpio y secuencial (1. validar con Zod, 2. verificar permiso/reglas llamando a funciones de `src/errores/verificadores-negocio.ts`, 3. ejecutar consulta o transacción, 4. retornar resultado).
   - Todo chequeo que lance `ErrorApi` debe estar encapsulado en `src/errores/verificadores-negocio.ts` y las respuestas HTTP de error en `src/errores/manejador-errores.ts`.
3. **Validaciones compartidas:** Los esquemas Zod van en `src/validaciones/` usando `.strict()` en altas y ediciones.
4. **Comentarios de trazabilidad:** Arriba de cada función de servicio o verificador agregá un comentario de una línea indicando qué requerimiento o regla implementa (ej. `// Implementa RF-P2 y Regla 1`).
5. **Testing separado:** Escribí las pruebas del ticket en su archivo correspondiente dentro de `src/pruebas/*.prueba.ts`.
6. **Si el ticket tiene Frontend:**
   - Respetá todos los datos, columnas, filtros, pestañas, modales y atajos de las capturas de `docs/pantallas/` indicadas en el ticket.
   - Usá `shadcn/ui`, clases de Tailwind y los componentes de `src/componentes/` (sin etiquetas HTML sueltas en `page.tsx` y usando `src/utilidades/formatos.ts` para moneda y fechas).

Sé conciso en tus respuestas de texto: priorizá crear/editar los archivos y verificar que compilen sin errores de TypeScript.
```
