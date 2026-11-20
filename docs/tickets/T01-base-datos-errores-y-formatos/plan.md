## 1. Resumen del flujo

T01 prepara la base técnica que usarán los demás tickets: proyecto, persistencia, errores y formatos.  
La aplicación seleccionará SQLite local o Turso mediante las variables de entorno.  
Drizzle definirá las nueve tablas y permitirá reproducir su estructura mediante migraciones.  
Los errores se convertirán centralizadamente al contrato público de API o Server Actions.  
Las utilidades mostrarán importes, fechas y comprobantes con formato argentino; Vitest verificará estos pilares.

## 2. Archivos a crear o modificar

Todas las rutas parten de `C:/Proyectos/Parcial-2-PR4/`. Actualmente el repositorio contiene documentación, sin aplicación inicializada.

**Base de datos / Utilidades**

- `src/base-de-datos/conexion.ts`: conexión dual e instancia `bd`.
- `src/base-de-datos/esquema.ts`: nueve tablas, relaciones, restricciones y tipos inferidos.
- `src/base-de-datos/migraciones/0000_inicial.sql`: migración inicial, junto con los metadatos generados por Drizzle.
- `src/utilidades/formatos.ts`: conversiones y formatos centralizados.

**Validaciones Zod**

- Sin archivos de validación de dominio en T01. Se instalará Zod y se probará su integración con el manejador; los esquemas de cada módulo corresponden a sus tickets.

**Control de errores y verificadores**

- `src/errores/codigos-error.ts`.
- `src/errores/error-api.ts`.
- `src/errores/manejador-errores.ts`.
- `src/errores/verificadores-negocio.ts`.

**Flujo normal en servicios**

- Sin servicios nuevos: T01 prepara infraestructura; no implementa ventas, stock, autenticación ni cuenta corriente.

**Adaptadores API / Páginas / Componentes**

- `src/app/layout.tsx`, `src/app/page.tsx` y `src/app/globals.css`: arranque técnico mínimo de Next.js y Tailwind.
- Sin endpoints ni pantallas funcionales. El ticket no lista capturas de referencia.

**Pruebas separadas**

- `src/pruebas/ayudantes-prueba.ts`.
- `src/pruebas/base-errores-formatos.prueba.ts`.

**Configuración de raíz**

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`.
- `postcss.config.mjs`, `components.json`, `drizzle.config.ts`, `vitest.config.ts`.
- `.env.example`, `.gitignore`.

Se definirán los scripts `dev`, `build`, `test`, `db:migrate` y `db:seed`; la carga de datos mediante servicios queda para T12.

## 3. Firmas de funciones principales —en castellano—

| Firma prevista | Resultado |
|---|---|
| `formatearMoneda(centavos: number): string` | Pesos argentinos, por ejemplo `$ 12.500,00`. |
| `pesosACentavos(pesos: number \| string): number` | Entero exacto en centavos, con tratamiento explícito de entradas inválidas y decimales. |
| `formatearFecha(fechaIso: string \| Date): string` | `dd/mm/aaaa` en Argentina. |
| `formatearHora(fechaIso: string \| Date): string` | `HH:mm` en Argentina. |
| `formatearFechaHora(fechaIso: string \| Date): string` | `dd/mm/aaaa HH:mm`. |
| `formatearNumeroComprobante(puntoVenta: number, numero: number): string` | Numeración `0001-00000001`. |
| `formatearNumeroFactura(puntoVenta: number, numero: number): string` | Delega en el formato común. |
| `formatearNumeroRecibo(puntoVenta: number, numero: number): string` | Numeración `R 0001-00000001`. |
| `convertirErrorARespuestaHttp(error: unknown): Response` | Estado HTTP y JSON oficial. |
| `convertirErrorAResultadoAccion(error: unknown): ResultadoAccionFallida` | `{ ok: false, error: { code, message, details? } }`. |
| `asegurarRolAdmin(usuarioActual: UsuarioAutenticado): void` | Permite continuar o lanza `SIN_PERMISO`. |
| `asegurarRecursoExiste<T>(recurso: T \| null \| undefined, nombreRecurso: string): asserts recurso is T` | Asegura existencia o lanza `NO_ENCONTRADO`. |
| `crearBaseDatosPrueba(): Promise<BaseDatosPrueba>` | Base en memoria con migraciones aplicadas y mecanismo de cierre. |

Además, `ErrorApi` tendrá constructor con `estadoHttp`, `codigo`, `mensaje` y `detalles` opcionales. Los formatos de hora y comprobante común cubren también los nombres exigidos por `AGENTS.md`.

## 4. Reglas de negocio y errores controlados

- **Modelo:** nueve tablas con `id`, `fechaCreacion`, claves foráneas y restricciones de unicidad; importes `integer` en centavos. Se conservarán los campos necesarios para bajas lógicas, historial y precios congelados.
- **Formatos:** fechas almacenadas en UTC y presentación en `America/Argentina/Buenos_Aires`. Conversión monetaria verificada con casos que suelen producir errores de redondeo.
- **Catálogo completo:** los 22 códigos oficiales estarán en `src/errores/codigos-error.ts`; sus reglas específicas se implementarán en los tickets correspondientes.

Los controles iniciales serán:

| Código y estado | Archivo responsable |
|---|---|
| `403 SIN_PERMISO` | `src/errores/verificadores-negocio.ts` |
| `404 NO_ENCONTRADO` | `src/errores/verificadores-negocio.ts` |
| `422 VALIDACION`, con detalles `{ campo, mensaje }` desde Zod | `src/errores/manejador-errores.ts` |
| `400 JSON_INVALIDO`, para errores de lectura de JSON | `src/errores/manejador-errores.ts` |
| `500 ERROR_INTERNO`, registrado sin exponer detalles internos | `src/errores/manejador-errores.ts` |

Cualquier `ErrorApi` conservará su estado y código. Se verificarán migraciones sobre una base limpia, restricciones, formatos, permisos y ambas conversiones de errores mediante pruebas separadas.

## 5. Preguntas de defensa cubiertas

- **P1.1:** dónde se definen las nueve tablas.
- **P1.2:** dónde se conecta la aplicación y cómo selecciona SQLite o Turso.
- **P1.3:** cómo agregar tablas o campos mediante migraciones.
- **P1.5:** cómo se almacenan los importes y por qué se usan centavos enteros.
- **P2.5:** dónde se construye la respuesta estándar de error.
- **P5.2:** dónde se formatean importes y fechas.

Las referencias definitivas se completarán en `respuestas-defensa.md` durante la auditoría. Quedo a la espera de tu confirmación para desarrollar.