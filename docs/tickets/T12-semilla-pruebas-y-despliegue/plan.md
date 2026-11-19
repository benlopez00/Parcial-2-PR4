# Plan Técnico — T12

Pablo · `ramaPablo` · 19/11/2026.

## 1. Resumen del flujo

1. Preparar una demo repetible con tres usuarios, cinco categorías, treinta productos, diez clientes, 51 facturas, tres anulaciones y seis pagos parciales. Catálogo realista de ferretería e importes en centavos.
2. Ejecutar toda la carga dentro de una transacción. Usar los servicios existentes y sus transacciones anidadas; si falla una venta, no queda ninguna parte de la semilla. El contexto de administrador inicial existe solo en el script, sin ruta pública de bootstrap.
3. Repetir es una operación sin cambios si ya existe la demo completa. Si hay datos ajenos o incompletos se rechaza, sin borrar nada. Se elige esta idempotencia sin reinicio destructivo en lugar de vaciar tablas. Una demo nueva se carga en otra base vacía identificada.
4. Crear operaciones en orden cronológico. Ajustar únicamente las fechas de sus propios registros: altas, stock inicial, factura, débito/venta, pago/crédito y anulación/reversión. No abrir la API a fechas arbitrarias ni modificar cantidades/precios/saldos mediante SQL.
5. `db:seed` genera una clave de sesión local aleatoria si no existe y conserva claves configuradas. La contraseña de demo se puede elegir con `SEMILLA_PASSWORD`; el valor público por defecto se documenta como exclusivo de demostración.
6. Ejecutar las invariantes de stock, saldo, numeración, fechas y recibos históricos sobre la demo real. Probar repetición, base ajena y fallo a mitad de carga.
7. Cerrar los dos errores de paginación detectados en T10: impedir paginar mientras un filtro está pendiente y redirigir a la última página válida después de una anulación. Pruebas que reproduzcan los casos antes y después.
8. Comprobar instalación desde lockfile, migración, semilla dos veces, build, tipos, suite y recorrido completo en navegador con ambos roles y móvil.
9. Preparar Vercel/Turso con documentación actual. En Vercel, rechazar el fallback a SQLite si falta la URL remota o su token. No ejecutar migración o semilla durante build ni al iniciar el servidor.
10. Completar publicación y comprobaciones HTTPS cuando estén disponibles la cuenta/proyectos y el destino de Turso. No inventar URL pública, legajos ni evidencia remota.

## 2. Archivos

- `src/base-de-datos/semilla.ts`: entrada del comando, configuración y cierre de conexión.
- `src/base-de-datos/datos-demostracion.ts`: datos ficticios y contraseña pública de demo.
- `src/base-de-datos/cargar-datos-demostracion.ts`: carga transaccional, repetición segura y fechas privadas.
- `src/utilidades/preparacion-local.ts`: clave local persistida una sola vez.
- `src/validaciones/validacion-entorno.ts`, `src/base-de-datos/conexion.ts`, `drizzle.config.ts`: misma configuración de conexión y rechazo de SQLite en Vercel.
- `src/pruebas/integracion-defensa.prueba.ts`, `entorno-y-preparacion.prueba.ts`: consistencia, rollback, idempotencia y entorno.
- `src/app/(sistema)/ventas/page.tsx`, `src/componentes/dominio/ventas/pantalla-listado-facturas.tsx`, `src/pruebas/pagina-facturas.prueba.ts`: regresiones de paginación.
- `.env.example`, `.gitignore`, `package.json`: variables, archivos locales excluidos y Node 22.
- README, respuestas de defensa y documentación de T12. El checklist personal continúa fuera de Git.

## 3. Funciones y contratos

- `cargarDatosDemostracion(baseDatos, contrasenaSinValidar?)`: devuelve `creada` y conteos; valida la contraseña con el esquema existente antes de escribir.
- `fecharFactura(...)`: privada; ajusta las fechas de la factura y de sus movimientos asociados, incluyendo anulación.
- `prepararSesionLocal(rutaEntorno?)`: genera 32 bytes aleatorios; conserva secreto y contenido existentes. No escribe para Vercel o Turso.
- `obtenerConfiguracionBaseDatos(entorno?)`: configuración compartida por aplicación y migraciones. SQLite local sigue permitido en `next start` local.

## 4. Publicación y datos pendientes

Al iniciar T12 no hay CLI autenticada, proyecto vinculado ni base remota configurada. Se solicitó la cuenta/proyecto de Vercel y Turso y los legajos del equipo; se ofreció la conexión de Vercel disponible. Hasta comprobar conexión, migraciones remotas y URL HTTPS, el estado de publicación se mantiene pendiente. La preparación local continúa independiente.

## 5. Defensa

P1.4: comando y datos de demo. P6.1: variables y secretos. P6.2: migraciones locales/remotas, sin afirmarlas ejecutadas si faltan accesos. P6.3: bloqueo de SQLite en Vercel y verificación pública pendiente. P6.4: errores reales reproducidos, reversión de la semilla y correcciones de paginación.

## 6. Resultado local

299 pruebas, tipos, build e instalación desde cero aprobados; migración y semilla repetida sin duplicados. La compilación de la instalación limpia aprobó 35 comprobaciones de navegador sobre una copia de la base. Ambas regresiones de paginación quedaron corregidas. README y defensa actualizados, con 121 enlaces locales convertidos a rutas portables. La demo oficial funciona en `localhost:3000`. Quedan pendientes publicación y verificación remota de T12.08–T12.10 y cierre de T12.11 con URL y legajos reales.
