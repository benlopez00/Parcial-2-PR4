# Informe de Auditoría y Guía para el Desarrollador — T07

## 1. Resumen para el Desarrollador

Este ticket construyó las **cuatro pantallas del módulo Clientes**: el listado, la ficha con sus dos pestañas, el recibo imprimible y los saldos. **No agrega ninguna regla de negocio**: consume los servicios del T05 y el T06 y se limita a mostrar, filtrar y avisar.

1. **Cómo se leen los datos (Server Component → servicio):**
   - Cada página es un Server Component con `force-dynamic` que llama a los servicios en paralelo y le pasa todo armado a un componente cliente. El listado ([`clientes/page.tsx` L23](file:///c:/Proyectos/Parcial-2-PR4/src/app/%28sistema%29/clientes/page.tsx#L23-L26)) pide el listado filtrado **y aparte** el total adeudado del comercio; la ficha ([`[id]/page.tsx` L24](file:///c:/Proyectos/Parcial-2-PR4/src/app/%28sistema%29/clientes/%5Bid%5D/page.tsx#L24-L27)) pide el cliente y su cuenta corriente juntos.
   - **Los filtros viven en la URL.** `leerConsultaClientes()` y `leerConsultaFichaCliente()` ([`consultas-clientes.ts` L12 y L16](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/consultas-clientes.ts#L12-L21)) los validan con Zod, y `construirUrlClientes()` (L23) los vuelve a escribir al navegar, borrando la página cuando cambia un filtro. Por eso un listado se puede recargar, compartir y volver atrás.

2. **Cómo se escriben los datos (formulario → Server Action → servicio):**
   - Los tres modales usan `usarFormularioAccion` con **los mismos esquemas Zod del servidor**: `esquemaCrearCliente`/`esquemaEditarCliente` ([`modal-formulario-cliente.tsx` L38](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-formulario-cliente.tsx#L38)) y `esquemaCuerpoPago` ([`modal-registrar-pago.tsx` L32](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-registrar-pago.tsx#L32)).
   - Las Server Actions ([`acciones.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/%28sistema%29/clientes/acciones.ts#L8-L30)) solo envuelven al servicio con `envoltorioAccion` y revalidan las rutas afectadas **si la operación salió bien**.
   - `asociarErroresFormularioClientes()` ([`errores-formularios-clientes.ts` L5](file:///c:/Proyectos/Parcial-2-PR4/src/errores/errores-formularios-clientes.ts#L5)) lleva el error del servidor al campo que lo causó: un `409 DOCUMENTO_DUPLICADO` aparece debajo del documento, y de paso saca los prefijos `cambios.` y `pago.` que vienen de la forma de los servicios.

3. **Dónde la interfaz adelanta una regla sin reemplazarla:**
   - El botón «Registrar pago» se deshabilita cuando no hay deuda (`puedeCobrar`, [`ficha-cliente.tsx` L52](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/ficha-cliente.tsx#L52)) y el modal avisa antes de enviar si el importe supera el saldo (`excedeLaDeuda`, [`modal-registrar-pago.tsx` L42](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-registrar-pago.tsx#L42)). **Las dos son comodidad**: el servicio rechaza igual con `422 PAGO_SUPERA_DEUDA` si alguien llama a la API directamente.

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| [`validaciones/validacion-pantalla-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-pantalla-clientes.ts#L8-L17) | Esquemas de los parámetros de URL | `esquemaPantallaClientes` (L8), `esquemaPantallaFichaCliente` (L12) |
| [`utilidades/consultas-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/consultas-clientes.ts#L12-L35) | Leer y escribir los filtros en la URL | `leerConsultaClientes()` (L12), `leerConsultaFichaCliente()` (L16), `construirUrlClientes()` (L23) |
| [`errores/errores-formularios-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/errores-formularios-clientes.ts#L5) | Llevar el error del servidor a su campo | `asociarErroresFormularioClientes()` (L5) |
| [`app/(sistema)/clientes/acciones.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/%28sistema%29/clientes/acciones.ts#L8-L30) | Server Actions, sin lógica propia | `crearClienteAccion` (L8), `actualizarClienteAccion` (L15), `registrarPagoAccion` (L24) |
| [`dominio/clientes/pantalla-clientes.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/pantalla-clientes.tsx#L25) | Orquesta el listado y la navegación por URL | `PantallaClientes()` (L25) |
| [`dominio/clientes/filtros-clientes.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/filtros-clientes.tsx#L16) | Búsqueda, estado, orden e interruptor de deuda | `FiltrosClientes()` (L16) |
| [`dominio/clientes/tabla-clientes.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/tabla-clientes.tsx#L19-L39) | Listado paginado; saldo en rojo si debe (L39) | `TablaClientes()` (L19) |
| [`dominio/clientes/modal-formulario-cliente.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-formulario-cliente.tsx#L29) | Alta y edición; **se reutiliza en T09** | `ModalFormularioCliente()` (L29) |
| [`dominio/clientes/ficha-cliente.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/ficha-cliente.tsx#L35-L143) | Ficha con tarjetas, pestañas y acciones | `FichaCliente()` (L35) |
| [`dominio/clientes/pestana-cuenta-corriente.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/pestana-cuenta-corriente.tsx#L20-L55) | Movimientos con saldo acumulado y arrastre (L51) | `PestanaCuentaCorriente()` (L20) |
| [`dominio/clientes/modal-registrar-pago.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-registrar-pago.tsx#L25-L42) | Cobro con aviso previo de exceso | `ModalRegistrarPago()` (L25) |
| [`dominio/clientes/vista-recibo-imprimible.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/vista-recibo-imprimible.tsx#L17-L32) | Comprobante con vista de impresión limpia | `VistaReciboImprimible()` (L17), `window.print()` (L32) |
| [`dominio/clientes/tabla-saldos.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/tabla-saldos.tsx#L17-L60) | Deudores con cobro directo | `TablaSaldos()` (L17) |
| [`dominio/clientes/resumen-saldos.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/resumen-saldos.tsx#L10) | Tarjetas de total adeudado | `ResumenSaldos()` (L10) |
| `app/(sistema)/clientes/{page,[id]/page,saldos/page,recibos/[id]/page}.tsx` | Las cuatro páginas, más `loading`, `error` y `not-found` | Server Components con `force-dynamic` |
| [`navegacion/panel-lateral.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/navegacion/panel-lateral.tsx#L127) y [`barra-superior.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/navegacion/barra-superior.tsx#L55) | *(modificados)* `print:hidden` para la impresión | una clase en cada uno |

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas:** `pnpm test` → **207 pruebas en verde**, las mismas que antes: este ticket no toca backend. `pnpm run verificar:tipos` y `pnpm run build` sin errores, con las cuatro rutas nuevas en la salida.
- **Verificación en el navegador real:** se levantó la aplicación compilada contra una base aparte y se recorrieron **15 casos** (tres por pantalla), más las cinco pantallas a 360 px de ancho. Todos correctos. Se comprobó de punta a punta: el aviso de exceso antes de enviar, el cobro que termina en el recibo, el recibo viejo que conserva su saldo congelado, la baja bloqueada por deuda con el mensaje dentro del diálogo, y la baja permitida una vez saldada.
- **Criterios de aceptación del `ticket.md`:** los cuatro verificados.
- **Reglas de `AGENTS.md`:** ningún componente formatea importes ni fechas por su cuenta (cero usos de `toFixed`, `Intl` o `toLocaleString`); ninguna suma ni cálculo de saldo en la interfaz; los formularios comparten los esquemas Zod del servidor.

**Errores detectados y corregidos:**

1. **Una etiqueta HTML suelta rompía el criterio de aceptación 1 (`saldos/page.tsx`).** La página armaba sus dos tarjetas de resumen con un `<div className="grid …">` escrito a mano, mientras que el criterio exige que las páginas se compongan solo con primitivas y componentes de dominio. Se detectó contando etiquetas en minúscula en las cuatro páginas y comparando contra las de Ben, que dan cero. Se extrajo a `ResumenSaldos` ([`resumen-saldos.tsx`](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/resumen-saldos.tsx#L10)) y ahora las cuatro páginas dan cero.
2. **El recibo no imprimía limpio (`panel-lateral.tsx` L127 y `barra-superior.tsx` L55).** La vista del recibo tenía su propio `print:hidden` en los botones, pero **el panel lateral y la barra de usuario seguían apareciendo en la impresión**, porque son parte del layout compartido y nadie los había marcado. El criterio 4 pide vista de impresión limpia. Se agregó `print:hidden` a los dos y se verificó en la hoja de estilos compilada que la regla `@media print` queda **después** de `.md:block`, así gana la cascada y el panel desaparece de verdad.
3. **La tabla de saldos escondía su propia acción a 1024 px.** Con seis columnas, el botón «Registrar pago» quedaba fuera del área visible y había que desplazarse al costado para cobrar, que es justo lo que esa pantalla viene a resolver. Las columnas Límite y Disponible ahora solo se muestran en pantallas anchas.

**Decisiones declaradas:**

- **Se tocaron dos archivos compartidos de Ben** (`panel-lateral.tsx` y `barra-superior.tsx`), una clase en cada uno. Es inevitable: la impresión limpia del recibo depende del layout común, y el T10 de Pablo va a necesitar lo mismo para el comprobante de factura.
- **Un saldo negativo se muestra como «Saldo a favor del cliente»** ([`ficha-cliente.tsx` L59](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/ficha-cliente.tsx#L59)). Es el caso que apareció en la auditoría del T08: anular una factura ya pagada en parte. Sin esa insignia se vería un número negativo en rojo sin explicación.
- **El subtítulo del listado usa una consulta aparte** para el total adeudado de todo el comercio. Si usara el listado filtrado, el total cambiaría al buscar un cliente, que sería engañoso.
- **El enlace «Ver todas» de la ficha apunta a `/ventas?clienteId=…`** y los conceptos de la cuenta a `/ventas/[id]`. Hoy dan 404 porque son el T10 de Pablo; quedan listos para cuando esas pantallas existan.

## 4. Guía de Defensa Rápida del Ticket

| Pregunta probable | Dónde hacer clic |
| :--- | :--- |
| **¿Se validan las mismas reglas en el formulario y en el servidor?** | Sí, y es el mismo archivo. Mostrar `esquema: esquemaCuerpoPago` en [`modal-registrar-pago.tsx` L32](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/modal-registrar-pago.tsx#L32) y después el `.parse()` del mismo esquema en `registrarPagoCuentaCorriente()`. Un solo lugar donde cambiar una regla. |
| **¿La interfaz puede saltarse una regla de negocio?** | No. El botón deshabilitado ([`ficha-cliente.tsx` L52](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/clientes/ficha-cliente.tsx#L52)) y el aviso previo (L42 del modal) son ayudas visuales; quien decide es `asegurarPagoNoSuperaDeuda()` en el servicio, que responde `422` aunque se llame a la API directamente. |
| **¿Dónde se da formato a importes y fechas?** | En `src/utilidades/formatos.ts`, siempre. Ningún componente de clientes formatea por su cuenta: se puede demostrar buscando `toFixed` o `Intl` en la carpeta y viendo que no hay ninguno. |
