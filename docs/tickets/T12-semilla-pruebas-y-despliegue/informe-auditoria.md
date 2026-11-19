# Informe de Auditoría y Guía para el Desarrollador — T12

Pablo · `ramaPablo` · 19/11/2026. **Local verificado; publicación pendiente de accesos.**

## 1. Resumen para el Desarrollador

`pnpm run db:seed` carga una demostración completa por los mismos servicios que usa la web. El catálogo y los clientes son ficticios; los importes siguen en centavos y los usuarios se crean con bcrypt. Una transacción exterior contiene la carga entera; las transacciones internas de los servicios trabajan como savepoints. La adaptación de tipo está localizada en el cargador, con comentario, y se probó provocando un fallo después de cinco ventas: no quedó ningún registro de la semilla.

Hay 3 usuarios, 5 categorías, 30 productos, 10 clientes, 51 facturas, 3 anulaciones y 6 pagos parciales. Cuatro productos quedan bajo mínimo. Los eventos se espacian para respetar la cronología. Los únicos ajustes SQL de los datos creados son sus fechas; stock, precios, saldo y numeración los resuelven los servicios. No se agregó una forma pública de emitir en el pasado ni una ruta de bootstrap de administrador.

Repetir sobre la demo existente conserva todos sus registros, incluso operaciones posteriores y contraseñas cambiadas. Si la base contiene otros datos se rechaza. Se eligió idempotencia sin vaciar tablas para preservar los datos del usuario; otra demo inicial usa una base vacía distinta. La preparación local genera una clave de sesión aleatoria una sola vez. Para Vercel se exige una base remota y token, sin fallback a SQLite.

## 2. Mapa de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `src/base-de-datos/semilla.ts` | Entrada CLI, preparación local, resultado y cierre de conexión. |
| `src/base-de-datos/datos-demostracion.ts` | Catálogo, clientes, usuarios y credencial pública de demo. |
| `src/base-de-datos/cargar-datos-demostracion.ts` | Carga por servicios, transacción exterior, guardas de base ocupada y fechas privadas. |
| `src/utilidades/preparacion-local.ts` | Genera 32 bytes aleatorios para sesión local; preserva claves/contenido existentes. |
| `src/validaciones/validacion-entorno.ts` | Configuración de conexión y rechazo de SQLite en Vercel. |
| `src/base-de-datos/conexion.ts`, `drizzle.config.ts` | Reutilizan la misma configuración en aplicación y migraciones. |
| `src/pruebas/integracion-defensa.prueba.ts` | Demo completa, hashes, stock, saldo, correlatividad, cronología, recibos, repetición y rollback. |
| `src/pruebas/entorno-y-preparacion.prueba.ts` | Secreto local y configuración de despliegue sin secretos reales. |
| `src/app/(sistema)/ventas/page.tsx` | Corrige página fuera de rango y redirige conservando filtros. |
| `src/componentes/dominio/ventas/pantalla-listado-facturas.tsx` | Bloquea paginación mientras está pendiente un filtro. |
| `src/pruebas/pagina-facturas.prueba.ts` | Regresión de página vacía y normalización al último resultado. |
| `.env.example`, `.gitignore`, `package.json` | Variables, exclusión de configuración local de Vercel y Node 22. |
| `docs/despliegue.md` | Pasos vigentes de Turso/Vercel y comprobaciones públicas pendientes. |
| `README.md`, `respuestas-defensa.md`, documentación de T12 | Instalación real, cuentas, estado y defensa; enlaces portables. |

## 3. Verificaciones y correcciones

- **Suite:** 299 pruebas en 19 archivos; tipos y compilación aprobados. T12 agrega 11 casos a los 288 anteriores. Las pruebas previas de permisos, concurrencia y transacciones permanecen activas.
- **Instalación limpia:** exportación sin `.env`, base ni `node_modules`; instalación desde lockfile, copia de `.env.example`, migración, semilla dos veces y build de producción aprobados. La clave de sesión se generó automáticamente y los conteos no cambiaron al repetir.
- **Navegador:** 35 comprobaciones sobre la compilación de la instalación limpia y una copia aislada de su base. Los tres usuarios acceden. Vendedor recibe 403 al invocar APIs de administrador/anulación. Contado por teclado, alta rápida de cliente con cuenta, venta a cuenta, pago parcial y anulación preservan stock y saldo. Anular después de cobrar deja el crédito a favor correspondiente. Impresión sin navegación y escritorio/tablet/móvil a 1440/768/390/360 px sin desborde de página. No hubo excepciones JavaScript.
- **Inspección visual:** 0 FAIL en los cuatro anchos; capturas revisadas. Se conservan dos advertencias justificadas: paleta del sistema existente y alturas naturales diferentes entre un ranking de cinco productos y la lista real de cuatro para reponer. No se inventó una quinta fila para igualarlas. La demo oficial en puerto 3000 se comprobó con ambos roles sin mutaciones.
- **Invariantes:** cada existencia coincide con sus movimientos y sus saldos intermedios; cada saldo de cliente con débitos menos créditos; facturas/recibos sin huecos; recibos con saldo histórico; fechas de comprobantes y movimientos coincidentes; claves foráneas intactas. La carga repetida preserva una categoría y un ingreso agregados después.
- **Rollback:** un trigger de prueba aborta el sexto comprobante. Se verifica que las nueve tablas vuelvan a vacías y que al quitar el fallo se pueda cargar la demo completa.
- **Regresiones de T10:** dos pruebas de página fallaron antes de la corrección y pasaron después. El navegador confirmó volver desde la última factura anulada a la página válida con filtros y que pulsar Siguiente durante una consulta retenida no pierde Tarjeta.
- **Secreto y destino:** clave local persistida una vez, variables/comentarios conservados, no generación de clave local para Turso, configuración de Vercel sin SQLite. Ningún valor privado se agregó a Git.

Una ejecución de la suite junto con la instalación agotó los cinco segundos de una prueba anterior de bcrypt. Se repitió sin esa carga simultánea y aprobaron las 299 pruebas; no se redujo el costo del hash ni se ampliaron los límites globales de pruebas.

**Corrección para P6.4:** en el listado de T10, la URL aún representaba los filtros anteriores mientras esperaba el servidor, pero Siguiente seguía activo. Se agregó el bloqueo nativo del grupo de botones y una guarda de navegación pendiente. Además, al anular la única fila de página 2, la página no corregía su índice y mostraba `4–3 de 3` sin forma de volver; ahora redirige fuera del manejo de errores a la última página válida, conservando filtros.

## 4. Publicación y límites

No hay proyecto vinculado, credenciales remotas ni URL pública confirmada. Se solicitaron las cuentas/proyectos y legajos, y se ofreció la conexión disponible de Vercel. El procedimiento está preparado con fuentes oficiales, pero no se migró ni cargó Turso, no se desplegó Vercel y no se verificaron cookies HTTPS ni persistencia entre instancias remotas. Estas partes siguen pendientes; el ticket completo no se declara terminado.

Las bases temporales y sus credenciales, capturas, scripts de navegador y checklist personal están fuera de Git. La demo anterior de T09/T11 se conserva en su archivo temporal; la aplicación local ahora usa la semilla oficial de T12 en `local.db`. La base personal no se usó para las mutaciones del navegador. No se probó una impresora física, otros navegadores ni carga masiva.

## 5. Guía de defensa

1. **¿La semilla puede generar stock o saldo incoherente?** Abrir `cargarDatosDemostracion` y seguir las llamadas a los servicios. Mostrar el test de rollback y los cálculos independientes sobre movimientos. La semilla solo ajusta fechas después de las operaciones.
2. **¿Qué pasa al ejecutarla dos veces?** Mostrar la guarda de base ocupada y la prueba que agrega una operación posterior. No se borran datos ni se reinician contraseñas; para otra demo inicial se elige un destino vacío.
3. **¿Cómo saben que la publicación usa Turso?** Mostrar la configuración que rechaza SQLite en Vercel y el procedimiento de emitir en la URL HTTPS y consultar el registro desde Turso. Aclarar que esa comprobación remota sigue pendiente hasta disponer de los accesos.
