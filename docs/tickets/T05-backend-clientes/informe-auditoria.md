# Informe de Auditoría y Guía para el Desarrollador — T05

## 1. Resumen para el Desarrollador

Este ticket construyó el **backend completo del módulo Clientes**: alta, edición, baja lógica, búsqueda y saldo de cuenta corriente, expuesto en cuatro rutas REST (`GET`/`POST /api/clientes` y `GET`/`PATCH /api/clientes/[id]`).

1. **Cómo viajan los datos en una lectura (`route.ts` → `servicio-clientes.ts`):**
   - La ruta ([`src/app/api/clientes/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/route.ts#L5)) solo pasa el *query string* a `listarClientes()`; el `envoltorioRuta` ya resolvió la sesión contra la base de datos y convertirá cualquier error al JSON estándar. **La ruta no decide nada.**
   - `listarClientes()` ([`src/servicios/servicio-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L85-L113)) valida los filtros con `esquemaListadoClientes`, verifica que haya usuario, arma el filtro y devuelve `{ data, page, pageSize, total }`, agregando `totalAdeudado` solo cuando se pidió `conDeuda=true`.
   - El **saldo nunca se lee de una columna**: se calcula con la subconsulta correlacionada `saldoSql` (L33–L36) como `débitos − créditos` sobre `movimientos_cuenta`. El mismo cálculo, en su versión directa, vive en `calcularSaldoCliente()` (L74–L83), que es la función que reutilizarán T06 (pagos) y T08 (facturación).
   - `disponible` se deriva en `agregarDisponible()` (L49–L51): `limiteCredito − saldo`, o `null` si el cliente no tiene límite.

2. **Cómo viajan los datos en una escritura (`route.ts` → servicio → transacción):**
   - `crearCliente()` (L139–L157) y `actualizarCliente()` (L160–L187) siguen el orden fijo de cuatro pasos: validan con el esquema `.strict()`, verifican que haya sesión (**ambos roles**, no solo admin), aplican las reglas dentro de `ejecutarTransaccionEscritura()` y devuelven la forma pública.
   - El documento se guarda **tal como lo escribe el usuario** (`28.456.123`) pero se compara normalizado: en JavaScript con `normalizarDocumento()` ([`src/utilidades/documentos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/documentos.ts#L4)) y en SQL con `documentoNormalizadoSql` (L39). Por eso `28456123` y `28.456.123` son la misma persona tanto al buscar como al detectar duplicados.
   - La baja lógica (`activo: false`) y la quita de cuenta corriente pasan primero por `asegurarClienteSinSaldoPendiente()`, que lee el saldo dentro de la misma transacción.

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| [`src/utilidades/documentos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/documentos.ts#L4) | Normalizar documentos para comparar y buscar | `normalizarDocumento()` (L4) |
| [`src/validaciones/validacion-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-clientes.ts#L21-L52) | Esquemas Zod compartidos con los formularios del T07 | `camposCliente` (L21), `esquemaCrearCliente` (L43), `esquemaEditarCliente` (L46) |
| [`src/errores/verificadores-negocio.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L195-L209) | Reglas de rechazo, fuera del flujo normal | `asegurarDocumentoClienteUnico()` (L195), `asegurarClienteSinSaldoPendiente()` (L200), `traducirErrorEscrituraCliente()` (L207) |
| [`src/servicios/servicio-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L33-L187) | Flujo normal y reglas de negocio | `saldoSql` (L33), `calcularSaldoCliente()` (L74), `listarClientes()` (L85), `obtenerClientePorId()` (L115), `crearCliente()` (L139), `actualizarCliente()` (L160) |
| [`src/app/api/clientes/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/route.ts#L5-L7) | Adaptador REST de listado y alta | `GET` (L5), `POST` (L7) |
| [`src/app/api/clientes/[id]/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/%5Bid%5D/route.ts#L5-L8) | Adaptador REST de ficha y edición/baja | `GET` (L5), `PATCH` (L7) |
| [`src/pruebas/clientes.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/clientes.prueba.ts#L39-L144) | Pruebas de los 5 criterios de aceptación | 8 pruebas (L39–L144) |

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas:** `pnpm test` → **184 pruebas en 9 archivos, todas en verde** (eran 176 antes del ticket). `pnpm run verificar:tipos` y `pnpm run build` sin errores; las rutas `/api/clientes` y `/api/clientes/[id]` aparecen en la salida del build.
- **Criterios de aceptación del `ticket.md`:** los cinco verificados con prueba propia.
- **Reglas de `AGENTS.md`:** nombres en castellano; flujo normal en `src/servicios/` separado de errores, validaciones y pruebas; ningún `route.ts` con lógica de negocio ni formateo manual; cada función de servicio con su comentario citando el requerimiento; `.strict()` en todos los esquemas de entrada.
- **No se tocó `src/base-de-datos/esquema.ts`:** las tablas `clientes` y `movimientos_cuenta` ya venían del T01, así que **este ticket no genera migración**.

**Errores detectados y corregidos durante el desarrollo y la auditoría:**

1. **Subconsulta correlacionada sin calificar la tabla (`servicio-clientes.ts`, L33–L36).** La primera versión de `saldoSql` interpolaba las columnas con la sintaxis de Drizzle (`${movimientosCuenta.clienteId} = ${clientes.id}`), igual que hace `servicio-productos.ts`. Pero Drizzle las emite **sin calificar la tabla**, y el SQL resultante era `where "cliente_id" = "id"`: dentro de la subconsulta, SQLite resuelve `"id"` contra `movimientos_cuenta`, no contra `clientes`. El efecto era silencioso y peligroso — **el saldo de la ficha solo sumaba los movimientos cuyo `id` coincidía por casualidad con el `cliente_id`**, devolviendo `2000000` donde correspondía `1440000`. Se detectó porque `calcularSaldoCliente()` y la ficha daban resultados distintos sobre los mismos datos. Corregido escribiendo la subconsulta con alias explícito (`movimientos_cuenta as mc ... where mc.cliente_id = clientes.id`) y dejando el comentario que explica por qué no se puede usar la interpolación acá.
2. **El criterio de aceptación 3 se probaba a medias (`clientes.prueba.ts`, L95–L112).** La prueba verificaba que el servicio lanzara un `ZodError`, pero no que el manejador lo tradujera al `422 VALIDACION` que pide el ticket. Se agregó la verificación de extremo a extremo con `convertirErrorARespuestaHttp()`, comprobando el estado HTTP, el `code` y el campo señalado en `details`.
3. **Observación, no corrección:** en ese `details` el campo llega como `cambios.saldo` y no como `saldo`, porque el servicio recibe `{ id, cambios }`. Es exactamente el mismo comportamiento que `actualizarProducto()` en el T03, así que **se mantiene por consistencia**. Si el equipo decide limpiar el prefijo, hay que hacerlo en `manejador-errores.ts` para los dos módulos a la vez.
4. **Desvío respecto del `ticket.md`, declarado:** se agregó al listado un filtro `activo` (`"true"` por defecto, con `"false"` y `"todos"`) que el ticket no pedía. Sin él, un cliente dado de baja seguiría apareciendo en el listado principal, lo que contradice la Regla 12. Queda documentado para que el T07 sepa que existe.

## 4. Guía de Defensa Rápida del Ticket

| Pregunta probable | Dónde hacer clic |
| :--- | :--- |
| **¿El saldo de un cliente se guarda o se calcula?** | Se calcula. Mostrar que `clientes` en [`esquema.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts#L62-L80) **no tiene columna de saldo**, y después `saldoSql` ([L33](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L33)) y `calcularSaldoCliente()` ([L74](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L74)), que suman `débitos − créditos` de `movimientos_cuenta`. |
| **¿Por qué un vendedor puede crear clientes si no puede crear productos?** | Por la tabla de permisos de la Sección 3 del enunciado: el vendedor da de alta al comprador en el mostrador (RF-V2). En el código, `crearCliente()` ([L139](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L139)) llama a `asegurarUsuarioAutenticado()` y **no** a `asegurarRolAdmin()`, al revés que `crearProducto()`. |
| **¿Qué pasa si quiero dar de baja a un cliente que debe plata?** | `actualizarCliente()` ([L166](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L166)) calcula el saldo dentro de la transacción y llama a `asegurarClienteSinSaldoPendiente()` ([verificadores-negocio.ts L200](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L200)), que lanza `422 SALDO_PENDIENTE`. Probado en [`clientes.prueba.ts` L113](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/clientes.prueba.ts#L113). |
