# Plan técnico — T04: Productos, categorías, existencias y movimientos

Estado: desarrollo autorizado e implementado. Verificaciones y evidencia en `informe-auditoria.md` (17/11/2026).

## 1. Resumen del flujo

El módulo permitirá consultar productos y movimientos desde páginas protegidas, con filtros y paginación conservados en la URL.
El administrador podrá crear, editar y desactivar productos, administrar categorías y registrar ingresos o egresos mediante modales.
Los formularios compartirán los esquemas Zod del servidor y las Server Actions resolverán la sesión antes de delegar en los servicios.
Los servicios conservarán las bajas lógicas y la actualización transaccional de existencias exclusivamente mediante `moverStock`, preparando además los datos de las pantallas.
Tras cada operación exitosa se actualizarán catálogo, ficha, movimientos y contador lateral; el vendedor tendrá acceso de consulta y errores claros.

### Referencias revisadas y alcance

Se leyeron `AGENTS.md`, el ticket, `respuestas-defensa.md`, las secciones pertinentes de `docs/requerimientos.md` y la implementación actual de T01–T03. Se inspeccionaron visualmente las siete capturas obligatorias:

| Imagen en `docs/pantallas/` | Elementos que se conservarán |
| --- | --- |
| `Productos/catalogo.jpg` | Contador global de activos, acciones administrativas, dos pestañas, cuatro filtros, seis columnas y paginación. |
| `Productos/nuevo-producto.jpg` | Código, categoría, descripción, precio, mínimo y stock inicial opcional; aclaraciones sobre impuestos y movimiento inicial; cancelar/guardar. |
| `Productos/egreso.jpg` | Producto, cantidad, motivo y observación; explicación de que no se permite existencia negativa. Ingreso reutilizará la estructura con sus motivos. |
| `Productos/existencias.jpg` | Tipo, fechas, siete columnas, cantidades con signo, insignias y enlaces a facturas. Se incluirá además el filtro de producto exigido por el ticket. |
| `Productos/ficha-producto.jpg` | Regreso al catálogo, identificación, acciones, cuatro tarjetas e historial del más nuevo al más viejo. |
| `Productos/categorias.jpg` | Alta, columnas Nombre / Productos activos / Estado / Acciones, renombrar y activar/desactivar. |
| `Vendedor/vendedor-productos.jpg` | Consulta del catálogo sin selector de estado ni acciones de modificación. |

La captura del vendedor muestra «Categorías», aunque el ticket exige ocultarlo: se seguirá el texto del ticket. La gestión `/productos/categorias` será administrativa; ambos roles conservarán la consulta de categorías activas para filtros. Las dos pestañas de lectura estarán disponibles para ambos roles, conforme a los permisos del historial en T03.

Las referencias a facturas enlazarán a `/ventas/[id]`, ruta definida por T10; T04 no implementará ese destino. Las capturas no asignan F2/F4/F8/F9 al módulo: se conservarán Enter para buscar/enviar, Escape para cerrar, flechas en selectores/pestañas y retorno del foco al cerrar modales. Los atajos de venta pertenecen a T09.

## 2. Archivos a crear o modificar

Estas rutas corresponden al desarrollo posterior. En esta etapa solo se modifica este `plan.md`.

### Base de datos / Utilidades

No habrá cambios en `src/base-de-datos/conexion.ts`, `src/base-de-datos/esquema.ts` ni migraciones: T03 ya almacena los datos necesarios. «Marca» será únicamente el ejercicio de defensa.

| Operación | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/utilidades/consultas-productos.ts` | Adaptar parámetros y construir URL de pestañas, filtros y paginación, sin negocio ni acceso a base de datos. |
| Modificar | `src/utilidades/formatos.ts` | Añadir formato de cantidades con signo y texto de importe editable; centralizar también esos formatos. |

Se reutilizarán sin cambios `src/utilidades/sesion.ts`, `src/utilidades/envoltorio-accion.ts`, `src/utilidades/envoltorio-ruta.ts`, `src/utilidades/fechas-consulta.ts` y `src/utilidades/transacciones.ts`.

### Validaciones Zod

| Operación | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/validaciones/validacion-productos.ts` | Exportar las opciones oficiales de motivos desde una sola definición y agregar un esquema estricto para la búsqueda interna de opciones de producto. Conservar los contratos de mutación existentes. |
| Crear | `src/validaciones/validacion-pantalla-productos.ts` | Validar pestaña y estado de navegación, componiendo los filtros y paginación de T03, sin duplicar reglas de campos. |

Se reutilizarán sin cambios `src/validaciones/validacion-categorias.ts` y `esquemaSinDatos` de `src/validaciones/validacion-autenticacion.ts`. Los formularios usarán directamente los esquemas existentes de alta/edición de producto, movimiento manual y categoría.

### Control de errores y verificadores

| Operación | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/errores/verificadores-negocio.ts` | Añadir comprobación del rango seguro de la valoración de stock; reutilizar permisos, existencia de recursos, unicidad y stock de T03. |
| Crear | `src/errores/errores-formularios-productos.ts` | Asociar errores controlados sin detalles de campo a Código, Nombre o Cantidad, preservando código y mensaje. |

Se reutilizarán sin cambios `src/errores/codigos-error.ts`, `src/errores/error-api.ts` y `src/errores/manejador-errores.ts`; no se incorporarán códigos nuevos ni respuestas HTTP propias.

### Flujo normal en servicios

| Operación | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/servicios/servicio-productos.ts` | Resumen global de activos, ficha con valoración calculada y búsqueda paginada de opciones para selectores. Reutilizar mutaciones de T03. |
| Modificar | `src/servicios/servicio-categorias.ts` | Consulta administrativa de activas/inactivas con cantidad de productos activos; conservar `listarCategorias` y su respuesta REST de solo activas. |
| Modificar | `src/servicios/servicio-stock.ts` | Consulta interna de historial con descripción y observación, reutilizando filtros/orden/paginación y conservando la proyección REST de T03. |

Se reutilizará `src/servicios/servicio-navegacion.ts` sin cambios: ya calcula el contador global y alimenta la navegación móvil y de escritorio.

### Adaptadores API / Páginas / Componentes

No se crearán endpoints REST ni se cambiarán los contratos existentes de T03. Las páginas leerán mediante servicios y las mutaciones usarán Server Actions. La búsqueda del selector utilizará una acción de lectura protegida para incluir opciones históricas sin ampliar la API pública.

| Operación | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/app/(sistema)/productos/acciones.ts` | Acciones protegidas con `envoltorioAccion`, delegación y revalidación tras éxito. |
| Crear | `src/app/(sistema)/productos/page.tsx` | Sesión, URL, consultas de la pestaña activa y composición de componentes. |
| Crear | `src/app/(sistema)/productos/[id]/page.tsx` | Consulta de ficha/historial y presentación de producto inexistente. |
| Crear | `src/app/(sistema)/productos/categorias/page.tsx` | Consulta administrativa y composición del gestor. |
| Crear | `src/app/(sistema)/productos/loading.tsx` | Estado de carga del segmento. |
| Crear | `src/app/(sistema)/productos/error.tsx` | Error inesperado con reintento y sin detalles internos. |
| Crear | `src/app/(sistema)/productos/[id]/not-found.tsx` | Producto inexistente mediante componentes compartidos. |
| Crear | `src/componentes/dominio/productos/pantalla-productos.tsx` | Encabezado, pestañas, acciones por rol y coordinación de modales. |
| Crear | `src/componentes/dominio/productos/filtros-catalogo-productos.tsx` | Búsqueda, categoría, estado administrativo y bajo mínimo. |
| Crear | `src/componentes/dominio/productos/tabla-catalogo-productos.tsx` | Seis columnas, enlaces, insignias y paginación. |
| Crear | `src/componentes/dominio/productos/filtros-movimientos-stock.tsx` | Producto, tipo y rango de fechas sincronizados con URL. |
| Crear | `src/componentes/dominio/productos/tabla-movimientos-stock.tsx` | Historial general y de ficha, referencias y paginación. |
| Crear | `src/componentes/dominio/productos/modal-formulario-producto.tsx` | Alta/edición con validación compartida y stock inicial solo en alta. |
| Crear | `src/componentes/dominio/productos/modal-movimiento-stock.tsx` | Ingreso/egreso, existencia informativa y motivos oficiales. |
| Crear | `src/componentes/dominio/productos/selector-producto.tsx` | Búsqueda paginada por código/descripción y selección, sin limitarse a los primeros 100 productos. |
| Crear | `src/componentes/dominio/productos/ficha-producto.tsx` | Identificación, estado, cuatro tarjetas, historial y confirmación de baja. |
| Crear | `src/componentes/dominio/productos/gestor-categorias.tsx` | Alta rápida, listado completo, renombrar y activar/desactivar. |
| Crear | `src/componentes/interfaz/pestanas.tsx` | Primitiva accesible con estética compartida shadcn/ui y Tailwind. |
| Crear | `src/componentes/interfaz/interruptor.tsx` | Primitiva accesible para Solo bajo mínimo. |
| Modificar | `src/componentes/formularios/usar-formulario-accion.ts` | Validar al cambiar/salir del campo con el mismo esquema, conservando el comportamiento actual de envío. |
| Modificar | `src/componentes/formularios/campo-importe.tsx` | Delegar formato inicial en utilidades y evitar enviar un importe anterior cuando el texto actual sea inválido. |

Se reutilizarán las primitivas de maquetación, los componentes de interfaz existentes, `CampoFormulario`, `CampoImporte`, `PaginadorListado`, `InsigniaEstado`, `DialogoConfirmacion`, `EstadoCarga`, `EstadoVacio` y `EstadoError`. Las primitivas nuevas podrán componerse con React y los componentes instalados; no se prevén dependencias adicionales.

No se prevén cambios en el layout, `panel-lateral.tsx`, `barra-superior.tsx` o `menu-movil.tsx`: revalidar el layout hará que se consulte nuevamente `obtenerResumenNavegacion`.

### Pruebas separadas

| Operación | Ruta exacta | Cobertura |
| --- | --- | --- |
| Modificar | `src/pruebas/productos-y-stock.prueba.ts` | Consultas de pantalla, permisos, categorías inactivas y conteos, valoración y movimientos enriquecidos. |
| Modificar | `src/pruebas/base-errores-formatos.prueba.ts` | Cantidades con signo, importe editable y rango seguro de valoración. |
| Crear | `src/pruebas/acciones-productos.prueba.ts` | Delegación, sesión del envoltorio, errores y revalidación únicamente tras éxito. |
| Crear | `src/pruebas/consultas-productos.prueba.ts` | URL, filtros inválidos, pestañas y paginaciones independientes. |
| Crear | `src/pruebas/formularios-productos.prueba.ts` | Errores por campo y contratos compartidos, incluida existencia prohibida y motivos incompatibles. |

Se reutilizará `src/pruebas/ayudantes-prueba.ts` y se ejecutará la regresión `src/pruebas/api-productos-y-stock.prueba.ts` sin cambiar sus contratos esperados.

## 3. Firmas de funciones principales y contratos (en castellano)

### 3.1. Convenciones y tipos

Toda función pública de servicio recibirá primero `usuarioActual: UsuarioAutenticado` y después `datosSinValidar: unknown`. Se conservará el tercer argumento opcional `baseDatos: BaseDatos = bd` utilizado en T03 para pruebas aisladas. Cada función nueva de servicio llevará un comentario breve citando los RF-P1–RF-P7 o las reglas que implemente.

Se reutilizarán `ProductoPublico`, `CategoriaPublica`, `MovimientoStockPublico`, `ListadoProductos`, `ListadoMovimientosStock` y `ResultadoAccion<Datos>`. Se definirán en los servicios responsables:

- `ResumenProductos`: `{ cantidadProductosActivos: number }`.
- `FichaProducto`: `{ producto: ProductoPublico; valorStock: number }`; precio y valoración serán centavos enteros.
- `CategoriaAdministrable`: categoría pública más `cantidadProductosActivos: number`.
- `MovimientoStockPantalla`: movimiento público con `producto.descripcion` y `observacion: string | null`.
- `ListadoMovimientosStockPantalla`: `{ data: MovimientoStockPantalla[]; page: number; pageSize: number; total: number }`.
- `OpcionProducto`: `id`, `codigo`, `descripcion`, `existencia`, `activo`; `ListadoOpcionesProductos` conservará la estructura paginada anterior con esas opciones.

Estas ampliaciones serán internas para pantalla; la API REST conservará exactamente las formas públicas de T03. Los importados exclusivos de tipo no arrastrarán módulos de base de datos al cliente.

### 3.2. Servicios nuevos de lectura

En las firmas siguientes los dos primeros parámetros tienen los tipos de la convención anterior y se admite el tercer argumento opcional de base de datos.

| Firma | Entrada validada | Pasos en orden |
| --- | --- | --- |
| `obtenerResumenProductos(usuarioActual, datosSinValidar): Promise<ResumenProductos>` | `{}` con `esquemaSinDatos`. | 1. Validar. 2. Exigir autenticación. 3. Contar activos sin filtros del catálogo. 4. Devolver el contador global del subtítulo. |
| `obtenerFichaProducto(usuarioActual, datosSinValidar): Promise<FichaProducto>` | `{ id }` con `esquemaObtenerProducto`. | 1. Validar. 2. Exigir autenticación. 3. Consultar producto existente, calcular precio por existencia con aritmética exacta y verificar rango antes de convertir a `number`. 4. Devolver ficha. |
| `listarOpcionesProductos(usuarioActual, datosSinValidar): Promise<ListadoOpcionesProductos>` | `{ q?, page?, pageSize?, uso: "movimiento" | "historial" }`, esquema estricto nuevo. | 1. Validar. 2. Exigir autenticación y admin para uso movimiento. 3. Buscar/paginar por código o descripción: activos para movimiento, también inactivos para historial. 4. Devolver opciones sin truncar el universo a 100. |
| `listarCategoriasAdministracion(usuarioActual, datosSinValidar): Promise<CategoriaAdministrable[]>` | `{}` con `esquemaListadoCategorias`. | 1. Validar. 2. Exigir admin. 3. Consultar activas/inactivas y contar productos activos, conservando categorías con cero; ordenar nombre/id. 4. Devolver listado administrativo. |
| `listarMovimientosStockParaPantalla(usuarioActual, datosSinValidar): Promise<ListadoMovimientosStockPantalla>` | `esquemaListadoMovimientosStockGeneral`. | 1. Validar producto/tipo/días/página. 2. Exigir autenticación. 3. Si hay producto, verificar que exista; consultar historial con descripción y observación, filtros argentinos y orden fecha/id descendente. 4. Devolver listado enriquecido. |

El último servicio servirá a la pestaña general y a la ficha, que fijará `productoId` desde la ruta. Se reutilizará la consulta interna de movimientos y sus joins, evitando consultas por fila; la proyección REST seguirá omitiendo los campos adicionales internos. La búsqueda de opciones históricas no cambiará el permiso del catálogo: el vendedor continuará sin poder listar el catálogo de inactivos/todos.

### 3.3. Servicios de escritura existentes

No se reimplementará el negocio de T03. Las firmas indicadas también admiten el argumento opcional de base de datos existente:

| Firma | Entrada / salida y secuencia conservada |
| --- | --- |
| `crearProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<ProductoPublico>` | `{ codigo, descripcion, categoriaId, precio, stockMinimo, stockInicial? }` → Zod → admin → categoría/código único → transacción de alta y movimiento inicial si es positivo → producto público. |
| `actualizarProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<ProductoPublico>` | `{ id, cambios }` → Zod estricto → admin → recurso/categoría/unicidad → actualización → producto. Baja: `{ id, cambios: { activo: false } }`. |
| `registrarMovimientoManual(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<MovimientoStockPublico>` | `{ productoId, movimiento: { tipo, cantidad, motivo, observacion? } }` → Zod → admin → transacción → `moverStock` → movimiento con existencia resultante. |
| `crearCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<CategoriaPublica>` | `{ nombre }` → Zod → admin → unicidad/transacción → categoría activa. |
| `actualizarCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<CategoriaPublica>` | `{ id, cambios: { nombre?, activa? } }` → Zod → admin → recurso/unicidad/productos activos → actualización → categoría. |

`moverStock(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, transaccion: TransaccionBaseDatos): Promise<MovimientoStockPublico>` seguirá siendo la única función que altera existencias. Las acciones llamarán a `registrarMovimientoManual`, que abre la transacción.

### 3.4. Server Actions

Todas se exportarán desde `acciones.ts` con `envoltorioAccion`:

| Firma | Servicio delegado |
| --- | --- |
| `crearProductoAccion(datosSinValidar: unknown): Promise<ResultadoAccion<ProductoPublico>>` | `crearProducto`. |
| `actualizarProductoAccion(datosSinValidar: unknown): Promise<ResultadoAccion<ProductoPublico>>` | `actualizarProducto`, también para baja confirmada. |
| `registrarMovimientoStockAccion(datosSinValidar: unknown): Promise<ResultadoAccion<MovimientoStockPublico>>` | `registrarMovimientoManual`. |
| `crearCategoriaAccion(datosSinValidar: unknown): Promise<ResultadoAccion<CategoriaPublica>>` | `crearCategoria`. |
| `actualizarCategoriaAccion(datosSinValidar: unknown): Promise<ResultadoAccion<CategoriaPublica>>` | `actualizarCategoria`, para nombre o estado. |
| `buscarOpcionesProductosAccion(datosSinValidar: unknown): Promise<ResultadoAccion<ListadoOpcionesProductos>>` | `listarOpcionesProductos`; lectura sin revalidación. |

Orden: el envoltorio obtiene el usuario contra la base → la acción delega la entrada completa al servicio, que valida y verifica permisos → solo tras éxito ejecuta `revalidatePath`, importado como `revalidarRuta` → devuelve el resultado mediante el contrato del envoltorio. Ninguna acción calculará valoración, signo, existencia ni contadores.

Se revalidarán `/productos`, la ficha concreta afectada, `/productos/categorias` cuando cambien categorías o cantidades de productos activos, y `revalidarRuta("/", "layout")` ante cambios de stock, mínimo o estado del producto. Renombrar categorías invalidará además `/productos/[id]` como patrón de página. La navegación recalculará sus alertas desde el servicio existente. Los errores no cerrarán modales, no borrarán la entrada y no ejecutarán revalidaciones de éxito.

### 3.5. URL, formularios y formatos

- `leerConsultaProductos(parametros: Record<string, string | string[] | undefined>): ConsultaPantallaProductos`: extraer parámetros únicos → validar con el esquema de pantalla → separar las consultas de catálogo y movimientos.
- `construirUrlProductos(ruta: string, consultaActual: URLSearchParams, cambios: CambiosConsultaProductos): string`: preservar parámetros pertinentes → aplicar cambios → reiniciar únicamente la página del listado cuyo filtro cambió → devolver URL. No controla permisos.
- URL: `pestana=catalogo|movimientos`; catálogo: `q`, `categoriaId`, `activo`, `bajoMinimo`, `page`, `pageSize`; historial general: `productoId`, `tipo`, `desde`, `hasta`, `paginaMovimientos`, `tamanoPaginaMovimientos`. Los dos últimos se traducirán a `page`/`pageSize` al llamar al servicio. La ficha tendrá `page`/`pageSize` propios.
- Cambiar pestaña, recargar o usar Atrás/Adelante conservará filtros. Los parámetros visuales nunca se pasarán como claves extra a los esquemas estrictos del servicio. Un filtro inválido mostrará un error controlado y opción de limpiar; no se sustituirá silenciosamente la consulta por otra. Una URL de vendedor que solicite inactivos/todos será rechazada por el verificador de T03.
- `validarCampos(datos: Entrada, campos?: readonly string[]): boolean`, añadido al resultado de `usarFormularioAccion`: `safeParse` → actualizar errores de los campos interactuados → devolver validez. El envío conservará validación completa, bloqueo de duplicados y mensajes del servidor. Los consumidores actuales mantendrán su comportamiento por defecto.
- `asociarErroresFormularioProductos(resultado: ResultadoAccionFallida, formulario: "producto" | "categoria" | "movimiento"): ResultadoAccionFallida`: preservar error → asociar duplicados a `codigo`/`nombre` y stock insuficiente a `movimiento.cantidad` cuando corresponda → conservar los detalles válidos del servidor. No crea respuestas HTTP ni decide negocio.
- `formatearCantidadConSigno(cantidad: number): string`: validar entero → aplicar formato centralizado y signo → devolver texto para movimientos.
- `formatearImporteEditable(centavos: number | null): string`: convertir centavos a texto decimal argentino sin símbolo ni miles → devolver texto o cadena vacía. `CampoImporte` conservará `pesosACentavos`; si el texto actual es inválido comunicará `null`, impidiendo enviar el último valor válido por accidente.

Motivos con una sola fuente en validaciones: ingresos = Reposición / Stock inicial / Devolución de cliente; egresos = Rotura / Vencimiento / Ajuste de inventario / Uso interno. La cantidad enviada será positiva y el servidor decidirá el signo.

### 3.6. Páginas y componentes

Las páginas serán Server Components y solo compondrán primitivas y componentes del dominio. Los tipos `Propiedades...` tendrán miembros propios en castellano; se conservarán las claves externas exigidas por Next.js y la API, como `params`, `searchParams`, `page` y `pageSize`.

| Firma principal | Parámetros, devolución y pasos |
| --- | --- |
| `PaginaProductos({ searchParams }: PropiedadesPaginaProductos): Promise<NodoReact>` | Recibe parámetros asíncronos de URL → resuelve sesión → adapta consulta → lee resumen, categorías y listado de pestaña activa → devuelve `PantallaProductos`. |
| `PaginaFichaProducto({ params, searchParams }: PropiedadesPaginaFichaProducto): Promise<NodoReact>` | Recibe id/consulta asíncronos → resuelve sesión → obtiene ficha e historial → devuelve `FichaProducto`; recurso inexistente deriva a `notFound`. |
| `PaginaCategorias(): Promise<NodoReact>` | Resuelve sesión → consulta administrativa con permiso → devuelve gestor o estado de acceso denegado. |
| `PantallaProductos(propiedades: PropiedadesPantallaProductos): NodoReact` | Recibe usuario, resumen, pestaña, consultas y listados → muestra encabezado/pestañas/acciones por rol → coordina apertura de modales. |
| `FiltrosCatalogoProductos(propiedades: PropiedadesFiltrosCatalogoProductos): NodoReact` | Recibe filtros, categorías y rol → captura buscador/selectores/interruptor → construye URL → muestra transición y opción de limpiar. |
| `TablaCatalogoProductos({ listado, consulta }: PropiedadesTablaCatalogoProductos): NodoReact` | Recibe `ListadoProductos` → muestra Código, Descripción enlazada, Categoría, Precio, Existencia y Mínimo → usa `bajoMinimo` recibido → compone paginador o vacío. |
| `FiltrosMovimientosStock(propiedades: PropiedadesFiltrosMovimientosStock): NodoReact` | Recibe producto/tipo/fechas → valida con esquema compartido → actualiza URL y su página. |
| `TablaMovimientosStock({ listado, mostrarProducto, consulta }: PropiedadesTablaMovimientosStock): NodoReact` | Recibe historial enriquecido → formatea fecha/cantidad → presenta tipo, existencia resultante, motivo/observación/referencia y usuario → pagina. En ficha omite Producto. |
| `ModalFormularioProducto(propiedades: PropiedadesModalFormularioProducto): NodoReact` | Recibe abierto, callback de apertura/cierre, producto opcional, categorías y callback de éxito → inicializa alta/edición → valida en vivo → envía acción → cierra y actualiza tras éxito. |
| `ModalMovimientoStock(propiedades: PropiedadesModalMovimientoStock): NodoReact` | Recibe abierto, callbacks, tipo y producto inicial opcional → permite seleccionar/preseleccionar → muestra existencia informativa → valida cantidad/motivo/observación → registra → actualiza tras éxito. |
| `SelectorProducto({ uso, valor, alSeleccionar }: PropiedadesSelectorProducto): NodoReact` | Busca remotamente por código/descripción → pagina opciones → descarta respuestas obsoletas → conserva opción seleccionada aunque no esté en la página actual → devuelve selección por callback. |
| `FichaProducto({ ficha, movimientos, usuarioActual, consulta }: PropiedadesFichaProducto): NodoReact` | Muestra identificación/estado y tarjetas Existencia, Stock mínimo, Precio de venta y Valor del stock → presenta historial → abre modales o confirmación de baja solo para admin. |
| `GestorCategorias({ categorias }: { categorias: CategoriaAdministrable[] }): NodoReact` | Muestra listado completo y cantidades del servidor → valida alta/renombrado → confirma cambio de estado → envía acción y mantiene el formulario ante error. |

Editar producto no incluirá `stockInicial` ni `existencia`. La ficha mostrará la valoración recibida del servicio sin multiplicar en React. El catálogo usará `bajoMinimo` recibido; los contadores no se deducirán de filas paginadas. Las fichas e historiales de productos inactivos seguirán consultables. Se resolverá sesión en cada página; las señales de navegación de Next.js se propagarán.

### 3.7. Verificación durante el desarrollo posterior

1. Ejecutar Vitest para nuevas consultas, validaciones y acciones; conservar la regresión de API, stock y concurrencia de T03.
2. Ejecutar `pnpm run verificar:tipos` y `pnpm run build` una vez completada la implementación.
3. Recorrer admin/vendedor, URL directa a categorías y acción manipulada; comprobar que los servicios rechacen operaciones aunque se invoquen fuera de los controles visibles.
4. Probar alta con stock cero/positivo, edición, baja confirmada, ingresos/egresos y errores por duplicados, categoría en uso y falta de stock. Verificar observación, usuario y fecha persistidos.
5. Probar categorías inactivas/sin productos, historial de producto inactivo, filtros combinados e inválidos, extremos de fechas en Argentina, URL compartida y paginaciones independientes.
6. Comprobar actualización de ficha, catálogo y contador lateral/móvil al cruzar el mínimo o cambiar estado; igualdad entre existencia y mínimo no debe marcar bajo mínimo.
7. Revisar carga/vacío/error/reintento, ancho de 360 px y escritorio, filtros apilables, desplazamiento de tabla dentro del contenedor, modales utilizables, teclado, foco y errores junto al campo. Contrastar las siete referencias funcionales sin copiar su CSS.

No se ejecutan pruebas de aplicación en esta etapa documental ni se declara implementada funcionalidad.

## 4. Reglas de negocio y errores controlados

Los servicios mantendrán el orden validar → permisos → operación → respuesta. Los chequeos de negocio vivirán en `src/errores/verificadores-negocio.ts`; la interfaz solo presentará resultados y validación anticipada.

| HTTP / código de sección 11.8 | Situación | Función responsable / tratamiento |
| --- | --- | --- |
| `401 NO_AUTENTICADO` | Sesión ausente, inválida, vencida o usuario desactivado, incluso al enviar con pantalla abierta. | `asegurarSesionValida` y `asegurarUsuarioAutenticado`, existentes; sesión resuelta contra usuarios. Página deriva a login y acción devuelve error controlado. |
| `403 SIN_PERMISO` | Vendedor mutando, administrando categorías, buscando opciones de movimiento manual o pidiendo catálogo inactivo/todos. | `asegurarRolAdmin`, `asegurarFiltroEstadoProductosPermitido` y `asegurarPermisoMovimientoStock`, existentes. Ocultar botones no reemplaza estos controles. |
| `404 NO_ENCONTRADO` | Producto/categoría/referencia inexistente. | `asegurarRecursoExiste`, existente. Ficha usa presentación de no encontrado; formularios conservan el error. |
| `409 CODIGO_DUPLICADO` | Código ya utilizado, incluso por producto inactivo. | `asegurarCodigoProductoUnico` y `traducirErrorEscrituraProducto`, existentes, incluida colisión concurrente; mensaje junto a Código. |
| `409 NOMBRE_DUPLICADO` | Nombre de categoría repetido, incluso inactiva. | `asegurarNombreCategoriaUnico` y `traducirErrorEscrituraCategoria`, existentes; mensaje junto a Nombre. |
| `409 CATEGORIA_EN_USO` | Desactivar categoría con productos activos. | `asegurarCategoriaSinProductosActivos`, existente; mensaje claro en gestor/confirmación y conservación del estado anterior. |
| `409 STOCK_INSUFICIENTE` | Egreso rechazado por la actualización atómica, aunque la pantalla mostrara stock antes del envío. | `asegurarStockSuficiente`, existente, desde `moverStock`; informar solicitado/disponible de `details`. La transacción revierte completa. |
| `422 VALIDACION` | Datos inválidos, fechas invertidas, motivos incompatibles, claves extra, existencia en alta/edición o stock inicial en edición. | Esquemas Zod y conversión central de `ZodError` en `manejador-errores.ts`; no se duplicarán estas reglas en verificadores. Detalles junto al campo. |
| `422 VALIDACION` | Categoría inactiva para producto activo o existencia fuera de rango seguro. | `asegurarCategoriaCompatibleConProducto` y `asegurarExistenciaDentroDeRango`, existentes. |
| `422 VALIDACION` | Valor calculado de stock fuera del entero seguro representable en centavos. | Nuevo `asegurarValorStockDentroDeRango(valorCentavos: bigint): void`: verifica rango antes de convertir a `number`; lanza `ErrorApi` con detalle público de `valorStock` si no cabe, sin redondear. |
| `500 ERROR_INTERNO` | Falla inesperada al consultar o escribir. | Manejador central existente; no requiere verificador específico. Registrar solo en servidor y mostrar mensaje genérico/reintento. |

`400 JSON_INVALIDO` seguirá cubierto por el adaptador REST para sus consumidores; las Server Actions reciben objetos y no implementarán parseo JSON propio. `PRODUCTO_INACTIVO` corresponde al rechazo de una venta en T08: T04 no inventará una regla de venta para las consultas históricas o los movimientos manuales definidos en T03. Los códigos de clientes, pagos, facturas y contraseñas quedan fuera de este ticket.

Invariantes que deberán poder señalarse durante la defensa:

- Alta y stock inicial positivo se confirman juntos; stock inicial cero no crea un movimiento vacío.
- Solo `moverStock` actualiza existencias, en transacción con su movimiento y condición atómica que impide negativo; páginas y acciones no calculan existencias ni signos.
- Bajas mediante `activo: false`/`activa: false`, sin `DELETE` ni pérdida de historial.
- Bajo mínimo usa comparación estricta `existencia < stockMinimo` en servicios/consultas; catálogo y navegación reciben el resultado del servidor.
- Dinero en centavos enteros; conversión y formatos centralizados en `formatos.ts`.
- Mismos esquemas estrictos en cliente y servicio; el servidor repite validación y permisos ante entrada manipulada o estado concurrente.
- Usuario y rol se verifican contra la base en cada pedido, sin confiar en la sesión resuelta al abrir una pantalla anterior.
- `listarCategorias` mantiene solo activas; consultas administrativas y movimientos enriquecidos son internos y conservan el contrato REST de la sección 11.4.

## 5. Preguntas de defensa cubiertas

### Cobertura directa del ticket

**P5.3 — ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?**

Se podrá mostrar el esquema en `src/validaciones/validacion-productos.ts` o `validacion-categorias.ts`, su uso en los modales/gestor y el mismo esquema al comienzo del servicio. `usarFormularioAccion` centralizará validación en vivo y al enviar, bloqueo de envío y errores por campo; `envoltorioAccion` y el manejador central conservarán los errores del servidor. Una demostración será ingresar cantidad inválida y luego intentar enviar `existencia` fuera del formulario: ambos serán rechazados por los esquemas compartidos.

**Ejercicio de cambio pequeño 1 — Agregar «marca» a productos y mostrarla en el catálogo.**

Sin implementar ese campo en T04, quedarán identificables estos puntos de cambio:

1. `src/base-de-datos/esquema.ts`: columna; generar con `pnpm run db:generate` y aplicar con `pnpm run db:migrate` la migración correspondiente en `src/base-de-datos/migraciones/`.
2. `src/validaciones/validacion-productos.ts`: campo compartido de alta/edición.
3. `src/servicios/servicio-productos.ts`: tipo público/proyección y persistencia de los datos validados.
4. `src/componentes/dominio/productos/modal-formulario-producto.tsx`: campo y mensaje de validación.
5. `src/componentes/dominio/productos/tabla-catalogo-productos.tsx`: encabezado y celda; ampliar las pruebas pertinentes de `src/pruebas/`.

### Evidencia complementaria

- **P5.1:** contador lateral compartido actualizado mediante servicio de navegación y revalidación del layout.
- **P5.2:** importes, fechas y cantidades presentados desde `src/utilidades/formatos.ts`.
- **P5.5:** carga, vacío, error y reintento reutilizables, extendiendo lo resuelto en T02.
- **P1.6 / P2.2:** existencia modificada solo por movimientos y código duplicado presentado en el formulario.

Tras desarrollar y auditar se incorporarán funciones/líneas reales a `respuestas-defensa.md` y se completará `docs/tickets/T04-frontend-productos-categorias-y-existencias/informe-auditoria.md`. Esta planificación no modifica esos archivos ni declara implementadas las respuestas de T04.
