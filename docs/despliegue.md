# Publicación de la demo en Vercel y Turso

Publicación verificada el 19/11/2026: **[parcial-2-pr4.vercel.app](https://parcial-2-pr4.vercel.app)**. Producción READY, código de `ramaPablo` en `d4539c8`. El proyecto se publicó por CLI desde el checkout local; no hay despliegue automático por Git ni se realizó push o merge.

## 1. Destino utilizado

| Recurso | Configuración |
| --- | --- |
| Equipo de Vercel | `pablocollantedev-5008` |
| Proyecto | `parcial-2-pr4` |
| Framework y runtime | Next.js 16.4.6, Node 22.x |
| Gestor | pnpm 11.8.0 mediante Corepack |
| Turso en Marketplace | `parcial-2-pr4-demo`, región `iad1` |
| Plan de Turso | Starter, $0/mes al aprovisionarlo |
| Código publicado | `d4539c84b40ba41189cbce29d12b406e48aea5cd` |
| Despliegue | `dpl_2nX1vNMAjNebs5ADkBJc5wgERpnx` |

El usuario aceptó personalmente los términos de Turso. La integración genera e inyecta sus credenciales, sin copiarlas al código ni a la documentación.

## 2. Preparación realizada una sola vez

Desde el directorio del proyecto y con la CLI autenticada en el equipo indicado:

```powershell
vercel link --yes --project parcial-2-pr4 --scope pablocollantedev-5008
vercel integration add tursocloud/database --name parcial-2-pr4-demo --billing-plan starter --meta region=iad1 --no-claim --no-env-pull --scope pablocollantedev-5008
```

No repetir `integration add` sobre esta instalación: la base ya existe y está conectada. Se extrajo su entorno de desarrollo a un archivo privado fuera del repositorio. Con `DOTENV_CONFIG_PATH` apuntando a ese archivo y sin variables `DATABASE_*` heredadas que pudieran seleccionar otro destino, se ejecutaron:

```powershell
corepack pnpm@11.8.0 run db:migrate
corepack pnpm@11.8.0 run db:seed
corepack pnpm@11.8.0 run db:seed
```

La primera carga produjo 3 usuarios, 5 categorías, 30 productos, 10 clientes, 51 facturas y 6 pagos. La segunda conservó todos los datos. Se verificaron stock contra movimientos, claves foráneas y numeración directamente en Turso. El script rechaza una base ajena y no borra datos.

Para futuras migraciones, extraer el entorno a un archivo privado ignorado y usar temporalmente `DOTENV_CONFIG_PATH`; comprobar el destino antes de escribir y retirar esa variable al terminar. No reemplazar el `.env` local de SQLite con credenciales remotas. La contraseña de demo está en README; `SEMILLA_PASSWORD` permite elegir otra solo antes de cargar una base vacía.

## 3. Variables y publicación

| Variable | Destino |
| --- | --- |
| `TURSO_DATABASE_URL` | URL remota; administrada por Marketplace. |
| `TURSO_AUTH_TOKEN` | Token privado; administrado por Marketplace. |
| `SESSION_SECRET` | Secreto aleatorio privado, distinto para producción y vista previa. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` en producción y vista previa. |

También se admiten `DATABASE_URL`/`DATABASE_AUTH_TOKEN`, con prioridad sobre los alias de Marketplace. En esta publicación se usan los alias nativos. Nunca poner credenciales en variables `NEXT_PUBLIC_*`. Los archivos `.env*`, `.vercel/`, bases locales y dependencias quedan fuera de Git y del paquete subido mediante `.vercelignore`.

Instalación configurada: `corepack pnpm@11.8.0 install --frozen-lockfile`. Compilación: `corepack pnpm@11.8.0 run build`. Las migraciones y la semilla **no** se ejecutan durante build, start o una visita. La aplicación rechaza SQLite en Vercel si falta la URL remota o su token.

El primer `vercel deploy --yes --scope pablocollantedev-5008` fue asignado automáticamente a producción por Vercel. La compilación y TypeScript pasaron; el build remoto duró 1 min 38 s. Para cambios posteriores, desplegar vista previa, comprobarla y publicar producción desde el checkout revisado:

```powershell
vercel deploy --yes --scope pablocollantedev-5008
vercel deploy --prod --skip-domain --yes --scope pablocollantedev-5008
# Tras comprobar el despliegue preparado:
vercel promote URL-DEL-DESPLIEGUE --scope pablocollantedev-5008
```

Las URL de vista previa mantienen la protección de Vercel. El dominio de entrega es público y conserva la autenticación propia de la aplicación. Actualizar variables requiere un despliegue nuevo.

## 4. Evidencia HTTPS y Turso

Se aprobaron 32 comprobaciones de navegador sobre el dominio público:

1. Acceso de los tres usuarios; cookie `httpOnly`, `Secure`, `SameSite=Lax`; vendedor recibe 403 en usuarios y anulación.
2. Contado a consumidor final por teclado; alta rápida sin perder borrador; venta a cuenta; pago parcial; anulación por administrador. Stock y saldo correctos en cada paso; el pago no modifica stock y anular después conserva crédito a favor.
3. Facturas 52 y 53, cliente 11 y recibo 7 creados por HTTPS. Consulta directa de Turso confirmó factura 53 anulada y pago por la mitad del total; otra sesión consultó la misma anulación.
4. Impresión sin navegación, filtros y tablero/listado a 1440/390/360 px sin desborde; sin excepciones JavaScript. Las dos regresiones de paginación se comprobaron además en las 35 verificaciones locales.
5. Stock igual a movimientos, relaciones válidas y correlatividad de facturas/recibos después del recorrido. Se conservó la evidencia en la demo: 53 facturas, 7 pagos y 11 clientes. Consulta de logs del despliegue: 0 registros de nivel error durante la verificación.

El [informe de T12](./tickets/T12-semilla-pruebas-y-despliegue/informe-auditoria.md) reúne las pruebas locales y remotas. Los legajos siguen pendientes de informar; el checklist personal y los archivos privados permanecen fuera de Git.

## Fuentes consultadas

- [Vercel: guía de inicio para agentes](https://vercel.com/get-started.md), [integraciones de Marketplace](https://vercel.com/docs/cli/integration) y [publicación desde CLI](https://vercel.com/docs/projects/deploy-from-cli).
- [Drizzle con Turso y migraciones](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso).
- [Vercel: Corepack y build](https://vercel.com/docs/builds/configure-a-build), [variables de entorno](https://vercel.com/docs/environment-variables) y [promoción de despliegues](https://vercel.com/docs/deployments/promoting-a-deployment).
