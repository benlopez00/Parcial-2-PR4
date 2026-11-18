# Plan técnico — T07: Frontend de clientes, cuenta corriente, pagos, recibo y saldos

Estado: planificado. Base: `ramaAlvaro`, sobre `T05`, `T06` y `T08` ya auditados.

> **Nota de orden:** el T08 se desarrolló antes que este ticket. No afecta nada: el T07 depende de `T01`, `T02`, `T05` y `T06`, todos terminados. Al quedar el T08 listo, la pestaña de cuenta corriente ya puede enlazar a facturas reales.

## 1. Resumen del flujo

Este es el único ticket de frontend del bloque: **no agrega ninguna regla de negocio nueva**, solo construye las pantallas que consumen los servicios del T05 y el T06.
Las páginas son Server Components que llaman directamente a los servicios y reciben los filtros por la URL, de modo que un listado se puede recargar, compartir y volver atrás sin perder el estado.
Las mutaciones —alta, edición, baja y registro de pago— van por **Server Actions** envueltas en `envoltorioAccion`, que devuelven `{ ok, datos }` o `{ ok: false, error }` para que el formulario muestre el error junto al campo.
Los formularios validan en vivo con **los mismos esquemas Zod del servidor** (`validacion-clientes.ts` y `validacion-pagos.ts`), así la regla se escribe una sola vez.
El recibo es una página aparte con vista de impresión limpia.

## 2. Archivos a crear o modificar

**Server Actions**
- `src/app/(sistema)/clientes/acciones.ts` *(nuevo)*: `crearClienteAccion`, `actualizarClienteAccion`, `registrarPagoAccion`. Mismo patrón que `productos/acciones.ts`: `envoltorioAccion` + `revalidarRuta` solo si la operación salió bien.

**Componentes de dominio (`src/componentes/dominio/clientes/`)** *(carpeta nueva)*
- `tabla-clientes.tsx` · `modal-formulario-cliente.tsx` *(se exporta para reusar en T09)* · `pestana-cuenta-corriente.tsx` · `modal-registrar-pago.tsx` · `vista-recibo-imprimible.tsx`

**Páginas (`src/app/(sistema)/clientes/`)**
- `page.tsx` (listado) · `[id]/page.tsx` (ficha con pestañas) · `saldos/page.tsx` · `recibos/[id]/page.tsx`

**Se reutiliza sin tocar:** las primitivas de `maquetacion/` (`ContenedorPagina`, `EncabezadoPagina`, `Apilar`, `Alinear`, `Grilla`, `Texto`, `Titulo`), `estados/` (`EstadoCarga`, `EstadoVacio`, `EstadoError`, `DialogoConfirmacion`), `formularios/` (`CampoFormulario`, `CampoImporte`, `InsigniaEstado`, `PaginadorListado`, `usarFormularioAccion`) y **todo** `utilidades/formatos.ts`.

**Los componentes de shadcn/ui ya están instalados y renombrados al castellano**, en `src/componentes/interfaz/` (así lo declara el alias `ui` de `components.json`). **No hay que instalar ninguno ni correr `shadcn add`.** El T07 necesita estos, y los quince existen:

| Para qué | Componente | Detalle |
| :--- | :--- | :--- |
| Las dos pestañas de la ficha | `Pestanas` | **No es el patrón compuesto de shadcn.** Ben lo simplificó: recibe `valor` y `opciones={[{ valor, etiqueta }]}`, y el valor activo **viaja en la URL**. Ver cómo lo usa en `componentes/dominio/productos/pantalla-productos.tsx` (L51). |
| Interruptor «Solo con deuda» | `Interruptor` | |
| Modales de cliente y de pago | `Dialogo` + `DialogoContenido`, `DialogoEncabezado`, `DialogoTitulo`, `DialogoDescripcion`, `DialogoPie` | |
| Confirmar la baja | `DialogoAlerta` + `DialogoAlertaAccion`, `DialogoAlertaCancelar`, … | |
| Tablas de clientes, facturas y movimientos | `Tabla`, `TablaEncabezado`, `TablaCuerpo`, `TablaFila`, `TablaCelda`, `TablaCeldaEncabezado`, `TablaPie` | `TablaPie` sirve para el renglón «Saldo al cierre». |
| Las tres tarjetas de resumen | `Tarjeta` + `TarjetaEncabezado`, `TarjetaTitulo`, `TarjetaContenido` | |
| Insignia «Cta. cte.» | `Insignia` | |
| Formularios | `Boton`, `Entrada`, `Etiqueta`, `Selector` + `SelectorDisparador`, `SelectorContenido`, `SelectorOpcion`, `SelectorValor` | |

**Importarlos de `@/componentes/interfaz/<archivo>`**, nunca de `@/componentes/ui`: esa carpeta no existe.

**No se toca ningún servicio, validación ni verificador.** Si al maquetar aparece la necesidad de una regla nueva, va al servicio, nunca al componente.

## 3. Pantallas y de dónde sale cada dato

| Pantalla | Servicio que la alimenta | Puntos de atención |
| :--- | :--- | :--- |
| `/clientes` | `listarClientes()` | Filtros en la URL: `q`, `activo`, `conDeuda`, `page`. El subtítulo con el total adeudado sale de una segunda llamada con `conDeuda=true` (que devuelve `totalAdeudado`). Saldo en rojo cuando es mayor que cero. |
| `/clientes/[id]` | `obtenerClientePorId()` + `obtenerCuentaCorrienteCliente()` | Tres tarjetas: saldo, límite (o «Sin límite») y disponible. Pestaña 1 con datos y las 6 últimas facturas; pestaña 2 con la cuenta corriente y filtros `desde`/`hasta` en la URL. |
| `/clientes/saldos` | `listarClientes({ conDeuda: "true", orden: "saldo" })` | El `totalAdeudado` ya viene en la respuesta: **no sumar en el componente**. |
| `/clientes/recibos/[id]` | `obtenerReciboPagoPorId()` | Vista imprimible, con `print:hidden` en panel lateral y botones. |

**Cuidados que vienen de los tickets anteriores:**
- **El botón «Registrar pago» va deshabilitado cuando el saldo es cero**, porque la Regla 8 rechaza cualquier pago sin deuda. Es ayuda visual, no reemplaza el control del servidor.
- **El saldo del estado de cuenta es el acumulado al final del rango filtrado**, no el saldo total. Para las tarjetas de arriba hay que usar el `saldo` de la ficha, no el de la cuenta.
- **Un saldo negativo es posible** (si se anuló una factura ya pagada en parte): mostrarlo como saldo a favor, no como deuda.
- **Baja con saldo distinto de cero** devuelve `422 SALDO_PENDIENTE`: el diálogo de confirmación tiene que mostrar ese mensaje junto a la acción.

## 4. Reglas de negocio y errores controlados

**Ninguna.** Ese es el punto del ticket: la interfaz adelanta mensajes pero no decide nada.

| Situación | Qué hace la pantalla | Quién decide de verdad |
| :--- | :--- | :--- |
| Importe mayor que la deuda | Error bajo el campo antes de enviar | `asegurarPagoNoSuperaDeuda()` → `422` |
| Documento repetido | Error junto al campo al volver el `409` | `asegurarDocumentoClienteUnico()` |
| Baja con saldo | Mensaje en el diálogo de confirmación | `asegurarClienteSinSaldoPendiente()` |
| Campos inválidos | `usarFormularioAccion` con el esquema Zod compartido | El `.parse()` del servicio |

**Criterios de aceptación a cumplir:** sin HTML suelto en las páginas; sin formatear importes ni fechas en los componentes (todo sale de `formatos.ts`); cada renglón de la cuenta enlaza a su factura o a su recibo; el recibo imprime limpio; y todo usable desde 360 px.

## 5. Preguntas de defensa cubiertas

- **P5.2 — ¿Dónde se da formato a importes y fechas?** En `src/utilidades/formatos.ts`; ningún componente de clientes formatea por su cuenta.
- **P5.3 — ¿Se usan las mismas reglas en el formulario y en el servidor?** Sí: `validacion-clientes.ts` y `validacion-pagos.ts` los importan los dos lados.
- **P5.5 — ¿Qué muestra un listado mientras carga, vacío o con error?** `EstadoCarga`, `EstadoVacio` y `EstadoError`, ya existentes.
- **Aporta a P5.1** (panel lateral compartido por el grupo de rutas `(sistema)`).
- **Cambio pequeño 4 (teléfono de 8 dígitos):** al estar el esquema compartido, el `.refine()` en `validacion-clientes.ts` aplica al formulario y al servidor con **un solo renglón**.

## 6. Orden sugerido de desarrollo

Pensado para que **cada paso deje algo funcionando** y se pueda cortar sin dejar el proyecto a medias:

1. `acciones.ts` + `modal-formulario-cliente.tsx` + `/clientes` (listado con alta y edición).
2. `/clientes/[id]` pestaña «Datos y facturas».
3. `pestana-cuenta-corriente.tsx` (pestaña 2).
4. `modal-registrar-pago.tsx` + `/clientes/recibos/[id]`.
5. `/clientes/saldos`.

Es el ticket más largo del bloque y el único que admite entregarse por partes.
