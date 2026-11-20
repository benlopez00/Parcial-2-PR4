# Plan técnico — T03: categorías, productos y stock

## 1. Resumen del flujo

El ticket implementa el catálogo y la administración de categorías y productos, con bajas lógicas e historial de stock.
Cada pedido entra por una ruta protegida que obtiene el usuario vigente y delega en un servicio, sin reglas de negocio en el adaptador.
El servicio valida con Zod, verifica permisos, consulta o modifica mediante Drizzle y devuelve el contrato público de la API.
Toda variación de existencias pasa por `moverStock()`: actualización condicional e inserción del movimiento dentro de la misma transacción.
Los errores se convierten al JSON estándar en el manejador central, y las pruebas comprueban permisos, atomicidad y coincidencia entre existencia y movimientos.

Alcance: RF-P1 a RF-P7 y Reglas 1, 2, 10, 11 y 12. Se apoya en T01/T02, cuyas tablas, sesión, envoltorio de rutas y ayudantes de pruebas ya existen. Es exclusivamente backend: las pantallas pertenecen a T04 y este ticket no requiere capturas de referencia.

## 2. Archivos a crear o modificar

### Base de datos / Utilidades

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/base-de-datos/conexion.ts` | Exportar el tipo `TransaccionBaseDatos`, inferido del argumento del callback de `BaseDatos.transaction`, para exigir una transacción real en `moverStock()` sin usar `any`. |
| Crear | `src/utilidades/fechas-consulta.ts` | Convertir días argentinos de los filtros a límites ISO UTC, sin depender de la zona horaria del servidor. |
| Crear | `src/utilidades/transacciones.ts` | Ejecutar `bd.transaction` con reintentos acotados exclusivamente ante contención transitoria de SQLite. Necesidad confirmada durante la prueba con dos conexiones. |

Se reutilizan sin modificar `src/base-de-datos/esquema.ts`, `src/utilidades/sesion.ts`, `src/utilidades/envoltorio-ruta.ts` y `src/utilidades/formatos.ts`. Las tablas `categorias`, `productos` y `movimientos_stock` ya tienen las columnas, claves, índices y restricciones necesarias: no se prevén migraciones ni cambios de semilla. La referencia a factura usa `formatearNumeroComprobante()`.

### Validaciones Zod

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/validaciones/validacion-categorias.ts` | Esquemas `esquemaListadoCategorias`, `esquemaCrearCategoria`, `esquemaEditarCategoria` y `esquemaActualizarCategoria`; identificadores y cambios parciales estrictos. |
| Crear | `src/validaciones/validacion-productos.ts` | Esquemas `esquemaListadoProductos`, `esquemaObtenerProducto`, `esquemaCrearProducto`, `esquemaEditarProducto`, `esquemaActualizarProducto`, `esquemaMovimientoManual`, `esquemaRegistrarMovimientoManual`, `esquemaMoverStock`, `esquemaListadoMovimientosProducto` y `esquemaListadoMovimientosStockGeneral`. |

Los tipos de entradas se infieren de los esquemas; los esquemas compartidos no importan conexión, sesión ni código exclusivo del servidor.

### Control de errores y verificadores

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/errores/verificadores-negocio.ts` | Incorporar verificadores de unicidad, categoría en uso, permisos de filtros/movimientos y stock; traducir colisiones de los índices únicos de categorías y productos. |

Se reutilizan sin modificar `src/errores/codigos-error.ts`, `src/errores/error-api.ts` y `src/errores/manejador-errores.ts`: los códigos requeridos y la conversión de `ZodError` ya están implementados.

### Flujo normal en servicios

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/servicios/servicio-categorias.ts` | `listarCategorias`, `crearCategoria`, `actualizarCategoria` y tipo `CategoriaPublica`. |
| Crear | `src/servicios/servicio-productos.ts` | `listarProductos`, `obtenerProductoPorId`, `crearProducto`, `actualizarProducto` y tipos `ProductoPublico`, `ListadoProductos`. |
| Crear | `src/servicios/servicio-stock.ts` | `moverStock`, `registrarMovimientoManual`, `listarMovimientosProducto`, `listarMovimientosStockGeneral` y tipos `MovimientoStockPublico`, `ListadoMovimientosStock`. Único lugar que actualiza `productos.existencia`. |

### Adaptadores API / Páginas / Componentes

Se crean exactamente seis archivos `route.ts` para los diez endpoints (combinaciones de método y URL):

| Ruta exacta del archivo | Métodos y servicios delegados |
| --- | --- |
| `src/app/api/categorias/route.ts` | `GET` → `listarCategorias`; `POST` → `crearCategoria`. |
| `src/app/api/categorias/[id]/route.ts` | `PATCH` → `actualizarCategoria`. |
| `src/app/api/productos/route.ts` | `GET` → `listarProductos`; `POST` → `crearProducto`. |
| `src/app/api/productos/[id]/route.ts` | `GET` → `obtenerProductoPorId`; `PATCH` → `actualizarProducto`. |
| `src/app/api/productos/[id]/movimientos/route.ts` | `GET` → `listarMovimientosProducto`; `POST` → `registrarMovimientoManual`. |
| `src/app/api/movimientos-stock/route.ts` | `GET` → `listarMovimientosStockGeneral`. |

No se crean páginas, componentes ni Server Actions en T03.

Todos los métodos usan `envoltorioRuta` con sesión obligatoria. Los `POST` leen cuerpo y devuelven `201`; los `PATCH` leen cuerpo y devuelven `200`; los `GET` devuelven `200`. Los parámetros de URL, consulta y cuerpo se entregan al servicio para su validación, sin mezclar el cuerpo con campos confiables ni permitir que reemplace el identificador de la URL.

### Pruebas separadas

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/pruebas/productos-y-stock.prueba.ts` | Casos funcionales de servicios, rollback, filtros, historial e invariante de existencias sobre SQLite aislado. |
| Crear | `src/pruebas/api-productos-y-stock.prueba.ts` | Contratos HTTP de los diez endpoints, sesión, roles, cuerpos estrictos y errores normalizados, ejecutando servicios reales contra la base de prueba. |

Se reutiliza sin modificar `src/pruebas/ayudantes-prueba.ts` para crear bases en memoria, aplicar las migraciones y crear usuarios/cookies. Los escenarios concurrentes pueden usar conexiones separadas a un archivo SQLite temporal, cerrado y eliminado al finalizar, dentro de los archivos de prueba anteriores.

## 3. Firmas de funciones principales y contratos

### Convenciones comunes

Cada función pública de servicio recibe primero `usuarioActual: UsuarioAutenticado` y después `datosSinValidar: unknown`. Las que abren operaciones usan un tercer argumento opcional `baseDatos: BaseDatos = bd`, siguiendo la inyección ya utilizada por T02. Cada una lleva un comentario breve que cita sus RF y reglas.

El orden es siempre: **1)** validar entrada con el esquema correspondiente; **2)** verificar permisos mediante `verificadores-negocio.ts`; **3)** ejecutar consultas/reglas y escrituras, transaccionales cuando corresponde; **4)** devolver la proyección pública. Las lecturas admiten admin y vendedor mediante `asegurarUsuarioAutenticado`; las escrituras administrativas llaman a `asegurarRolAdmin`.

Hay una discrepancia entre la firma abreviada `moverStock(tx, datosMovimiento)` del ticket y la firma obligatoria de `AGENTS.md`. Se adopta `moverStock(usuarioActual, datosSinValidar, transaccion)`, manteniendo la transacción obligatoria como tercer argumento. Los futuros consumidores de T08 deberán usar esta firma.

Contratos de salida:

- `CategoriaPublica`: `{ id: number, nombre: string, activa: boolean }`. La sección 11.4 no especifica un ejemplo completo para categoría; esta proyección es la decisión de contrato para T03.
- `ProductoPublico`: `{ id, codigo, descripcion, categoria: { id, nombre }, precio, existencia, stockMinimo, bajoMinimo, activo }`, con números y booleanos según el ejemplo de 11.4; `precio` es un entero en centavos y `bajoMinimo` se calcula exclusivamente en servicios como `existencia < stockMinimo`.
- `MovimientoStockPublico`: `{ id, producto: { id, codigo }, tipo, cantidad, existenciaResultante, motivo, referencia, usuario: { id, nombre }, fecha }`. `cantidad` lleva signo; `fecha` es ISO UTC; `referencia` es `null` o `{ facturaId, numero }`, con número de comprobante formateado. Se persiste `observacion`, aunque el ejemplo público de 11.4 no la incluye.
- `ListadoProductos` y `ListadoMovimientosStock`: `{ data: elementosPublicos[], page: number, pageSize: number, total: number }`. Valores predeterminados: página 1, tamaño 20, máximo 100. No se exponen filas completas, fechas de creación internas ni datos de autenticación.

### Categorías

Todas las firmas siguientes terminan con `baseDatos: BaseDatos = bd`:

| Firma | Entrada validada | Pasos 3 y 4 después de validar y autorizar |
| --- | --- | --- |
| `listarCategorias(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<CategoriaPublica[]>` | Objeto vacío para una consulta sin filtros. | Consultar solo activas, ordenar por nombre e id y devolver arreglo sin paginación. |
| `crearCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<CategoriaPublica>` | `{ nombre }`. | Verificar nombre único, insertar activa y devolver categoría. Traducir también colisiones del índice único. |
| `actualizarCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<CategoriaPublica>` | `{ id, cambios: { nombre?, activa? } }`, con al menos un cambio. | En una transacción verificar existencia y unicidad excluyendo el propio id; si se desactiva, comprobar que no tenga productos activos; actualizar y devolver categoría. |

Los nombres se recortan y no pueden quedar vacíos. La unicidad incluye categorías inactivas y respeta la comparación del índice existente; no se inventa una normalización de mayúsculas diferente de la base.

### Productos

| Firma | Entrada validada | Pasos 3 y 4 después de validar y autorizar |
| --- | --- | --- |
| `listarProductos(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ListadoProductos>` | `{ q?, categoriaId?, bajoMinimo?, activo?, page?, pageSize? }`. | Componer filtros parametrizados, unir categoría, contar con los mismos filtros, ordenar por descripción e id y devolver página con `bajoMinimo` calculado. |
| `obtenerProductoPorId(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ProductoPublico>` | `{ id }`. | Consultar producto y categoría, exigir existencia y devolver proyección, conservando acceso al historial de productos desactivados. |
| `crearProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ProductoPublico>` | `{ codigo, descripcion, categoriaId, precio, stockMinimo, stockInicial? }`. | En una transacción comprobar categoría existente y código único; insertar activo con existencia predeterminada cero; si `stockInicial > 0`, llamar a `moverStock` con tipo `ingreso` y motivo `Stock inicial` usando esa misma transacción; devolver producto con existencia final. |
| `actualizarProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ProductoPublico>` | `{ id, cambios: { codigo?, descripcion?, categoriaId?, precio?, stockMinimo?, activo? } }`. | En una transacción comprobar producto, categoría destino si cambia y código único excluyendo el propio id; actualizar únicamente campos permitidos y devolver producto. Nunca asignar `existencia`. |

Detalles de validación y consultas:

- Cuerpos de alta/edición y objetos contenedores con `.strict()`. `existencia` se rechaza tanto en alta como en edición; `stockInicial` solo pertenece al alta. Edición vacía también devuelve validación.
- Texto recortado y obligatorio; identificadores enteros positivos seguros; importes, mínimos y stock inicial enteros seguros no negativos. `stockInicial` omitido equivale a cero; cero no genera un movimiento.
- Los números del cuerpo deben ser números JSON; la conversión de texto se limita a parámetros de URL/consulta. Los booleanos del cuerpo deben ser booleanos reales.
- `q` busca por código o descripción, escapando comodines de `LIKE`. `categoriaId` filtra por relación; `bajoMinimo` acepta `true`/`false` como texto y solo `true` activa `existencia < stockMinimo`.
- `activo` acepta `true`, `false` o `todos` y por defecto vale `true`. Se reserva la consulta de inactivos o de todos a admin; la especificación menciona expresamente `todos` para admin y este plan aplica el mismo criterio a `false`. El acceso individual e historial sigue disponible para ambos roles.
- Asignar un producto activo a una categoría y desactivar esa categoría deben comprobarse dentro de las transacciones respectivas: no puede quedar una categoría desactivada con productos activos. Se permite mantener la categoría histórica de un producto inactivo; para activar un producto se exige categoría activa. Una categoría destino inexistente devuelve `404`, y una existente inactiva incompatible con el estado final devuelve `422 VALIDACION` sobre `categoriaId`.

### Stock

| Firma | Entrada validada | Pasos 3 y 4 después de validar y autorizar |
| --- | --- | --- |
| `registrarMovimientoManual(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<MovimientoStockPublico>` | `{ productoId, movimiento: { tipo, cantidad, motivo, observacion? } }`; `tipo` solo ingreso/egreso y cantidad positiva. | Abrir transacción, llamar a `moverStock` con el usuario y los datos validados, devolver movimiento público. No actualizar stock ni insertar movimientos por cuenta propia. |
| `moverStock(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, transaccion: TransaccionBaseDatos): Promise<MovimientoStockPublico>` | `{ productoId, tipo, cantidad, motivo, observacion?, facturaId? }`; cantidad positiva, tipo ingreso/egreso/venta/anulación (`anulacion` en código). | Verificar producto; derivar signo; ejecutar actualización condicional con `RETURNING`; verificar resultado; insertar movimiento con existencia devuelta, usuario actual y referencia; devolver movimiento público dentro de la transacción recibida. |
| `listarMovimientosProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ListadoMovimientosStock>` | `{ productoId, page?, pageSize? }`. | Exigir producto existente, contar y consultar movimientos asociados, unir usuario/producto/factura y devolver página por fecha descendente e id descendente. Producto existente sin movimientos devuelve lista vacía. |
| `listarMovimientosStockGeneral(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos?: BaseDatos): Promise<ListadoMovimientosStock>` | `{ productoId?, tipo?, desde?, hasta?, page?, pageSize? }`. | Aplicar filtros, contar y consultar con las mismas condiciones, unir referencias y devolver página por fecha descendente e id descendente. Un filtro sin coincidencias devuelve lista vacía. |

`esquemaMoverStock` valida también las llamadas internas. Para ingreso/egreso exige los motivos manuales permitidos; venta/anulación exigen `facturaId`, mientras que los manuales no lo aceptan. El usuario se toma del primer argumento, nunca del cuerpo. Venta admite ambos roles; ingreso, egreso y anulación exigen admin mediante un verificador por tipo. T03 prepara estos tipos para T08 sin implementar facturación.

La cantidad interna también es una magnitud positiva; `moverStock` es quien aplica signo negativo a venta/egreso y positivo a ingreso/anulación. La actualización usa `WHERE id = ? AND existencia + ? >= 0`, parámetros enlazados y suma en SQL, nunca lectura seguida de asignación calculada en JavaScript. También se controla que el resultado no supere el entero seguro; ese caso es `422 VALIDACION`, no falta de stock. `RETURNING` proporciona la existencia resultante efectiva.

Si la actualización no afecta filas, se distingue producto inexistente de stock insuficiente y se lanza el error correspondiente. No se inserta ningún movimiento fallido. Si falla la inserción del movimiento, el error debe propagarse y revertir también la actualización. `moverStock` no abre ni confirma otra transacción: recibe la del llamador para participar luego en ventas y anulaciones completas.

**Ajuste verificado durante el desarrollo:** `ejecutarTransaccionEscritura(baseDatos, operacion)` abre la transacción y reintenta hasta seis veces adicionales solo ante `SQLITE_BUSY`, `SQLITE_BUSY_SNAPSHOT` o `TRANSACTION_ACTIVE`, reconocidos por `esBloqueoTransitorioSqlite` en el módulo de errores. Las esperas ceden el hilo para permitir el cierre de la escritura competidora; no se reintentan errores de negocio ni otros fallos. Los callbacks solo ejecutan operaciones de base de datos. La prueba concurrente usa un proceso separado para liberar los archivos nativos de SQLite antes de limpiarlos en Windows.

### Utilidades y esquemas de fechas

`convertirRangoDiasAInstantesUtc(rango: { desde?: string; hasta?: string }): { desdeInclusivo?: string; hastaExclusivo?: string }`, en `src/utilidades/fechas-consulta.ts`, recibe días previamente validados. Convierte inicio del día argentino a UTC y el límite final al inicio del día argentino siguiente. Por ejemplo, `2026-11-16` abarca desde `2026-11-16T03:00:00.000Z` hasta antes de `2026-11-17T03:00:00.000Z`. El servicio aplica `>= desdeInclusivo` y `< hastaExclusivo`.

Zod exige fechas calendario reales `AAAA-MM-DD`, rechaza rangos invertidos y admite filtros con un solo extremo. El filtro `tipo` del historial general admite los cuatro tipos de stock. No se interpreta un texto `false` con coerción booleana que lo convierta en verdadero.

## 4. Reglas de negocio y errores controlados

Las consultas y la coordinación transaccional viven en servicios; las decisiones que lanzan `ErrorApi` viven en verificadores. Ningún servicio ni ruta arma respuestas HTTP. Los verificadores nuevos de esta tabla se incorporan a `src/errores/verificadores-negocio.ts`:

| HTTP / código 11.8 | Verificador o mecanismo | Dónde se aplica |
| --- | --- | --- |
| `409 NOMBRE_DUPLICADO` | Nuevo `asegurarNombreCategoriaUnico(enUso: boolean): void`. | Alta y edición de categoría; la consulta excluye el id propio al editar y contempla inactivas. |
| `409 CATEGORIA_EN_USO` | Nuevo `asegurarCategoriaSinProductosActivos(tieneProductosActivos: boolean): void`. | Antes de desactivar una categoría, dentro de la transacción. |
| `409 CODIGO_DUPLICADO` | Nuevo `asegurarCodigoProductoUnico(enUso: boolean): void`. | Alta y edición de producto; incluye productos inactivos. |
| `409 STOCK_INSUFICIENTE` | Nuevo `asegurarStockSuficiente(actualizacionRealizada: boolean, detalle: { productoId: number; codigo: string; solicitado: number; disponible: number }): void`. | En `moverStock`, sobre el resultado de la actualización atómica, una vez descartado recurso inexistente o desborde. Devuelve `details` con el producto y las cantidades. |
| `403 SIN_PERMISO` | Reutilizar `asegurarRolAdmin(usuarioActual)`; nuevos `asegurarFiltroEstadoProductosPermitido(usuarioActual: UsuarioAutenticado, activo: "true" \| "false" \| "todos"): void` y `asegurarPermisoMovimientoStock(usuarioActual: UsuarioAutenticado, tipo: "ingreso" \| "egreso" \| "venta" \| "anulacion"): void`. | Altas/ediciones, movimientos manuales, filtro de inactivos/todos y control interno por tipo en `moverStock`. Los nuevos verificadores delegan en el control de rol existente. |
| `404 NO_ENCONTRADO` | Reutilizar `asegurarRecursoExiste(recurso, nombreRecurso)`. | Producto/categoría de una operación individual, producto del historial y referencias requeridas. |
| `422 VALIDACION` | Zod y manejador central; nuevos `asegurarCategoriaCompatibleConProducto(categoriaActiva: boolean, productoActivo: boolean): void` y `asegurarExistenciaDentroDeRango(existencia: number, variacion: number): void`. | Campos desconocidos, tipos y valores inválidos, motivos incorrectos, fechas/paginación, edición vacía, categoría incompatible y suma de existencias fuera del entero seguro. Los dos verificadores lanzan `ErrorApi` con detalles por campo. |
| `401 NO_AUTENTICADO` | Reutilizar `asegurarSesionValida` y `asegurarUsuarioAutenticado`. | `obtenerUsuarioActual()` desde `envoltorioRuta` y verificación en servicios de lectura. La cookie se contrasta con el usuario vigente en BD en cada pedido. |
| `400 JSON_INVALIDO` | Lectura del cuerpo en el envoltorio y manejador existente. | JSON mal formado en los endpoints con cuerpo. |
| `500 ERROR_INTERNO` | Manejador central existente. | Fallos inesperados: registro interno con `console.error` y respuesta sin detalles técnicos. |

Se agregan `traducirErrorEscrituraCategoria(error: unknown): never` y `traducirErrorEscrituraProducto(error: unknown): never` junto a los verificadores. Solo traducen la colisión del índice único correspondiente, incluyendo errores encapsulados en `cause`, al mismo verificador de unicidad. Los demás errores se relanzan. La comprobación previa mejora el mensaje, pero el índice único es la garantía final ante concurrencia. El `catch` del servicio se limita a delegar esta traducción.

Motivos manuales cerrados, validados en Zod por tipo:

- `ingreso`: `Reposición`, `Stock inicial`, `Devolución de cliente`.
- `egreso`: `Rotura`, `Vencimiento`, `Ajuste de inventario`, `Uso interno`.

No se utiliza `PRODUCTO_INACTIVO` para prohibir ajustes administrativos del historial: la sección 11.8 lo reserva a la venta de un producto inactivo, cuya validación corresponde a T08. No se implementan códigos de clientes, pagos ni facturación en este ticket.

Verificación prevista para el desarrollo:

1. Alta con `stockInicial: 15`: existencia 15 y un único ingreso `+15` con motivo `Stock inicial`. Alta con cero u omisión: existencia cero sin movimientos ficticios.
2. Rechazar `existencia` en POST/PATCH, `stockInicial` en PATCH, campos adicionales, cuerpos vacíos de edición, decimales, negativos y motivos incompatibles; comprobar `422 VALIDACION` y detalles por campo en HTTP.
3. Código/nombre repetido tanto en alta como edición, incluyendo registros inactivos; permitir conservar el propio código/nombre y traducir colisiones reales del índice a `409`.
4. Categoría con productos activos: baja rechazada sin cambios; con solo productos inactivos: baja permitida. Verificar referencias inexistentes y compatibilidad al activar/asignar productos.
5. Egreso superior al stock: `409 STOCK_INSUFICIENTE`, existencia intacta y ningún movimiento nuevo; egreso exacto deja cero; ingreso/egreso guardan signo, usuario, motivo, observación y existencia resultante.
6. Forzar un fallo al insertar el movimiento y comprobar rollback de la actualización; si ocurre durante alta con stock, tampoco debe sobrevivir el producto.
7. Dos egresos de la última unidad desde conexiones independientes a la misma base: solo uno persiste y el otro devuelve falta de stock al evaluar el estado vigente, sin movimiento huérfano. Distinguir contención del motor de falta real de stock; no convertir cualquier error de SQLite en `STOCK_INSUFICIENTE`. La concurrencia de facturas completas se prueba en T08.
8. Tras una secuencia de altas, ingresos y egresos, `SUM(movimientos_stock.cantidad) === productos.existencia`; revisar con `rg` que las asignaciones/actualizaciones de existencia estén exclusivamente en `moverStock`.
9. Probar catálogo por texto, categoría, estado, bajo mínimo estricto (igual al mínimo no cuenta), página/tamaño/total y roles; categorías activas sin paginar; historial descendente con desempate por id, referencia a factura, filtros de tipo y límites de días argentinos.
10. Probar los diez endpoints: sesión ausente/inválida, vendedor con entrada válida a cada escritura administrativa, estados `200`/`201`, cuerpos públicos y códigos `400`/`401`/`403`/`404`/`409`/`422`. Comprobar que la baja conserva datos e historial y que no se exponen datos internos.
11. Ejecutar `pnpm test` para toda la suite y `pnpm run verificar:tipos`. Estos comandos se ejecutarán durante el desarrollo; esta etapa solo modifica el plan.

## 5. Preguntas de defensa cubiertas

| Pregunta de `respuestas-defensa.md` | Respuesta demostrable al terminar T03 | Archivos y evidencia previstos |
| --- | --- | --- |
| **P1.6, parte stock:** ¿La existencia se guarda o se calcula? | Se guarda en `productos.existencia`; solo cambia con `moverStock`, en la misma transacción que registra el movimiento, y coincide con la suma firmada del historial. El saldo del cliente sigue fuera del alcance. | `src/base-de-datos/esquema.ts`, `src/servicios/servicio-stock.ts` y prueba de reconciliación en `src/pruebas/productos-y-stock.prueba.ts`. |
| **P2.1:** ¿Dónde se expone la API REST para agregar un producto? | En `POST /api/productos`, que exige sesión con `envoltorioRuta`, delega a `crearProducto` y devuelve `201` con el producto público. | `src/app/api/productos/route.ts`, `src/servicios/servicio-productos.ts` y prueba HTTP del alta. |
| **P2.2:** ¿Qué responde la API ante un código existente? | `409` con `{ error: { code: "CODIGO_DUPLICADO", message: "..." } }`, tanto por comprobación previa como por colisión del índice único. | `asegurarCodigoProductoUnico`, `traducirErrorEscrituraProducto` y pruebas de duplicación. |
| **P3.1:** ¿Dónde se verifica que el stock no quede negativo? | En la actualización condicional de `moverStock` y la comprobación de sus filas afectadas; el fallo provoca rollback. La existencia no es editable vía PATCH. | `src/servicios/servicio-stock.ts`, `asegurarStockSuficiente` y pruebas de egreso excesivo y edición prohibida. |
| **P3.10:** ¿Dónde se registra cada movimiento? | En `movimientos_stock`, guardando cantidad con signo, existencia resultante, usuario, fecha, motivo y factura opcional, junto a la actualización de producto. | `src/base-de-datos/esquema.ts`, `moverStock`, los dos servicios de historial y pruebas de trazabilidad/rollback. |

Cobertura complementaria: **P2.4**, demostración de `403` al vendedor en escrituras de productos/categorías/stock; **P3.2**, mecanismo atómico y prueba de egresos simultáneos, quedando la venta completa para T08. Los apartados transversales de separación de capas, errores y pruebas quedan respaldados por los mismos archivos, sin adjudicar a T03 el cierre de otros tickets.

La actualización de `respuestas-defensa.md` con funciones y líneas reales corresponde a la auditoría posterior al desarrollo; en esta etapa solo se guarda `plan.md` para revisión.
