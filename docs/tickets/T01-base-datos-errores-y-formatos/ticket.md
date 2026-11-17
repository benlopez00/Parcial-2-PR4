# Ticket T01 — Inicialización del Proyecto, Base de Datos, Control de Errores y Formatos

- **Responsable:** Integrante 1 (`rama: integrante-1`)
- **Hito:** Hito 1 — Base y Productos
- **Dependencias:** Ninguna (primer ticket del proyecto)

---

## 1. Objetivo

Inicializar el proyecto Next.js con TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM (`@libsql/client` y `drizzle-kit`), Zod y Vitest. Construir los tres pilares técnicos sobre los que se apoyan todos los demás tickets:
1. **Capa de Acceso a Datos (`src/base-de-datos/`):** Conexión dual (SQLite local / Turso remoto), esquema completo con las 9 tablas del sistema y primera migración.
2. **Capa de Control de Errores (`src/errores/`):** Clase `ErrorApi`, catálogo de los 22 códigos de error oficiales (Sección 11.8) y manejador centralizado de errores.
3. **Módulo de Formatos (`src/utilidades/formatos.ts`):** Funciones únicas para formatear moneda en centavos a pesos argentinos (`$ 12.345,50`), fechas (`dd/mm/aaaa`), horas y números de comprobante (`0001-00000001`).

---

## 2. Requerimientos y Reglas Incluidas

- **Modelo de datos mínimo (Sección 7):** Las 9 tablas (`usuarios`, `categorias`, `productos`, `movimientos_stock`, `clientes`, `facturas`, `factura_items`, `pagos`, `movimientos_cuenta`) con `id`, `fechaCreacion` e importes siempre enteros en centavos (Regla 10).
- **Formatos locales (Sección 8 y 10.6):** Moneda `$ 12.345,50`, fechas `dd/mm/aaaa` en zona horaria de Argentina (`America/Argentina/Buenos_Aires`), numeración `0001-00000001` y recibos `R 0001-00000001`.
- **Errores estándar de la API (Secciones 10.4, 11.1 y 11.8):** Formato `{ error: { code, message, details } }`.
- **Scripts obligatorios en `package.json` (Sección 9):** `db:migrate`, `db:seed`, `dev`, `build`, `test`.
- **Archivo `.env.example`:** Con `DATABASE_URL`, `DATABASE_AUTH_TOKEN` y `SESSION_SECRET`.

---

## 3. Archivos a Crear / Modificar

### Base de Datos (`src/base-de-datos/`)
- `drizzle.config.ts`: Configuración de `drizzle-kit` apuntando a `src/base-de-datos/esquema.ts` y salida en `src/base-de-datos/migraciones/`.
- `src/base-de-datos/conexion.ts`: Exporta la instancia `bd` de Drizzle conectada a SQLite local (`file:./local.db`) o Turso (`libsql://...`) según `process.env.DATABASE_URL`.
- `src/base-de-datos/esquema.ts`: Definición en castellano de las 9 tablas y sus tipos inferidos.
- `src/base-de-datos/migraciones/`: Migración inicial generada y verificada con `pnpm run db:migrate`.

### Control de Errores Separado (`src/errores/`)
- `src/errores/codigos-error.ts`: Objeto constante `CODIGOS_ERROR` con los 22 códigos de la Sección 11.8 (`JSON_INVALIDO`, `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS`, `SIN_PERMISO`, `NO_ENCONTRADO`, `CODIGO_DUPLICADO`, `DOCUMENTO_DUPLICADO`, `EMAIL_DUPLICADO`, `NOMBRE_DUPLICADO`, `CATEGORIA_EN_USO`, `STOCK_INSUFICIENTE`, `FACTURA_ANULADA`, `VALIDACION`, `PRODUCTO_INACTIVO`, `CUENTA_CORRIENTE_NO_HABILITADA`, `LIMITE_CREDITO_EXCEDIDO`, `MONTO_INSUFICIENTE`, `PAGO_SUPERA_DEUDA`, `SALDO_PENDIENTE`, `CONTRASENA_ACTUAL_INCORRECTA`, `OPERACION_SOBRE_SI_MISMO`, `ERROR_INTERNO`).
- `src/errores/error-api.ts`: Clase `ErrorApi extends Error` con propiedades `estadoHttp`, `codigo`, `mensaje` y `detalles`.
- `src/errores/manejador-errores.ts`: Función `convertirErrorARespuestaHttp(error)` y `convertirErrorAResultadoAccion(error)` que transforman `ErrorApi`, `ZodError` o errores de sintaxis JSON al formato oficial.
- `src/errores/verificadores-negocio.ts`: Verificadores base iniciales (`asegurarRolAdmin`, `asegurarRecursoExiste`).

### Utilidades (`src/utilidades/`)
- `src/utilidades/formatos.ts`:
  - `formatearMoneda(centavos: number): string` → `"$ 12.345,50"`
  - `pesosACentavos(pesos: number | string): number` → entero exacto en centavos
  - `formatearFecha(fechaIso: string | Date): string` → `"dd/mm/aaaa"`
  - `formatearFechaHora(fechaIso: string | Date): string` → `"dd/mm/aaaa HH:mm"`
  - `formatearNumeroFactura(puntoVenta: number, numero: number): string` → `"0001-00001233"`
  - `formatearNumeroRecibo(puntoVenta: number, numero: number): string` → `"R 0001-00000341"`

### Testing Separado (`src/pruebas/`)
- `src/pruebas/ayudantes-prueba.ts`: Función para crear una base SQLite en memoria (`:memory:`) con el esquema aplicado para usar en todos los tests.
- `src/pruebas/base-errores-formatos.prueba.ts`: Tests unitarios de `formatos.ts`, `ErrorApi`, `manejador-errores.ts` y creación de las 9 tablas en memoria.

---

## 4. Criterios de Aceptación

1. `pnpm run db:migrate` crea las 9 tablas sin errores sobre una base local limpia.
2. Ningún campo de importe en `esquema.ts` usa tipo flotante; todos son `integer`.
3. `formatearMoneda(1250000)` devuelve `"$ 12.500,00"` y `formatearMoneda(0)` devuelve `"$ 0,00"`.
4. `convertirErrorARespuestaHttp` convierte un `ZodError` en un `422` con `{ error: { code: "VALIDACION", message: "...", details: [{ campo, mensaje }] } }`.
5. `pnpm test` ejecuta y aprueba todas las pruebas de `src/pruebas/base-errores-formatos.prueba.ts`.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

Al ejecutar el **Prompt 3 (Auditoría)** sobre este ticket, se deben completar en `respuestas-defensa.md`:
- **P1.1:** ¿Dónde se definen las tablas de la base de datos?
- **P1.2:** ¿Dónde se conecta la aplicación con la base de datos? ¿Cómo sabe si usar la base local o la de Turso?
- **P1.3:** ¿Cómo se crea una tabla nueva o se agrega un campo? ¿Qué es una migración y dónde están?
- **P1.5:** ¿Cómo se guardan los importes? ¿Por qué no se usan números con coma flotante?
- **P2.5:** ¿Dónde se arma la respuesta de error que devuelve la API?
- **P5.2:** ¿Dónde se da formato a los importes y a las fechas?
