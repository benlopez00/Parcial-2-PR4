# AGENTS.md — Manual Técnico y Reglas de Arquitectura (Humanos + IA)

Este documento define las reglas obligatorias de arquitectura, estilo de código, nombres en castellano y separación de responsabilidades del proyecto. **Tanto los desarrolladores como los agentes de IA deben cumplir estas pautas sin excepción.**

---

## 1. Objetivo Principal: Legibilidad para la Defensa Oral

El examen se aprueba en una **defensa individual oral y práctica** donde cada alumno debe:
1. Mostrar en el código dónde vive cada regla de negocio, validación, consulta o componente.
2. Realizar una modificación en vivo en pocos minutos.

Para lograr que el código se entienda de un vistazo:
- **Todo se nombra en castellano y de forma descriptiva** (archivos, carpetas propias, variables, funciones, tipos, esquemas Zod, tablas y columnas).
- **El flujo normal de negocio nunca se ensucia con bloques largos de validación ni armado de errores HTTP:** el control de errores, las validaciones y el testing viven en archivos separados del flujo principal.
- **Cada función de servicio lleva un comentario breve arriba citando el requerimiento o regla que implementa** (por ejemplo: `// Implementa RF-V6 y Reglas 1, 2, 3, 4`).

---

## 2. Stack Tecnológico Obligatorio (Sección 9 de Requerimientos)

| Capa | Tecnología | Uso obligatorio |
| :--- | :--- | :--- |
| **Lenguaje** | TypeScript (strict) | Tipado explícito y claro en español. |
| **Framework** | Next.js (App Router) | Páginas en `src/app/` y API REST en `src/app/api/.../route.ts`. |
| **Base de Datos** | SQLite (local) / Turso libSQL (prod) | Seleccionada automáticamente según `DATABASE_URL` y `DATABASE_AUTH_TOKEN`. |
| **ORM** | Drizzle ORM + `drizzle-kit` | Esquema en `src/base-de-datos/esquema.ts` y migraciones en `src/base-de-datos/migraciones/`. |
| **Validación** | Zod | Esquemas compartidos entre cliente y servidor en `src/validaciones/`. |
| **Interfaz** | React + Tailwind CSS + shadcn/ui | Sin etiquetas HTML sueltas en las páginas; usar primitivas y componentes del dominio. |
| **Gráficos** | Chart.js + `react-chartjs-2` | Usado en el tablero de inicio (`/`). |
| **Autenticación** | Cookie firmada `httpOnly` (`SameSite=Lax`) | Secreto en `process.env.SESSION_SECRET`. Contraseñas con hash (`bcryptjs` / `argon2`). |
| **Pruebas** | Vitest | Pruebas separadas en `src/pruebas/*.prueba.ts`. |

---

## 3. Estructura Modular de Carpetas y Separación de Responsabilidades

```text
src/
├── base-de-datos/
│   ├── conexion.ts                    # Conexión única a SQLite local o Turso remoto
│   ├── esquema.ts                     # Definición de las 9 tablas con Drizzle ORM
│   ├── migraciones/                   # Archivos SQL generados por drizzle-kit
│   └── semilla.ts                     # Carga de datos iniciales llamando a los servicios
│
├── errores/                           # 1) CONTROL DE ERRORES (Separado del flujo normal)
│   ├── codigos-error.ts               # Constantes de los 22 códigos de error (Sección 11.8)
│   ├── error-api.ts                   # Clase ErrorApi(estadoHttp, codigo, mensaje, detalles)
│   ├── manejador-errores.ts           # Convierte cualquier ErrorApi o ZodError al JSON estándar
│   └── verificadores-negocio.ts       # Chequeos reutilizables (asegurarRolAdmin, asegurarStock, etc.)
│
├── validaciones/                      # 2) ESQUEMAS ZOD COMPARTIDOS (Cliente + Servidor)
│   ├── validacion-autenticacion.ts
│   ├── validacion-usuarios.ts
│   ├── validacion-categorias.ts
│   ├── validacion-productos.ts
│   ├── validacion-clientes.ts
│   ├── validacion-pagos.ts
│   └── validacion-facturas.ts
│
├── servicios/                         # 3) FLUJO NORMAL DE NEGOCIO (Limpio y secuencial)
│   ├── servicio-autenticacion.ts
│   ├── servicio-usuarios.ts
│   ├── servicio-categorias.ts
│   ├── servicio-productos.ts
│   ├── servicio-stock.ts              # Contiene moverStock(): ÚNICA función que altera existencias
│   ├── servicio-clientes.ts
│   ├── servicio-pagos.ts
│   ├── servicio-facturas.ts           # Contiene confirmarFactura() y anularFactura()
│   └── servicio-tablero.ts
│
├── utilidades/
│   ├── formatos.ts                    # formatearMoneda, formatearFecha, formatearHora, formatearNumeroFactura
│   ├── sesion.ts                      # Firmar/verificar cookie httpOnly y obtenerUsuarioActual() contra la BD
│   ├── envoltorio-ruta.ts             # Adaptador para Route Handlers (exige sesión y maneja errores)
│   └── envoltorio-accion.ts           # Adaptador para Server Actions ({ ok, datos } | { ok: false, error })
│
├── componentes/
│   ├── maquetacion/                   # Primitivas: ContenedorPagina, EncabezadoPagina, Apilar, Grilla, etc.
│   ├── estados/                       # EstadoCarga, EstadoVacio, EstadoError, DialogoConfirmacion
│   ├── formularios/                   # CampoFormulario, CampoImporte, InsigniaEstado, PaginadorListado
│   ├── navegacion/                    # PanelLateral, BarraSuperior, MenuMovil
│   └── dominio/                       # Componentes específicos por módulo (ventas, productos, clientes, etc.)
│
├── app/                               # Adaptadores Next.js (Páginas y las 31 rutas de API REST)
│   ├── login/page.tsx
│   ├── (sistema)/                     # Grupo de rutas protegidas que comparten el Layout con PanelLateral
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Tablero de inicio
│   │   ├── perfil/page.tsx
│   │   ├── ventas/...
│   │   ├── productos/...
│   │   ├── clientes/...
│   │   └── usuarios/...
│   └── api/                           # Las 31 rutas REST exactas de la Sección 11.9
│
└── pruebas/                           # 4) TESTING (Separado del flujo productivo)
    ├── ayudantes-prueba.ts            # Base de datos en memoria para tests rápidos y aislados
    ├── autenticacion-y-permisos.prueba.ts
    ├── productos-y-stock.prueba.ts
    ├── clientes-y-pagos.prueba.ts
    └── facturacion-y-concurrencia.prueba.ts
```

---

## 4. Reglas de Oro de las 4 Capas (Sección 10 de Requerimientos)

### 4.1. Capa de Servicios (`src/servicios/`) — Flujo Normal Limpio
1. **Cada regla de negocio vive en un único lugar: la capa de servicios.** Ningún `route.ts`, Server Action ni componente calcula totales, saldos ni existencias.
2. **Firma estándar:** Toda función de servicio (salvo `iniciarSesion`) recibe como primer argumento `usuarioActual: UsuarioAutenticado` y como segundo argumento `datosSinValidar: unknown`.
3. **Orden fijo de 4 pasos en cada función de servicio:**
   - **Paso 1:** Validar la entrada llamando al esquema de `src/validaciones/`.
   - **Paso 2:** Verificar permisos llamando a un verificador de `src/errores/verificadores-negocio.ts` (ej. `asegurarRolAdmin(usuarioActual)`).
   - **Paso 3:** Ejecutar las reglas de negocio y operaciones en base de datos (abriendo `bd.transaction(...)` siempre que se modifique más de una tabla).
   - **Paso 4:** Devolver el objeto con la forma pública exacta que pide la API REST.
4. **Invariante de Stock (`moverStock`):**
   - **Prohibido** hacer `UPDATE productos SET existencia = ...` fuera de `moverStock()` en `src/servicios/servicio-stock.ts`.
   - `moverStock()` se ejecuta dentro de una transacción, descuenta con condición atómica `WHERE id = ? AND existencia + ? >= 0` (evitando stock negativo incluso si dos vendedores venden la última unidad al mismo tiempo) e inserta el registro en `movimientos_stock`.

### 4.2. Capa de Control de Errores (`src/errores/`) — Separada del Flujo
1. **Nunca armar respuestas HTTP de error dentro de un servicio o ruta.**
2. Los servicios y verificadores solo lanzan `throw new ErrorApi(estadoHttp, codigo, mensaje, detalles)` o delegan en funciones de `src/errores/verificadores-negocio.ts` como:
   - `asegurarRolAdmin(usuario)` → lanza `403 SIN_PERMISO`
   - `asegurarExistenciaDisponible(items)` → lanza `409 STOCK_INSUFICIENTE` con `details`
   - `asegurarCuentaCorrienteHabilitada(cliente)` → lanza `422 CUENTA_CORRIENTE_NO_HABILITADA`
   - `asegurarLimiteCredito(saldoActual, totalVenta, limite)` → lanza `422 LIMITE_CREDITO_EXCEDIDO`
   - `asegurarPagoNoSuperaDeuda(importe, saldoActual)` → lanza `422 PAGO_SUPERA_DEUDA`
3. El archivo `src/errores/manejador-errores.ts` captura cualquier error en un solo lugar:
   - Si es `ErrorApi`, devuelve su `status` y `{ error: { code, message, details } }`.
   - Si es `ZodError`, lo transforma automáticamente en `422 VALIDACION` con `details: [{ campo, mensaje }]`.
   - Si es un error inesperado, lo registra con `console.error` en el servidor y devuelve `500 ERROR_INTERNO` sin filtrar detalles internos.

### 4.3. Capa de Validaciones (`src/validaciones/`)
1. Todo esquema de creación o edición (`POST` / `PATCH`) debe usar `.strict()` en Zod para **rechazar campos no previstos** con `422 VALIDACION`.
2. Gracias a `.strict()`:
   - Un `PATCH /api/productos/[id]` que envíe `existencia` es rechazado automáticamente (`422`).
   - Un `POST /api/facturas` que envíe el número completo de la tarjeta (`numeroTarjeta`) en lugar de `ultimos4` es rechazado automáticamente (`422`).

### 4.4. Capa de Interfaz (`src/componentes/` y `src/app/`)
1. **Referencia funcional obligatoria:** Antes de programar cualquier pantalla, revisar las capturas correspondientes en [`docs/pantallas/`](./docs/pantallas/INDICE.md) para incluir todos los filtros, columnas, pestañas, modales y atajos de teclado (`F2`, `F4`, `F8`, `F9`, `Enter`, `↑/↓`).
2. **Diseño propio con shadcn/ui y Tailwind:** No copiar el CSS de referencia, pero sí mantener una estética limpia, consistente y adaptable desde `360 px` de ancho.
3. **Sin HTML suelto en páginas (`page.tsx`):** Las páginas de `src/app/` deben componerse usando primitivas de `src/componentes/maquetacion/`, componentes de `shadcn/ui` y componentes de `src/componentes/dominio/`.
4. **Formatos centralizados:** Ningún componente formatea números o fechas por su cuenta; todos importan `formatearMoneda()`, `formatearFecha()`, `formatearFechaHora()` y `formatearNumeroComprobante()` desde `src/utilidades/formatos.ts`.

---

## 5. Reglas de Datos Críticas (Secciones 6, 7 y 11 de Requerimientos)

1. **Importes siempre en centavos (enteros):**
   - En la base de datos y en los JSON de la API, `$ 12.500,00` se guarda y transmite como el entero `1250000`.
   - Nunca usar `REAL` o `FLOAT` para dinero.
2. **Bajas lógicas:**
   - Usuarios, categorías, productos y clientes nunca hacen `DELETE`; se desactivan con `PATCH` (`activo: false` o `activa: false`).
   - Las facturas nunca se borran ni se editan; solo se anulan (`POST /api/facturas/[id]/anulacion`), quedando en estado `'anulada'`.
3. **Precios congelados y calculados en el servidor:**
   - Al emitir una factura (`POST /api/facturas`), el cliente solo envía `clienteId`, `items: [{ productoId, cantidad }]` y `pago`.
   - El servidor lee el precio y la descripción actuales de la tabla `productos`, calcula los subtotales y el total, y los copia en `factura_items`.
4. **Saldo de cliente = Débitos − Créditos:**
   - El saldo siempre coincide con la suma de movimientos de tipo `'debito'` menos los de tipo `'credito'` en `movimientos_cuenta`.
5. **Verificación de sesión en cada pedido:**
   - `obtenerUsuarioActual()` verifica la firma de la cookie `httpOnly` **y consulta la tabla `usuarios` en la base de datos**. Si el usuario fue desactivado (`activo === false`) o cambió su rol, el cambio aplica en el acto sin esperar a que venza la cookie.
