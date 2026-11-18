# Plan técnico — T09: Nueva Venta

Responsable: Pablo. Rama: `ramaPablo`. Base de partida: `a689883`.

## 1. Resumen del flujo

Una página protegida compone el mostrador con productos, comprador, pago y resumen. Los buscadores usan las API existentes con consultas cancelables. El borrador vive en el componente cliente y se conserva frente a rechazos; un módulo de dominio aplica los mismos verificadores de stock/pago que la emisión, sin escribir datos. La API vuelve a leer precios, stock, usuario y crédito reales dentro de su transacción al confirmar.

Se revisaron visualmente las cinco referencias: venta vacía, búsqueda, cuenta corriente, alta de cliente y móvil. Se conserva la identidad actual de Mostrador, sus primitivas y su paleta; no se rediseña la navegación. La pregunta de la pantalla es «¿qué vendo, a quién y cómo lo cobraremos?», y el total con Confirmar es su acción principal. No se agregan dependencias.

## 2. Archivos a crear o modificar

- `src/app/(sistema)/ventas/nueva/{page,loading,error}.tsx`: adaptadores de navegación, sesión y estados.
- `src/componentes/dominio/ventas/`: `panel-nueva-venta.tsx`, `buscador-items-venta.tsx`, `tabla-renglones-venta.tsx`, `selector-comprador-venta.tsx`, `selector-forma-pago.tsx` y `usar-busqueda-venta.ts`.
- `src/servicios/borrador-venta.ts`: operaciones puras del estado de pantalla, contratos de emisión y anticipación de rechazos. No accede a BD ni autoriza operaciones.
- `src/servicios/calculos-venta.ts`: aritmética exacta compartida con el servidor.
- `src/servicios/servicio-facturas.ts`: extraer únicamente subtotal/suma a las funciones anteriores; mantener validación, lectura de catálogo, permisos y transacción.
- `src/validaciones/validacion-facturas.ts`: exponer la misma cantidad que valida la emisión para usarla en el borrador.
- `src/errores/errores-nueva-venta.ts`: mensajes legibles de validación y faltantes; conservar errores HTTP.
- `src/componentes/formularios/campo-importe.tsx`: callback opcional de validez, para distinguir un texto inválido de un monto automático vacío sin romper sus demás usuarios.
- `src/utilidades/formatos.ts`: contador entero con formato argentino, usando el formateador ya existente.
- `src/pruebas/nueva-venta.prueba.ts`: cantidades, dinero, pagos, contrato y errores.
- Documentación de T09, README y respuestas de defensa.

## 3. Firmas y contratos principales

- `agregarProductoVenta(renglones, producto, cantidad)`: suma en una sola fila y devuelve un borrador nuevo después de validar cantidad, stock y rango; no modifica el original.
- `cambiarCantidadVenta(renglones, producto, cantidad)`: reemplaza cantidad y subtotal con la foto conocida del catálogo.
- `resumirVenta(renglones, cliente?, pago?)`: calcula total, unidades, monto recibido, vuelto y saldo resultante orientativos.
- `validarPagoVenta(cliente, pago, total)`: comparte esquema Zod y verificadores de cliente activo, cuenta corriente, crédito y monto recibido. La emisión sigue siendo la autoridad.
- `prepararEmisionVenta(renglones, cliente, pago)`: devuelve únicamente `{ clienteId, items: [{ productoId, cantidad }], pago }` validado por `esquemaEmitirFactura`.
- `calcularSubtotalVenta(precio, cantidad)` y `sumarImportesVenta(importes)`: calculan con BigInt y verifican el entero seguro antes de devolver number. Sirven al borrador y a confirmarFactura.
- `GET /api/productos?q=...&activo=true`, `GET /api/clientes?q=...&activo=true` y `GET /api/facturas/proximo-numero`: contratos existentes, sin endpoints nuevos.
- `POST /api/facturas`: contrato existente; un bloqueo inmediato evita doble envío. Una respuesta de red incierta no habilita un reintento automático.

El alta rápida reutiliza `ModalFormularioCliente` de T07, cuya Server Action ya llama al mismo servicio que la API REST; no se copia el formulario para cambiar de transporte.

## 4. Reglas de negocio y errores controlados

Se reutilizan los verificadores existentes: productos activos/stock (RF-V3/Regla 1), cliente activo, cuenta corriente (Regla 6), límite (Regla 7), monto recibido y rango monetario (Regla 10). La cantidad y el pago usan el esquema compartido. Precios/totales nunca viajan en el cuerpo (Regla 3); el número es informativo hasta emitir (Regla 4); solo se piden cuatro dígitos de tarjeta (Regla 9).

Se muestran VALIDACION, STOCK_INSUFICIENTE con todos sus códigos/disponibles, PRODUCTO_INACTIVO, CLIENTE_INACTIVO, CUENTA_CORRIENTE_NO_HABILITADA, LIMITE_CREDITO_EXCEDIDO, MONTO_INSUFICIENTE y NO_AUTENTICADO. La pantalla conserva el borrador si la API rechaza. No se altera moverStock, la fórmula de saldos, los permisos ni el esquema de BD.

F2 enfoca productos; F4 selecciona el modo registrado y enfoca clientes; F8 enfoca pago; F9 confirma. Los atajos respetan eventos consumidos, modificadores, diálogos, repetición y envío en curso.

### Límite de alcance

La emisión redirige a `/ventas/[id]`, destino especificado por T09. La vista completa de ese comprobante pertenece a T10 y todavía no existe. No se agrega un comprobante provisional ni se marca T10 como implementado; se verifica la emisión por respuesta y BD.

## 5. Preguntas de defensa cubiertas

- P2.6: cuerpo público sin precios/totales y cálculo autoritativo del servidor.
- P4.1: tarjeta limitada a tipo, marca y cuatro últimos dígitos.
- P5.4: recorrido de teclado y bloqueo de confirmación repetida.
- P5.3: cantidad y pago con el mismo Zod; verificadores compartidos en borrador y emisión.

## Subtickets

Cada tarea tiene un archivo propio y criterio de aceptación. Este desglose es documentación de T09; el checklist personal permanece fuera de Git.

| Ticket | Tarea | Estado |
| --- | --- | --- |
| [T09.01](tareas/T09.01-plan-tecnico.md) | Cerrar el plan técnico | Completado |
| [T09.02](tareas/T09.02-estructura-pantalla.md) | Construir la pantalla protegida | Completado |
| [T09.03](tareas/T09.03-buscador-productos.md) | Buscar productos con teclado | Completado |
| [T09.04](tareas/T09.04-renglones-cantidades.md) | Administrar renglones y cantidades | Completado |
| [T09.05](tareas/T09.05-comprador.md) | Seleccionar comprador | Completado |
| [T09.06](tareas/T09.06-alta-cliente.md) | Crear cliente sin perder la venta | Completado |
| [T09.07](tareas/T09.07-contado-tarjeta.md) | Cobrar con contado o tarjeta | Completado |
| [T09.08](tareas/T09.08-cuenta-corriente.md) | Cobrar en cuenta corriente | Completado |
| [T09.09](tareas/T09.09-confirmacion.md) | Confirmar por la API de facturas | Completado |
| [T09.10](tareas/T09.10-errores-descarte.md) | Conservar el borrador frente a errores | Completado |
| [T09.11](tareas/T09.11-atajos-accesibilidad.md) | Completar atajos y adaptación móvil | Completado |
| [T09.12](tareas/T09.12-pruebas-auditoria.md) | Probar, auditar y documentar | Completado |
