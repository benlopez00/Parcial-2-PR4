# Publicación de la demo en Vercel y Turso

Estado al 19/11/2026: preparación y pruebas locales realizadas; publicación pendiente de disponer de las cuentas/proyectos de entrega. Todavía no hay URL pública verificada. No se ejecutaron migraciones ni semilla contra Turso.

## 1. Datos del destino

- Confirmar la cuenta/equipo de Vercel, el proyecto y la rama de entrega. El trabajo actual está en `ramaPablo`; no se integra automáticamente a `main`.
- Seleccionar una base Turso vacía y exclusiva de esta demostración. El cargador rechaza bases ajenas y no tiene un comando para borrar datos.
- Guardar URL/token y secreto de sesión en el entorno del operador y del proyecto, nunca en Git. `.env*` y `.vercel/` están excluidos.

## 2. Preparar Turso una sola vez

Con la CLI del proveedor instalada y autenticada en la cuenta acordada:

```powershell
turso auth login
turso db create NOMBRE-DEMO
$env:DATABASE_URL = turso db show NOMBRE-DEMO --url
$env:DATABASE_AUTH_TOKEN = turso db tokens create NOMBRE-DEMO --expiration 30d
corepack pnpm@11.8.0 run db:migrate
corepack pnpm@11.8.0 run db:seed
```

Elegir `SEMILLA_PASSWORD` antes de la primera carga si las cuentas publicadas no van a usar la credencial pública de demo del README. Repetir la semilla conserva también contraseñas y fechas; no cambia las cuentas ya creadas. Los usuarios pueden cambiar su contraseña desde Perfil.

Verificar conteos (3 usuarios, 5 categorías, 30 productos, 10 clientes, 51 facturas, 6 pagos) y las invariantes de stock/cuenta antes de conectar Vercel. El token necesita permisos de escritura porque la aplicación factura, registra pagos y ajusta stock. Planificar su renovación antes del vencimiento elegido. Después de la preparación, retirar las variables de la consola o volver al destino local antes de otros comandos.

No ejecutar `db:generate`, migraciones o semilla como parte de `build`, `start`, una visita o un arranque de función. Las migraciones existentes en `src/base-de-datos/migraciones` son la fuente del esquema.

## 3. Configurar y publicar en Vercel

Importar el repositorio o vincular el directorio mediante la CLI en la cuenta acordada. Usar Next.js como framework, Node 22 y pnpm 11.8.0, fijados en `package.json`. Mantener la carpeta raíz del proyecto sin exportación estática.

Configurar estas variables para el entorno que se va a desplegar:

| Variable | Valor / destino |
| --- | --- |
| `DATABASE_URL` | URL `libsql://…` de la base de demo de Turso. |
| `DATABASE_AUTH_TOKEN` | Token de esa base, solo del lado servidor. |
| `SESSION_SECRET` | Clave aleatoria privada de al menos 32 bytes, exclusiva de este despliegue. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`, para respetar `packageManager`. |

Instalación: `pnpm install --frozen-lockfile`. Compilación: `pnpm run build`. No exponer ninguna credencial con un prefijo `NEXT_PUBLIC_`. `SEMILLA_PASSWORD` se necesita solo durante la carga inicial, no durante el funcionamiento de la web.

Primero desplegar una vista previa. Si se usa la CLI, el flujo es `vercel link`, `vercel deploy` y, tras las comprobaciones, `vercel deploy --prod`. Actualizar las variables requiere un despliegue nuevo. El código rechaza SQLite local en Vercel para evitar un despliegue que aparente funcionar con datos efímeros o sin base remota.

## 4. Comprobaciones sobre la URL HTTPS

1. Iniciar sesión como administrador y vendedor. Revisar cookie `httpOnly`, `Secure`, `SameSite=Lax`; el vendedor debe recibir 403 al llamar directamente una API de administrador.
2. Emitir contado a consumidor final, crear un cliente con cuenta corriente, venderle, registrar un pago parcial y anular una factura como administrador. Verificar stock y saldo después de cada paso.
3. Comprobar el registro recién creado desde el panel o shell de Turso; recargar y consultar desde otra sesión. Esto prueba persistencia remota sin agregar endpoints que expongan la configuración.
4. Revisar tablero, listado, filtros, comprobante/impresión y 360/390 px. Verificar que anular la última factura de una página lleva a una página válida y que los filtros no se pierden al esperar una consulta.
5. Registrar URL, fecha, commit desplegado y resultados en el informe de T12. Completar los legajos recibidos y cambiar T12 a Completado únicamente después de aprobar estas comprobaciones.

## Fuentes consultadas

- [Turso: crear una base](https://docs.turso.tech/cli/db/create) y [crear tokens y vencimiento](https://docs.turso.tech/cli/db/tokens/create).
- [Drizzle con Turso y migraciones](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso).
- [Vercel: compilar y usar Corepack](https://vercel.com/docs/builds/configure-a-build), [variables de entorno](https://vercel.com/docs/environment-variables) y [publicar desde CLI](https://vercel.com/docs/projects/deploy-from-cli).
