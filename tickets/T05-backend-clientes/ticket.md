# Ticket T05 — Backend de Clientes (Alta, Edición, Baja Lógica, Búsqueda y Saldos)

- **Responsable:** Integrante 2 (`rama: integrante-2`)
- **Hito:** Hito 2 — Clientes
- **Dependencias:** `T01`, `T02`

---

## 1. Objetivo

Implementar los esquemas Zod, verificadores de negocio, servicios y rutas de API REST del módulo **Clientes** (`GET /api/clientes`, `POST /api/clientes`, `GET /api/clientes/[id]`, `PATCH /api/clientes/[id]`), asegurando el cálculo del saldo derivado de los movimientos de cuenta corriente y el bloqueo de desactivación o quita de cuenta corriente cuando el cliente tiene deuda pendiente.

---

## 2. Requerimientos y Reglas Incluidas

- **RF-C1 y RF-C6 Listado y Saldos (`GET /api/clientes`):**
  - Búsqueda `q` por nombre o número de documento (**ignorando puntos y guiones** al comparar documentos).
  - Filtro `conDeuda=true` (clientes con `saldo > 0`), orden por `saldo` (de mayor a menor) o `nombre`, y paginación.
  - Cuando viene `conDeuda=true`, la respuesta incluye además `totalAdeudado` junto a los datos de paginación.
- **RF-C2 y RF-V2 Alta y edición (`POST /api/clientes` y `PATCH /api/clientes/[id]`):**
  - Campos: `tipoDoc` (`DNI` o `CUIT`), `nroDoc` (único, devuelve `409 DOCUMENTO_DUPLICADO`), `nombre`, y opcionales `domicilio`, `telefono`, `email`, `cuentaCorriente` (booleano) y `limiteCredito` (en centavos o `null`).
  - Es la misma ruta que usará el modal de alta rápida desde Nueva Venta.
  - El esquema usa `.strict()` y **jamás acepta `saldo` como dato de entrada**.
- **RF-C3 Ficha del cliente (`GET /api/clientes/[id]`):**
  - Devuelve el cliente con `saldo`, `disponible` (`limiteCredito - saldo`, o `null` si no tiene límite) y sus 6 últimas facturas en `ultimasFacturas`.
- **RF-C7 Baja lógica y protección de saldo (`PATCH /api/clientes/[id]`):**
  - Si se intenta desactivar (`activo: false`) o deshabilitar la cuenta corriente (`cuentaCorriente: false`) a un cliente cuyo `saldo !== 0`, lanza `422 SALDO_PENDIENTE`.
- **Regla 7:** El saldo del cliente se calcula siempre como `débitos − créditos` de `movimientos_cuenta`.

---

## 3. Archivos a Crear / Modificar

- **Validaciones (`src/validaciones/`):**
  - `src/validaciones/validacion-clientes.ts`: Esquemas Zod para filtros de búsqueda, alta de cliente y edición de cliente (con `.strict()`).
- **Verificadores de Error (`src/errores/verificadores-negocio.ts`):**
  - `asegurarDocumentoClienteUnico` (`409 DOCUMENTO_DUPLICADO`).
  - `asegurarClienteSinSaldoPendiente` (`422 SALDO_PENDIENTE`).
- **Servicios (`src/servicios/`):**
  - `src/servicios/servicio-clientes.ts`:
    - `calcularSaldoCliente(txOBd, clienteId)`
    - `listarClientes(usuarioActual, filtros)`
    - `obtenerClientePorId(usuarioActual, id)`
    - `crearCliente(usuarioActual, datos)`
    - `actualizarCliente(usuarioActual, id, datos)`
- **Rutas API REST (4 endpoints en `src/app/api/clientes/`):**
  - `GET /api/clientes` y `POST /api/clientes` (`src/app/api/clientes/route.ts`)
  - `GET /api/clientes/[id]` y `PATCH /api/clientes/[id]` (`src/app/api/clientes/[id]/route.ts`)
- **Testing Separado (`src/pruebas/`):**
  - `src/pruebas/clientes.prueba.ts`: Pruebas de alta de cliente, documento duplicado ignorando puntos/guiones (`409`), búsqueda por DNI con o sin puntos, cálculo de `saldo` y `disponible`, y rechazo `422 SALDO_PENDIENTE` al intentar dar de baja un cliente con deuda.

---

## 4. Criterios de Aceptación

1. Buscar `q=28456123` o `q=28.456.123` en `GET /api/clientes` encuentra al cliente con documento `"28.456.123"`.
2. Si un cliente tiene límite `40000000` y saldo `1440000`, la API devuelve `disponible: 38560000`. Si `limiteCredito` es `null`, `disponible` es `null`.
3. Un `PATCH /api/clientes/[id]` que intente pasar `"saldo": 0` es rechazado con `422 VALIDACION`.
4. Intentar desactivar un cliente con saldo mayor a cero devuelve `422 SALDO_PENDIENTE`.
5. Ambos roles (`admin` y `vendedor`) pueden dar de alta y editar clientes (según tabla de la Sección 3 de Requerimientos).

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P1.6 (parte clientes):** ¿El saldo de un cliente se guarda o se calcula?
- **Ejercicio de cambio pequeño 4:** Exigir que el teléfono de un cliente tenga al menos 8 dígitos, en el formulario y en el servidor.
