# Auditoría conjunta de T09, T10, T11 y T12

Pablo · `ramaPablo` · 19/11/2026. Código de aplicación revisado: `d4539c8`; documentación previa: `bdad394`.

## Resultado

**Aprobado para probar. No se encontraron nuevos defectos funcionales bloqueantes.** La compilación de producción está ejecutándose en [localhost:3000](http://localhost:3000), con la base local del usuario conservada. La auditoría no necesitó cambios de código ni dependencias.

La aplicación conecta Nueva venta → API/servicio transaccional → comprobante/listado → tablero y cuenta corriente. Se revisaron los planes y criterios de los cuatro tickets, sus páginas/componentes, validaciones, errores, servicios conectados, pruebas y configuración de semilla/despliegue. La carga asumida es la de un comercio de un solo local con pocos vendedores simultáneos.

| Ticket | Verificación y resultado |
| --- | --- |
| **T09** | Teclado, precios del servidor, contado/tarjeta/cuenta, alta rápida sin perder borrador, stock y crédito. Texto de monto inválido bloquea emisión; repetir el medio activo conserva datos. Sesión vencida conserva borrador. Doble F9 produce una solicitud. Un 500 después de guardar bloquea el reenvío. Sugerencias paginadas y opción visible al usar flechas. |
| **T10** | Filtros URL y paginación, comprobante, roles y 403, anulación y reversión. La última factura anulada vuelve a una página válida; paginar durante un filtro pendiente no lo descarta. Impresión/PDF y ocultación del modal abierto correctas. |
| **T11** | Indicadores y gráficos con importes reales; el tablero refleja inmediatamente venta y anulación. Fecha argentina, treinta días, promedio, exclusión de anuladas y deuda positiva cubiertos en la suite. Actualizar bloquea repetición; un fallo controlado ofrece reintento y se recupera al restaurar la base. |
| **T12** | Semilla atómica, idempotencia sin borrado, hashes, cronología, stock/saldo/numeración y rechazo de base ajena cubiertos en la suite. Vercel sigue READY; acceso de ambos roles y datos remotos comprobados en modo de lectura. |

## Evidencia ejecutada en esta auditoría

- **301 pruebas Vitest en 19 archivos**, todas aprobadas; duración de 22,82 s. No se cambió el costo de bcrypt, el tiempo de espera ni la configuración de pruebas.
- **Tipos y build de producción aprobados**, Node 22, pnpm 11.8.0 y Next.js 16.4.6.
- **68 comprobaciones de navegador aprobadas:** 35 del recorrido integrado, 7 regresiones de T09 y 26 controles adicionales de actualización, errores, sesión, tarjeta e impresión. Los datos provienen de una copia aislada de la demo; sus operaciones no se ejecutaron sobre la base personal ni sobre Turso.
- **Concurrencia adicional:** dos procesos Node y dos usuarios intentaron vender la última unidad. Respuestas 201/409, una factura confirmada y existencia final cero.
- **Interfaz:** tablero y listado a 1440/768/390/360 px sin desborde de página; capturas de escritorio y móvil revisadas. El desplazamiento de las tablas queda en su propio contenedor. Se conservó el diseño existente.
- **Fallos controlados:** sesión cerrada durante un borrador, respuesta 500 posterior a una emisión y tabla temporalmente no disponible en la copia. El último caso generó errores esperados únicamente en el servidor aislado; se restauró la tabla y se verificaron sus relaciones. No hubo excepciones JavaScript en los recorridos normales.
- **Servidor para prueba manual:** build actual en puerto 3000; administrador y vendedor inician sesión, se dibujan ambos gráficos y responde la API del tablero sin excepciones. No se emitieron facturas ni se alteró stock/saldo en esta comprobación manual.
- **Producción:** [parcial-2-pr4.vercel.app](https://parcial-2-pr4.vercel.app), despliegue `dpl_2nX1vNMAjNebs5ADkBJc5wgERpnx` READY. Consulta de solicitudes con HTTP 500 o superior durante la última hora: 0 registros. Las comprobaciones del cierre original de T12, incluida persistencia de factura/pago/anulación, siguen documentadas en su informe.

## Hallazgo documental corregido

Los informes/plan de T09 todavía describían el comprobante como pendiente y su ruta como un 404 actual. El informe de T11 también dejaba las dos regresiones de paginación como pendientes, aunque T12 ya las había corregido. Se distinguió el alcance histórico de cada revisión del estado actual y se enlazó esta auditoría desde los cuatro informes. No quedaban esos errores en la aplicación compilada.

## Archivos clave para la defensa

| Flujo | Dónde seguirlo |
| --- | --- |
| Borrador y confirmación | [panel-nueva-venta.tsx](../src/componentes/dominio/ventas/panel-nueva-venta.tsx), [borrador-venta.ts](../src/servicios/borrador-venta.ts), [servicio-facturas.ts](../src/servicios/servicio-facturas.ts). |
| Listado e impresión | [pantalla-listado-facturas.tsx](../src/componentes/dominio/ventas/pantalla-listado-facturas.tsx), [consultas-facturas.ts](../src/utilidades/consultas-facturas.ts), [vista-comprobante-factura.tsx](../src/componentes/dominio/ventas/vista-comprobante-factura.tsx). |
| Tablero y períodos | [servicio-tablero.ts](../src/servicios/servicio-tablero.ts), [fechas-tablero.ts](../src/utilidades/fechas-tablero.ts), [pantalla-tablero.tsx](../src/componentes/dominio/tablero/pantalla-tablero.tsx). |
| Demo y entorno | [cargar-datos-demostracion.ts](../src/base-de-datos/cargar-datos-demostracion.ts), [integracion-defensa.prueba.ts](../src/pruebas/integracion-defensa.prueba.ts), [validacion-entorno.ts](../src/validaciones/validacion-entorno.ts), [despliegue](./despliegue.md). |

## Prueba manual y límites

Abrir [localhost:3000](http://localhost:3000). Administradora `laura@ferreteria.test`; vendedor `pablo@ferreteria.test` y vendedora `ana@ferreteria.test`. Contraseña pública de demo: `DemoFerreteria123!`.

No se probaron impresoras físicas, otros motores de navegador ni carga masiva. Se mantiene el UTC−3 fijo documentado para Argentina. Las cuentas publicadas son de demostración y solo deben usarse con datos ficticios. Siguen pendientes los legajos del equipo; no se realizó push, merge ni un nuevo despliegue. El checklist personal, bases, credenciales y scripts/capturas permanecen fuera de Git.
