# Ticket T12 — Script de Datos Iniciales (`semilla.ts`), Pruebas Integrales y Despliegue (Vercel + Turso)

- **Responsable:** Pablo (`ramaPablo`)
- **Estado:** Implementación local verificada; publicación pendiente de accesos.
- **Hito:** Hito 4 — Cierre
- **Dependencias:** `T01` a `T11`

---

## 1. Objetivo

Construir el script de datos de prueba (`src/base-de-datos/semilla.ts`) invocando a los **mismos servicios de negocio** del sistema para garantizar consistencia absoluta, ejecutar la lista de control completa de la defensa (Sección 10.8) y dejar documentado y verificado el despliegue en producción con **Vercel** y **Turso**.

---

## 2. Requerimientos y Reglas Incluidas

- **Sección 8 y 10.7 Datos iniciales (`pnpm run db:seed`):**
  - Debe crear como mínimo:
    - **2 usuarios (uno por rol):** por ejemplo `laura@ferreteria.test` (`admin`) y `pablo@ferreteria.test` + `ana@ferreteria.test` (`vendedor`).
    - **5 categorías:** por ejemplo *Herramientas*, *Electricidad*, *Bulonería*, *Pinturería* y *Jardín*.
    - **30 productos** realistas de ferretería con su stock inicial cargado como movimiento de ingreso y **al menos 4 productos bajo el stock mínimo** para que el tablero y las alertas muestren datos desde el primer arranque.
    - **10 clientes** con DNI/CUIT reales de formato argentino (varios con cuenta corriente habilitada y límites de crédito).
    - **Al menos 50 facturas** repartidas en los últimos 30 días (combinando *contado*, *tarjeta* y *cuenta corriente*, e incluyendo alguna factura *anulada*) y **recibos de pago** parciales en cuenta corriente, creados usando los servicios para que existencias, saldos y numeración cuadren al centavo.
- **Sección 9 Puesta en marcha local sin pasos manuales:**
  ```bash
  pnpm install
  cp .env.example .env
  pnpm run db:migrate
  pnpm run db:seed
  pnpm run dev
  ```
- **Sección 10.8 Lista de control de la defensa:**
  - Prueba integral automatizada (`src/pruebas/integracion-defensa.prueba.ts`) que verifique los puntos de la lista de control:
    1. La existencia de cada uno de los 30 productos coincide exactamente con la suma de sus movimientos en `movimientos_stock`.
    2. El saldo de cada uno de los 10 clientes coincide exactamente con la suma de sus débitos menos sus créditos en `movimientos_cuenta`.
    3. Numeración correlativa de facturas y recibos sin huecos.

---

## 3. Archivos a Crear / Modificar

- **Semilla de Datos (`src/base-de-datos/semilla.ts`):**
  - Script ejecutable con `pnpm run db:seed` (idempotente: limpia o reinicia en orden las tablas y carga el conjunto de datos usando los servicios).
- **Prueba Integral de Cierre (`src/pruebas/integracion-defensa.prueba.ts`):**
  - Ejecuta la semilla o un flujo completo y comprueba las invariantes matemáticas de stock, saldos y correlatividad.
- **Documentación Final (`README.md` y `respuestas-defensa.md`):**
  - Completar URL pública de Vercel, comandos de migración/seed hacia Turso y credenciales de prueba.

---

## 4. Criterios de Aceptación

1. Al correr `pnpm run db:migrate && pnpm run db:seed` sobre una base vacía, el sistema arranca con los usuarios, 5 categorías, 30 productos, 10 clientes y más de 50 facturas distribuidas en los últimos 30 días.
2. En todos los productos cargados se cumple `producto.existencia === SUM(movimientos_stock.cantidad)`.
3. En todos los clientes cargados se cumple `saldo === SUM(debitos) - SUM(creditos)`.
4. Todas las pruebas de `src/pruebas/` pasan al 100% con `pnpm test`.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P1.4:** ¿Dónde se cargan los datos de prueba?
- **P6.1:** ¿Qué variables de entorno necesita el sistema en producción y dónde se cargan?
- **P6.2:** ¿Cómo se crearon las tablas en Turso?
- **P6.3:** ¿Cómo se comprueba que el sitio publicado usa la base de Turso y no una local?
- **P6.4:** ¿Qué agente usaron y para qué partes del sistema? Muestren algo que el agente hizo mal y cómo lo corrigieron.


## 6. Ejecución y estado real — 19/11/2026

- [x] T12.01: diseño de carga atómica e idempotencia sin borrar datos ajenos.
- [x] T12.02: 3 usuarios, 5 categorías, 30 productos y 10 clientes con datos ficticios.
- [x] T12.03: 51 facturas distribuidas en 30 días y tres formas de pago; 3 anuladas.
- [x] T12.04: fechas privadas coherentes en altas, stock, cuenta, facturas, pagos y anulaciones.
- [x] T12.05: 6 pagos parciales; repetición conserva datos y no genera duplicados.
- [x] T12.06: invariantes, numeración, recibos históricos y rollback integral automatizados.
- [x] T12.07: instalación limpia, 299 pruebas, tipos, build y 35 comprobaciones de navegador; dos regresiones de T10 corregidas.
- [ ] T12.08: migración y carga en Turso pendientes de cuenta/base y acceso. Configuración y procedimiento preparados.
- [ ] T12.09: publicación en Vercel pendiente de cuenta/proyecto y destino de entrega.
- [ ] T12.10: recorrido sobre URL pública HTTPS y persistencia remota pendientes del despliegue.
- [ ] T12.11: README, auditoría y defensa actualizados; faltan URL pública/evidencia remota y legajos para cerrar la entrega.

**Decisión sobre repetición:** se implementó una carga sin borrado: una demo completa existente produce una operación sin cambios; una base ajena se rechaza. No hay reinicio destructivo. La primera carga usa una transacción y los servicios existentes. La prueba de fallo a mitad de carga confirma que no quedan datos parciales.

La parte local está verificada. T12 no se marca Completado porque todavía no hay un despliegue verificado en Vercel/Turso. Ver [informe](./informe-auditoria.md) y [procedimiento de publicación](../../despliegue.md).
