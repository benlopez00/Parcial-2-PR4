# Informe de auditoría y guía de defensa — T09

Responsable: Pablo. Rama: `ramaPablo`. Estado: **Completado**, con el comprobante final expresamente pendiente de T10.

## 1. Qué se construyó

Nueva Venta protegida en `/ventas/nueva`, con búsqueda de productos por código/descripción, precio y stock; cantidad inicial, renglones sin duplicados y controles de cantidad; consumidor final o cliente registrado; alta rápida reutilizando el modal de T07; contado, tarjeta y cuenta corriente; próximo número informativo, total, confirmación y descarte.

La pantalla conserva el borrador en memoria. Los módulos puros de dominio validan cantidades/pago y calculan la previsualización, sin escribir datos ni autorizar operaciones. Confirmar arma únicamente el cuerpo oficial y llama a `POST /api/facturas`; el servicio existente vuelve a leer catálogo, sesión y crédito y realiza su transacción original. Una venta exitosa redirige al id de factura recibido. No se añadieron dependencias, tablas, migraciones ni rutas de API.

## 2. Mapa de archivos

Todas las rutas son relativas a la raíz del repo.

| Archivos | Responsabilidad |
| --- | --- |
| `src/app/(sistema)/ventas/nueva/{page,loading,error}.tsx` | Componer la pantalla con sesión y estados de navegación. |
| `src/componentes/dominio/ventas/panel-nueva-venta.tsx` | Estado del borrador, atajos, emisión, bloqueo de doble envío y descarte. |
| `buscador-items-venta.tsx`, `usar-busqueda-venta.ts` en esa carpeta | Debounce, cancelación de consultas, sugerencias accesibles y teclado. |
| `tabla-renglones-venta.tsx` | Cantidades y renglones adaptables sin cálculo de dinero en JSX. |
| `selector-comprador-venta.tsx` | Búsqueda/selección de comprador y modal compartido de clientes. |
| `selector-forma-pago.tsx` | Campos de los tres medios y exposición del resumen calculado. |
| `src/servicios/borrador-venta.ts` | Operaciones puras del borrador, pago y cuerpo de emisión. |
| `src/servicios/calculos-venta.ts`, `servicio-facturas.ts` | Aritmética con BigInt compartida, sin alterar la transacción de emisión. |
| `src/validaciones/validacion-facturas.ts` | Una única cantidad Zod para pantalla y servidor. |
| `src/errores/errores-nueva-venta.ts` | Errores públicos y detalle de todos los faltantes. |
| `src/componentes/formularios/campo-importe.tsx` | Callback opcional de validez sin cambiar los demás consumidores. |
| `src/utilidades/formatos.ts` | Contadores enteros en formato argentino. |
| `src/pruebas/nueva-venta.prueba.ts` | 22 pruebas del estado, rangos, contrato, errores y pagos. |
| `docs/tickets/T09-frontend-nueva-venta/tareas/` | 12 subtickets T09.01–T09.12 con alcance y criterio propios. |

## 3. Verificación realizada

- **229 pruebas aprobadas en 12 archivos:** 207 existentes y 22 nuevas. Incluye la regresión original de facturación/stock/concurrencia después de compartir la aritmética.
- **TypeScript:** `next typegen` y `tsc --noEmit`, sin errores; el build vuelve a ejecutar la comprobación de tipos.
- **Build de producción:** `next build --webpack`, correcto; aparece la nueva ruta dinámica `/ventas/nueva`.
- **32 comprobaciones de navegador sobre el build de producción:** 30 en el recorrido completo y 2 adicionales de flechas/Escape. Se usó Chrome headless real con el cliente CDP del skill de diseño, sin instalar paquetes para las pruebas.
- **Recorrido probado:** ambos roles; F2/F4/F8/F9, flechas, Enter y Escape; sumar producto repetido; rechazo de cantidades sin alterar el estado; crédito excedido; monto inválido/corregido; F9 detrás del modal; alta rápida sin perder los ítems; conservación de ceros de tarjeta; descarte cancelado; las tres emisiones por API; JSON sin precios/totales; doble F9 con una sola petición; stock y débito real; sesión vencida; y resultado de red incierto sin reintento automático.
- **Adaptación:** comprobación de ausencia de overflow horizontal a 1440, 768, 390 y 360 px, más revisión de capturas completas, con datos y vacío.
- **Inspector visual:** 0 FAIL a 1440/768/390. Se revisaron todas sus capturas y las cuatro del recorrido con datos. Lint de los componentes: 0 FAIL.
- **Aislamiento:** las comprobaciones visuales usaron una base creada expresamente en el directorio local `work`, con usuarios y productos ficticios creados mediante servicios. No se cargó la base de trabajo del usuario ni se ejecutó la semilla de T12. Scripts, credenciales temporales, bases y capturas permanecen fuera del repo.

Los ejecutables usados fueron los instalados en `node_modules/.bin`, correspondientes al lockfile. No se modificó pnpm global ni se actualizaron paquetes.

### Observaciones visuales aceptadas

Se conserva el sistema visual existente de Mostrador; no se sortea ni aplica una identidad distinta a una sola pantalla. El inspector avisa por el fondo cálido que ya tenía la aplicación (`palette-cream`): cambiarlo sería un rediseño global fuera del ticket. Los avisos de espacio libre (`hero-void`) y diferente altura (`ragged-row`) corresponden al mostrador vacío: la columna izquierda crecerá con los renglones y no se estira una tarjeta vacía para empatar el formulario. El warning de sombra del lint está únicamente en el menú flotante de resultados, donde distingue una superposición real. No se añadió imagen ni contenido comercial inventado; los nombres de las capturas son datos ficticios de prueba.

Revisión de la última ronda: total y confirmación tienen jerarquía propia; los valores se alinean y suman; el comprador nuevo mantiene los ítems; navegación plegada en móvil; sin controles cortados ni overflow. Se compactaron campos de tarjeta y resumen, y los renglones se distribuyeron como filas de lectura en móvil.

## 4. Errores detectados y corregidos

1. **Monto vacío frente a monto inválido.** El CampoImporte compartido emitía null en ambos casos. En contado null/ausencia equivale al importe exacto, por lo que un texto inválido podía confundirse con pago automático. Se agregó `alCambiarValidez` opcional y se comprobó la interacción real en navegador.
2. **Doble confirmación y respuesta incierta.** El estado React por sí solo no impide dos eventos en el mismo ciclo. Un ref bloquea antes del primer await; el envío exitoso sigue bloqueado durante la navegación. Si no se conoce el resultado de la red, el borrador se conserva y se exige verificar las facturas antes de iniciar otra venta; nunca hay reintento automático.
3. **Consistencia del dinero.** El borrador no incorpora una segunda fórmula monetaria: subtotal/suma se extrajeron del servicio de emisión a funciones puras con BigInt y la misma comprobación de rango. Las pruebas antiguas siguen pasando.
4. **Confirmación demasiado abajo.** La primera revisión visual mostró campos y separaciones que alejaban el total. Se compactó la columna derecha, se agruparon tipo/marca y se redujo el alto de los renglones en móvil, conservando etiquetas y blancos de toque.

## 5. Límites y qué sigue

`/ventas/[id]` todavía no tiene pantalla: es T10. Se verificó que la factura se emite y persiste, y que la navegación llega al id correcto; ese destino hoy muestra 404. No se entregó un comprobante provisional ni se avanzaron listado, anulación, tablero, semilla o despliegue.

El bloqueo de doble envío opera sobre el borrador de esta pantalla; no es una clave de idempotencia del servidor para múltiples pestañas. Ante incertidumbre de red no se debe repetir la venta sin verificar su existencia. El stock/precio/saldo mostrado es una foto conocida; los definitivos siempre se validan al emitir.

## 6. Defensa rápida

| Pregunta | Dónde mostrarlo |
| --- | --- |
| ¿Por qué no se manda el total? | `prepararEmisionVenta` y `esquemaEmitirFactura`; luego lectura del catálogo en `confirmarFactura`. |
| ¿Cómo se vende solo con teclado? | `manejarAtajo` y `onKeyDown` de BuscadorItemsVenta; recorrer F2, flechas, Enter, F4, F8 y F9. |
| ¿Cómo se evita superar stock o crédito? | Verificadores compartidos en `borrador-venta.ts` y comprobación definitiva/transaccional de T08. |
| ¿Qué cambió al crear cliente en medio de la venta? | `ModalFormularioCliente.alCompletar` cambia solo el comprador; el estado de renglones permanece en PanelNuevaVenta. |
| ¿Se guarda el número de tarjeta? | Solo `tipo`, `marca`, `ultimos4`; el campo es texto para conservar ceros y Zod exige cuatro dígitos. |
