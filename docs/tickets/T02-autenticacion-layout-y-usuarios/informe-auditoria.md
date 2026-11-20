# Informe de Auditoría y Guía para el Desarrollador — T02

## 1. Resumen para el Desarrollador

En este ticket se construyó el sistema completo de **autenticación, autorización por roles, navegación compartida, primitivas base de interfaz y módulo de gestión de usuarios**:

1. **Cómo viajan los datos al iniciar sesión (`/login` o `POST /api/auth/login`):**
   - El formulario (`FormularioAcceso`) valida en el cliente con `esquemaInicioSesion` mediante `usarFormularioAccion` y llama a la Server Action `iniciarSesionAccion` (o un cliente REST llama a `POST /api/auth/login`).
   - La acción/ruta delega en `iniciarSesion()` (`src/servicios/servicio-autenticacion.ts`), que normaliza el email, consulta `usuarios` en la base de datos y compara el hash `bcryptjs` (usando un hash ficticio de costo 12 si el email no existe para evitar diferencias de tiempo).
   - Si el usuario existe, está `activo` y la contraseña coincide, el adaptador (`iniciarSesionAccion` o `POST /api/auth/login`) llama a `establecerCookieSesion()`, que firma `{ usuarioId, venceEn }` con `HMAC-SHA-256` (`SESSION_SECRET`) y guarda la cookie `sesion` (`httpOnly`, `SameSite=Lax`, `maxAge: 8 h`, `secure` en producción).

2. **Cómo se protege cada pedido (tres barreras independientes):**
   - **Barrera 1 (Navegación):** `src/proxy.ts` (convención de Next.js 16 que reemplaza a `middleware.ts`) redirige a `/login` las peticiones de páginas sin cookie `sesion`.
   - **Barrera 2 (Sesión contra BD):** `obtenerUsuarioActual()` (`src/utilidades/sesion.ts`) —invocado en `envoltorioRuta`, `envoltorioAccion`, `DisposicionSistema` y cada página protegida— verifica la firma en tiempo constante, el vencimiento y **consulta `usuarios` en SQLite/Turso** en cada request. Si el usuario fue desactivado o cambió de rol, aplica en el acto.
   - **Barrera 3 (Permiso en servicios):** Los servicios administrativos (`listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `restablecerContrasenaUsuario`) ejecutan `asegurarRolAdmin(usuarioActual)` antes de operar (`403 SIN_PERMISO`).

3. **Navegación compartida y gestión de usuarios:**
   - El grupo `src/app/(sistema)/layout.tsx` comparte `PanelLateral` (escritorio), `BarraSuperior` (iniciales, rol, enlace a `/perfil` y botón `Salir`) y `MenuMovil` (`PanelDesplegable` debajo de `768 px`), mostrando el contador real de productos bajo stock mínimo desde `obtenerResumenNavegacion()`.
   - `/usuarios` combina renderizado inicial en servidor con búsqueda en vivo por URL (`GET /api/usuarios`), paginación, modales de alta/edición (`DialogoUsuario`), confirmación de baja/reactivación (`DialogoConfirmacion`) y restablecimiento con contraseña temporal mostrada por única vez (`DialogoRestablecerContrasena`).

---

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| `.env.example` | Documentación de variables de entorno | `SESSION_SECRET=` |
| `package.json` / `pnpm-lock.yaml` | Dependencias de hash y primitivas Radix | `bcryptjs`, `@radix-ui/react-*` |
| `src/proxy.ts` | Barrera inicial de navegación en Next.js 16 | `proxy()`, `config.matcher` |
| `src/utilidades/sesion.ts` | Hash `bcryptjs`, firma HMAC-SHA-256, cookie `httpOnly` y sesión contra BD | `generarHashContrasena()`, `firmarSesion()`, `verificarSesion()`, `obtenerUsuarioActual()` |
| `src/utilidades/envoltorio-ruta.ts` | Adaptador de Route Handlers con sesión obligatoria y errores centralizados | `envoltorioRuta()` |
| `src/utilidades/envoltorio-accion.ts` | Adaptador de Server Actions con contrato `{ ok, datos } \| { ok: false, error }` | `envoltorioAccion()` |
| `src/validaciones/validacion-autenticacion.ts` | Esquemas Zod compartidos de login y cambio de contraseña | `esquemaInicioSesion`, `esquemaCambioContrasena`, `esquemaFormularioCambioContrasena` |
| `src/validaciones/validacion-usuarios.ts` | Esquemas Zod estrictos de alta, edición, id, reset y listado paginado | `esquemaCrearUsuario`, `esquemaEditarUsuario`, `esquemaActualizarUsuario`, `esquemaListadoUsuarios` |
| `src/errores/verificadores-negocio.ts` | Verificadores reutilizables de sesión, credenciales, email único y autoprotección | `asegurarSesionValida()`, `asegurarCredencialesValidas()`, `asegurarNoEsOperacionSobreSiMismo()`, `traducirErrorEscrituraUsuario()` |
| `src/servicios/servicio-autenticacion.ts` | Lógica de acceso, perfil actual y cambio de contraseña propia | `iniciarSesion()`, `obtenerPerfilActual()`, `cambiarContrasenaPropia()` |
| `src/servicios/servicio-usuarios.ts` | ABM y listado paginado de usuarios con proyección pública sin hash | `listarUsuarios()`, `crearUsuario()`, `actualizarUsuario()`, `restablecerContrasenaUsuario()` |
| `src/servicios/servicio-navegacion.ts` | Contador real de productos activos bajo stock mínimo para el menú | `obtenerResumenNavegacion()` |
| `src/app/api/auth/login/route.ts` | Endpoint público `POST /api/auth/login` | `POST` |
| `src/app/api/auth/logout/route.ts` | Endpoint `POST /api/auth/logout` | `POST` |
| `src/app/api/auth/me/route.ts` | Endpoint `GET /api/auth/me` | `GET` |
| `src/app/api/auth/password/route.ts` | Endpoint `PUT /api/auth/password` | `PUT` |
| `src/app/api/usuarios/route.ts` | Endpoints `GET /api/usuarios` y `POST /api/usuarios` | `GET`, `POST` |
| `src/app/api/usuarios/[id]/route.ts` | Endpoint `PATCH /api/usuarios/[id]` | `PATCH` |
| `src/app/api/usuarios/[id]/reset-password/route.ts` | Endpoint `POST /api/usuarios/[id]/reset-password` | `POST` |
| `src/app/login/page.tsx` y `acciones.ts` | Pantalla pública de acceso y Server Action | `PaginaAcceso`, `iniciarSesionAccion` |
| `src/app/(sistema)/layout.tsx` y `acciones.ts` | Layout protegido compartido y cierre de sesión | `DisposicionSistema`, `cerrarSesionAccion` |
| `src/app/(sistema)/page.tsx` | Ruta `/` movida dentro del grupo protegido (tablero pendiente en T11) | `PaginaInicio` |
| `src/app/(sistema)/perfil/page.tsx` y `acciones.ts` | Perfil del usuario conectado y cambio de contraseña | `PaginaPerfil`, `cambiarContrasenaPropiaAccion` |
| `src/app/(sistema)/usuarios/page.tsx`, `acciones.ts`, `loading.tsx`, `error.tsx` | Gestión de usuarios con lectura en servidor, estados y Server Actions | `PaginaUsuarios`, `crearUsuarioAccion`, `actualizarUsuarioAccion`, `restablecerContrasenaUsuarioAccion` |
| `src/app/globals.css` | Tema de diseño propio para Tailwind CSS v4 y shadcn/ui | Variables `:root` y `.dark` |
| `src/componentes/interfaz/*` (13 archivos) | Primitivas shadcn/ui adaptadas al castellano | `Boton`, `Entrada`, `Tabla`, `Dialogo`, `PanelDesplegable`, `Selector`, etc. |
| `src/componentes/maquetacion/*` (7 archivos) | Primitivas de disposición sin HTML suelto en páginas | `ContenedorPagina`, `EncabezadoPagina`, `Apilar`, `Alinear`, `Grilla`, `Texto`, `Titulo` |
| `src/componentes/estados/*` (4 archivos) | Estados reutilizables de carga, vacío, error y confirmación | `EstadoCarga`, `EstadoVacio`, `EstadoError`, `DialogoConfirmacion` |
| `src/componentes/formularios/*` (5 archivos) | Primitivas de formularios, insignias y paginación | `CampoFormulario`, `CampoImporte`, `InsigniaEstado`, `PaginadorListado`, `usarFormularioAccion` |
| `src/componentes/navegacion/*` (3 archivos) | Navegación lateral, barra superior y menú móvil | `PanelLateral`, `BarraSuperior`, `MenuMovil` |
| `src/componentes/dominio/autenticacion/*` (2 archivos) | UI adaptable del ingreso al sistema | `PantallaAcceso`, `FormularioAcceso` |
| `src/componentes/dominio/usuarios/*` (7 archivos) | UI de perfil, listado, filtros y modales de usuarios | `PerfilUsuario`, `ListadoUsuarios`, `FiltrosUsuarios`, `DialogoUsuario`, `DialogoRestablecerContrasena` |
| `src/pruebas/ayudantes-prueba.ts` | Base SQLite en memoria, creación de usuarios con hash real y almacén de cookies | `crearUsuarioPrueba()`, `crearAlmacenCookiesPrueba()` |
| `src/pruebas/autenticacion-y-usuarios.prueba.ts` | Pruebas de validaciones, verificadores, servicios y navegación | 12 tests de contrato y servicios |
| `src/pruebas/sesion-y-adaptadores.prueba.ts` | Pruebas de firma, expiración, cookies, revocación inmediata en BD, API y Actions | 5 tests de integración de adaptadores |

---

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas y compilación (ejecutados tras las correcciones finales):**
  - `pnpm test`: **3 archivos, 82 tests pasando** (`65` de `base-errores-formatos.prueba.ts`, `12` de `autenticacion-y-usuarios.prueba.ts` y `5` de `sesion-y-adaptadores.prueba.ts`).
  - `pnpm run verificar:tipos`: **`next typegen && tsc --noEmit` sin errores**.
  - `pnpm run build`: **`next build --webpack` compiló todas las rutas (`/`, `/login`, `/perfil`, `/usuarios`, las 7 rutas `/api/*` y `Proxy`) sin errores**.
- **Cumplimiento de `AGENTS.md`:**
  - Nombres en castellano en archivos, tipos, funciones y variables internas (conservando únicamente los nombres de campos públicos exigidos por el contrato REST de la Sección 11, como `email`, `password`, `passwordTemporal`, `data`, `page`, `pageSize`).
  - Flujo normal limpio en `src/servicios/`, separado de `src/errores/`, `src/validaciones/` y `src/pruebas/`.
  - Ningún `route.ts`, Server Action o página contiene lógica de negocio, armado manual de respuestas de error ni formateos manuales de fechas/importes (`ListadoUsuarios` usa `formatearFecha` de `src/utilidades/formatos.ts`).
- **Errores detectados y corregidos durante la auditoría (para pregunta de defensa P6.4):**
  1. **Orden de autenticación antes de leer el cuerpo JSON (`src/utilidades/envoltorio-ruta.ts`, líneas 76–79):** En `envoltorioRuta`, `await peticion.json()` (cuando `leeCuerpo` era `true`) se ejecutaba **antes** de `await obtenerUsuarioActual()`. Eso provocaba que una petición **no autenticada** con JSON vacío o malformado a un endpoint protegido (como `POST /api/usuarios`) devolviera `400 JSON_INVALIDO` en lugar de `401 NO_AUTENTICADO`. Se invirtió el orden para exigir sesión primero y se agregó un test de regresión en `src/pruebas/sesion-y-adaptadores.prueba.ts`.
  2. **Diálogo de confirmación bloqueado ante error (`src/componentes/dominio/usuarios/listado-usuarios.tsx`, líneas 177–181):** En `confirmarCambioEstado()`, si `actualizarUsuarioAccion` fallaba (`!resultado.ok`), se seteaba `errorAccion` en la página y se hacía `return` sin cerrar `DialogoConfirmacion` (`setUsuarioParaCambiarEstado(null)`), dejando el modal abierto tapando el mensaje de error detrás del fondo oscuro. Se agregó el cierre del diálogo también en la rama de error.
  3. **Aserción de tipos `as never` en edición (`src/componentes/formularios/usar-formulario-accion.ts` y `src/componentes/dominio/usuarios/dialogo-usuario.tsx`):** Se amplió el genérico de `usarFormularioAccion` con `Validado = Entrada` (`ZodType<Validado, Entrada>`) para compatibilizar el `.transform(...)` de `esquemaEditarUsuario` hacia `{ id, cambios }` sin recurrir al cast `as never`.

---

## 4. Guía Rápida para Defender este Ticket en el Examen

1. **«¿Cómo funciona la triple barrera de seguridad y qué pasa si desactivo a un usuario conectado?»**
   - Mostrar [proxy.ts](file:///c:/Proyectos/Parcial-2-PR4/src/proxy.ts#L6-L19) (redirección sin cookie en navegación), [envoltorio-ruta.ts](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/envoltorio-ruta.ts#L76-L80) (siempre verifica sesión antes de leer el cuerpo), [sesion.ts](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/sesion.ts#L131-L165) (`obtenerUsuarioActual()` consultando `usuarios` en la BD en cada pedido) y [verificadores-negocio.ts](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L82-L86) (`asegurarRolAdmin()`). Apoyarse en el test de [sesion-y-adaptadores.prueba.ts](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/sesion-y-adaptadores.prueba.ts#L167-L204).
2. **«¿Cómo se almacenan las contraseñas y por qué nunca vuelven al navegador?»**
   - Mostrar [esquema.ts](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts#L28) (columna real `contrasenaHash` / `contrasena_hash`), `generarHashContrasena()` en [sesion.ts](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/sesion.ts#L36-L38) (costo 12 en `bcryptjs`) y `columnasPublicasUsuario` / `proyectarUsuarioAutenticado` en [servicio-usuarios.ts](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-usuarios.ts#L31-L38) y [servicio-autenticacion.ts](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-autenticacion.ts#L21-L33).
3. **«¿Cómo comparten reglas cliente y servidor y cómo se muestran carga, vacío y error?»**
   - Mostrar [validacion-autenticacion.ts](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-autenticacion.ts) y [validacion-usuarios.ts](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-usuarios.ts) consumidos por `usarFormularioAccion` ([usar-formulario-accion.ts](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/formularios/usar-formulario-accion.ts#L57-L137)) en el navegador y por `.parse()` en los servicios, junto a `EstadoCarga`, `EstadoVacio` y `EstadoError` integrados en [listado-usuarios.tsx](file:///c:/Proyectos/Parcial-2-PR4/src/componentes/dominio/usuarios/listado-usuarios.tsx#L244-L275).
