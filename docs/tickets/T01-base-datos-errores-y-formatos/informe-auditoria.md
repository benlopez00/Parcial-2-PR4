# Informe de Auditoría y Guía para el Desarrollador — T01

## 1. Resumen para el Desarrollador

En este ticket se construyó la **base técnica de tres pilares** sobre la que se apoyan todos los módulos del sistema:

1. **Persistencia y Esquema (`src/base-de-datos/`):**
   - `conexion.ts` instancia un cliente `@libsql/client` y Drizzle ORM. Si `DATABASE_URL` no está definida, conecta automáticamente a `file:./local.db` (SQLite local); en producción usa la URL `libsql://...` y `DATABASE_AUTH_TOKEN` de Turso.
   - `esquema.ts` define las **9 tablas** del sistema (`usuarios`, `categorias`, `productos`, `clientes`, `facturas`, `factura_items`, `movimientos_stock`, `pagos`, `movimientos_cuenta`) con nombres en castellano, claves foráneas, índices únicos y restricciones `CHECK` a nivel motor SQLite. Todos los importes monetarios son enteros en centavos (`integer`), nunca flotantes.
2. **Control Centralizado de Errores (`src/errores/`):**
   - `codigos-error.ts` declara el catálogo oficial de los **22 códigos de error** de la Sección 11.8.
   - `error-api.ts` provee la clase `ErrorApi(estadoHttp, codigo, mensaje, detalles)` que lanzan los servicios y verificadores sin ensuciar el flujo normal con respuestas HTTP.
   - `manejador-errores.ts` recibe cualquier excepción en un único punto y la transforma en `Response` JSON (`{ error: { code, message, details } }`) para Route Handlers o en `{ ok: false, error }` para Server Actions. Convierte automáticamente `ZodError` en `422 VALIDACION` (incluyendo claves no reconocidas de `.strict()`), `SyntaxError` en `400 JSON_INVALIDO` y errores inesperados en `500 ERROR_INTERNO` (registrándolos con `console.error` sin filtrar datos sensibles).
3. **Formatos Locales y Conversión Exacta (`src/utilidades/formatos.ts`):**
   - Centraliza el formato de moneda en centavos a pesos argentinos (`formatearMoneda(1250000)` → `"$ 12.500,00"`), la conversión inversa sin error de punto flotante usando `BigInt` (`pesosACentavos`), el formateo de fechas y horas en zona horaria `America/Argentina/Buenos_Aires` y la numeración de comprobantes (`0001-00001233` y `R 0001-00000341`).

---

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| `drizzle.config.ts` | Configuración de `drizzle-kit` para generar y aplicar migraciones sobre SQLite/Turso. | `definirConfiguracion` (`schema: "./src/base-de-datos/esquema.ts"`) |
| `src/base-de-datos/conexion.ts` | Conexión única dual (SQLite local o Turso remoto) según variables de entorno. | `crearConexionBaseDatos()`, `bd`, `clienteBaseDatos` |
| `src/base-de-datos/esquema.ts` | Definición de las 9 tablas con Drizzle ORM, restricciones `CHECK` y tipos inferidos. | `usuarios`, `categorias`, `productos`, `clientes`, `facturas`, `facturaItems`, `movimientosStock`, `pagos`, `movimientosCuenta`, `importeValido()` |
| `src/base-de-datos/migraciones/0000_inicial.sql` | Primera migración SQL reproducible generada con `drizzle-kit`. | Sentencias `CREATE TABLE`, `FOREIGN KEY`, `UNIQUE INDEX` y `CHECK` |
| `src/errores/codigos-error.ts` | Catálogo inmutable con los 22 códigos de error de la API (Sección 11.8). | `CODIGOS_ERROR`, tipo `CodigoError` |
| `src/errores/error-api.ts` | Excepción tipada de negocio independiente de HTTP/Next.js. | Clase `ErrorApi` |
| `src/errores/manejador-errores.ts` | Traductor centralizado de excepciones (`ErrorApi`, `ZodError`, `SyntaxError`, `unknown`) al contrato de la API. | `convertirErrorARespuestaHttp()`, `convertirErrorAResultadoAccion()` |
| `src/errores/verificadores-negocio.ts` | Primeros chequeos reutilizables de permisos y existencia de recursos. | `asegurarRolAdmin()`, `asegurarRecursoExiste()` |
| `src/utilidades/formatos.ts` | Formateo único de moneda, fechas (`America/Argentina/Buenos_Aires`) y comprobantes. | `formatearMoneda()`, `pesosACentavos()`, `formatearFecha()`, `formatearHora()`, `formatearFechaHora()`, `formatearNumeroFactura()`, `formatearNumeroRecibo()` |
| `src/utilidades/clases.ts` | Utilidad para combinar clases de Tailwind CSS requerida por shadcn/ui. | `combinarEstilos()` (y alias `cn`) |
| `src/pruebas/ayudantes-prueba.ts` | Creación de bases de datos SQLite en memoria (`:memory:`) aisladas con migraciones reales aplicadas. | `crearBaseDatosPrueba()` |
| `src/pruebas/base-errores-formatos.prueba.ts` | Suite de 65 pruebas automatizadas con Vitest para formatos, errores, migraciones y restricciones SQL. | Pruebas unitarias e integrales de T01 |

---

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas:** **65 pruebas pasadas** (`pnpm test`), migración verificada sobre base limpia (`pnpm run db:migrate`) y verificación estricta de tipos exitosa (`pnpm run verificar:tipos`).
- **Cumplimiento de arquitectura (`AGENTS.md`):**
  - Todos los archivos, tablas, columnas, funciones y tipos propios están en castellano descriptivo.
  - Separación total entre acceso a datos (`src/base-de-datos/`), errores (`src/errores/`), utilidades (`src/utilidades/`) y pruebas (`src/pruebas/`).
- **Errores detectados y corregidos (para pregunta de defensa P6.4):**
  - **Restricción de importe positivo en `movimientos_cuenta` (`src/base-de-datos/esquema.ts`, línea 186):** En la versión inicial generada por el agente durante el desarrollo, la restricción `movimientos_cuenta_importe_valido` usaba únicamente `importeValido(tabla.importe)` (que permite el valor `0`), mientras que en la tabla `pagos` sí exigía `AND ${tabla.importe} > 0`. En cuenta corriente un movimiento de débito o crédito por `$ 0,00` carece de sentido contable y ensucia el historial. Durante la auditoría se corrigió `src/base-de-datos/esquema.ts` y la migración `0000_inicial.sql` para exigir `(${importeValido(tabla.importe)}) AND ${tabla.importe} > 0`, y se agregó el caso de prueba en `src/pruebas/base-errores-formatos.prueba.ts` (línea 256) que verifica el rechazo de un movimiento con `importe: 0`.

---

## 4. Guía Rápida para Defender este Ticket en el Examen

1. **«Muéstrenme dónde se definen las tablas y cómo evitan errores de coma flotante en los precios.»**
   - Abrir [`src/base-de-datos/esquema.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts#L18-L21): mostrar la función `importeValido()` en la línea 19 (`typeof(columna) = 'integer' AND columna BETWEEN 0 AND 9007199254740991`) aplicada a `productos.precio`, `facturas.total`, `factura_items.precio_unitario`, `pagos.importe` y `movimientos_cuenta.importe`.
   - Abrir [`src/utilidades/formatos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/formatos.ts#L10-L49): mostrar `formatearMoneda()` y `pesosACentavos()`, que operan con enteros y `BigInt` sin multiplicar flotantes IEEE 754.
2. **«¿Cómo sabe el sistema si conectarse al archivo SQLite local o a Turso en producción?»**
   - Abrir [`src/base-de-datos/conexion.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/conexion.ts#L6-L20): mostrar `crearConexionBaseDatos()` y las líneas 14–17, donde lee `process.env.DATABASE_URL || "file:./local.db"` y `process.env.DATABASE_AUTH_TOKEN`.
3. **«¿Dónde se arman las respuestas de error de la API y cómo se transforma un error de Zod en un 422?»**
   - Abrir [`src/errores/manejador-errores.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/manejador-errores.ts#L21-L62): mostrar `normalizarError()` (línea 21). En las líneas 33–44 se intercepta `ErrorZod` y se transforma cada `issue` (incluyendo `unrecognized_keys` de `.strict()`) en `422 VALIDACION` con `details: [{ campo, mensaje }]`.
