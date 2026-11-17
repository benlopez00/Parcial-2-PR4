# Plan técnico — T05: Backend de clientes

Estado: planificado. Base: `ramaAlvaro`, sobre `T01`–`T04` ya integrados.

## 1. Resumen del flujo

El módulo expone cuatro rutas REST para administrar clientes: listarlos con su saldo, consultar la ficha de uno, darlo de alta y editarlo o darlo de baja lógica.
Las rutas no deciden nada: exigen sesión mediante `envoltorioRuta` y delegan en `servicio-clientes.ts`, que valida con Zod, verifica permisos, aplica las reglas y devuelve la forma pública de la sección 11.5.
El saldo **nunca se guarda**: se calcula en cada consulta como débitos menos créditos sobre `movimientos_cuenta` (Regla 7), de modo que siempre coincide con el historial aunque lo escriban T06 y T08.
El documento se guarda tal como lo escribe el usuario (`28.456.123`) y se normaliza a dígitos únicamente para buscar y para detectar duplicados, así `28456123` y `28.456.123` son la misma persona.
A diferencia de productos, **ambos roles** pueden dar de alta y editar clientes: el vendedor necesita cargar al comprador en el mostrador (Sección 3 de requerimientos).

## 2. Archivos a crear o modificar

**Utilidades (`src/utilidades/`)**
- `documentos.ts` *(nuevo)*: `normalizarDocumento()`, compartido entre el servicio y los formularios del T07.

**Validaciones Zod (`src/validaciones/`)**
- `validacion-clientes.ts` *(nuevo)*: esquemas de listado, consulta por id, alta y edición. Todos con `.strict()`.

**Control de errores (`src/errores/`)**
- `verificadores-negocio.ts` *(modificar: agregar al final, sin reordenar lo existente)*:
  - `asegurarDocumentoClienteUnico()`
  - `asegurarClienteSinSaldoPendiente()`
  - `traducirErrorEscrituraCliente()`

**Servicios (`src/servicios/`)**
- `servicio-clientes.ts` *(nuevo)*: las cinco funciones de la sección 3.

**Adaptadores API (`src/app/api/`)**
- `clientes/route.ts` *(nuevo)*: `GET` y `POST`.
- `clientes/[id]/route.ts` *(nuevo)*: `GET` y `PATCH`.

**Pruebas (`src/pruebas/`)**
- `clientes.prueba.ts` *(nuevo)*: una prueba por criterio de aceptación.

No se toca `esquema.ts`: las tablas `clientes` y `movimientos_cuenta` ya quedaron definidas en el T01. **No hay migración en este ticket.**

## 3. Firmas de funciones principales y contratos

```ts
// src/utilidades/documentos.ts
normalizarDocumento(documento: string): string
// Deja solo dígitos. "28.456.123" y "28456123" devuelven "28456123".
```

```ts
// src/servicios/servicio-clientes.ts

interface ClientePublico {
  id: number; tipoDoc: "DNI" | "CUIT"; nroDoc: string; nombre: string;
  domicilio: string | null; telefono: string | null; email: string | null;
  cuentaCorriente: boolean; limiteCredito: number | null;
  saldo: number; disponible: number | null; activo: boolean;
}

calcularSaldoCliente(baseDatos, clienteId): Promise<number>
// Débitos − créditos de movimientos_cuenta. Única fuente de verdad del saldo.

listarClientes(usuarioActual, datosSinValidar, baseDatos?): Promise<ListadoClientes>
// 1. valida con esquemaListadoClientes
// 2. asegurarUsuarioAutenticado (ambos roles)
// 3. filtra por q (nombre o documento normalizado), conDeuda, ordena por saldo o nombre, pagina
// 4. { data, page, pageSize, total } y, si conDeuda=true, además totalAdeudado

obtenerClientePorId(usuarioActual, datosSinValidar, baseDatos?): Promise<FichaCliente>
// Devuelve el cliente con saldo y disponible, más ultimasFacturas (6, de la más nueva a la más vieja).
// 404 NO_ENCONTRADO si no existe.

crearCliente(usuarioActual, datosSinValidar, baseDatos?): Promise<ClientePublico>
// 1. valida con esquemaCrearCliente
// 2. asegurarUsuarioAutenticado
// 3. compara el documento normalizado contra los existentes del mismo tipoDoc → 409
// 4. inserta y devuelve el cliente con saldo 0

actualizarCliente(usuarioActual, datosSinValidar, baseDatos?): Promise<ClientePublico>
// 1. valida con esquemaActualizarCliente (cambios parciales, al menos uno)
// 2. asegurarUsuarioAutenticado
// 3. existe → calcula saldo → si se desactiva o se quita la cuenta corriente con saldo ≠ 0, 422
//    si cambia el documento, vuelve a controlar duplicado normalizado
// 4. actualiza y devuelve el cliente
```

**Esquemas Zod** (`validacion-clientes.ts`):

| Esquema | Campos |
| :--- | :--- |
| `esquemaListadoClientes` | `q`, `conDeuda` (`"true"`/`"false"`), `orden` (`"nombre"`/`"saldo"`), `activo` (`"true"`/`"false"`/`"todos"`), `page`, `pageSize` |
| `esquemaObtenerCliente` | `id` |
| `esquemaCrearCliente` | `tipoDoc`, `nroDoc`, `nombre` + opcionales `domicilio`, `telefono`, `email`, `cuentaCorriente`, `limiteCredito` |
| `esquemaEditarCliente` | los de alta en `.partial()` + `activo`, con al menos un cambio |
| `esquemaActualizarCliente` | `{ id, cambios }` |

`saldo` y `disponible` **no aparecen en ningún esquema de entrada**: son siempre calculados.

> **Agregado fuera del alcance del `ticket.md`, declarado:** el filtro `activo` del listado (`"true"` por defecto). Sin él, un cliente dado de baja seguiría apareciendo en el listado principal, lo que contradice la Regla 12 de bajas lógicas. El T07 tiene que saber que existe.

## 4. Reglas de negocio y errores controlados

| Situación | Dónde vive | Error |
| :--- | :--- | :--- |
| Documento repetido (mismo tipo, mismo número normalizado) | `asegurarDocumentoClienteUnico()` | `409 DOCUMENTO_DUPLICADO` |
| Colisión del índice único en escrituras simultáneas | `traducirErrorEscrituraCliente()` | `409 DOCUMENTO_DUPLICADO` |
| Baja o quita de cuenta corriente con saldo ≠ 0 (RF-C7) | `asegurarClienteSinSaldoPendiente()` | `422 SALDO_PENDIENTE` |
| Cliente inexistente | `asegurarRecursoExiste()` *(ya existe)* | `404 NO_ENCONTRADO` |
| Campo no previsto, por ejemplo `saldo` | `.strict()` de Zod + `manejador-errores.ts` | `422 VALIDACION` |
| Sin sesión | `asegurarUsuarioAutenticado()` *(ya existe)* | `401 NO_AUTENTICADO` |

**Regla 7 (saldo = débitos − créditos):** vive en `calcularSaldoCliente()` y en la subconsulta del listado. Ninguna ruta, componente ni Server Action calcula un saldo.

**Permisos:** las cinco funciones usan `asegurarUsuarioAutenticado()`. **Ninguna usa `asegurarRolAdmin()`** — es la diferencia con productos y está en la tabla de la Sección 3 del enunciado.

## 5. Preguntas de defensa cubiertas

- **¿El saldo de un cliente se guarda o se calcula?** Se calcula, en `calcularSaldoCliente()` y en la subconsulta de `listarClientes()`, sumando `movimientos_cuenta`. La tabla `clientes` no tiene columna de saldo.
- **¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?** En `validacion-clientes.ts`, que importan tanto el servicio como los formularios del T07.
- **¿Qué responde la API si se carga un cliente con un documento que ya existe?** `409 DOCUMENTO_DUPLICADO`.
- **Cambio pequeño 4 (teléfono de 8 dígitos mínimo):** se resuelve en un solo lugar, el campo `telefono` de `validacion-clientes.ts`, y aplica a formulario y servidor a la vez.
