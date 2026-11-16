# Ticket T02 — Autenticación, Permisos, Layout General, Componentes Base y Módulo Usuarios

- **Responsable:** Integrante 1 (`rama: integrante-1`)
- **Hito:** Hito 1 — Base y Productos
- **Dependencias:** `T01`

---

## 1. Objetivo

Implementar el sistema completo de autenticación y sesión en cookie `httpOnly`, los envoltorios de rutas y Server Actions, el Layout general compartido (panel lateral fijo + barra superior + menú móvil), los componentes reutilizables de estados/maquetación y el módulo completo de **Acceso y Usuarios** (tanto API REST como pantallas `/login`, `/perfil` y `/usuarios`).

---

## 2. Requerimientos y Reglas Incluidas

- **RF-U1 Sesión:** Login con email y contraseña (`POST /api/auth/login`) y cierre de sesión (`POST /api/auth/logout`).
- **RF-U2 Protección:** Toda página y ruta exige sesión válida salvo `/login`. El usuario se consulta contra la base de datos en cada pedido (`GET /api/auth/me` y `obtenerUsuarioActual()`).
- **RF-U4 Gestión de usuarios (Admin):** Listado paginado con búsqueda y filtro de estado (`GET /api/usuarios`), alta con contraseña temporal (`POST /api/usuarios`), edición/baja lógica (`PATCH /api/usuarios/[id]`) impidiendo desactivarse o quitarse el rol a sí mismo (`422 OPERACION_SOBRE_SI_MISMO`).
- **RF-U5 Contraseñas:** Cambio de contraseña propia (`PUT /api/auth/password`) y restablecimiento por administrador (`POST /api/usuarios/[id]/reset-password`).
- **Sección 10.3, 10.5 y 10.6:** Tres barreras de seguridad, envoltorio de rutas/acciones, primitivas de maquetación y estados completos (carga, vacío, error, confirmación de acción irreversible).

---

## 3. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Acceso/login.jpg`](../../docs/pantallas/Acceso/login.jpg) (`/login`)
> - [`docs/pantallas/Usuarios/usuarios.jpg`](../../docs/pantallas/Usuarios/usuarios.jpg) (`/usuarios`)
> - [`docs/pantallas/Usuarios/nuevo-usuario.jpg`](../../docs/pantallas/Usuarios/nuevo-usuario.jpg) (Modal de alta de usuario)
> - [`docs/pantallas/Usuarios/perfil.jpg`](../../docs/pantallas/Usuarios/perfil.jpg) (`/perfil`)
> - [`docs/pantallas/Vendedor/vendedor-productos.jpg`](../../docs/pantallas/Vendedor/vendedor-productos.jpg) (Vista del panel lateral como Vendedor: sin ítem «Usuarios»)
> - [`docs/pantallas/Telefono/movil-menu.jpg`](../../docs/pantallas/Telefono/movil-menu.jpg) (Panel lateral colapsado en pantallas chicas desde `360 px`)

### Detalles obligatorios de Interfaz:
1. **Página `/login` (`Acceso/login.jpg`):**
   - Diseño en dos columnas en escritorio (panel institucional del comercio a la izquierda y formulario de ingreso a la derecha).
   - Campos `Email` y `Contraseña`, botón `Ingresar` y mensaje de error claro si devuelve `401 CREDENCIALES_INVALIDAS`.
2. **Layout del Sistema (`src/app/(sistema)/layout.tsx`):**
   - **Panel lateral izquierdo:** Nombre del comercio, botón destacado `+ Nueva venta` arriba, y los 5 módulos (`Inicio`, `Ventas`, `Productos` con insignia de cantidad de productos bajo stock mínimo, `Clientes`, y `Usuarios` visible solo para rol `admin`). Módulo activo resaltado.
   - **Barra superior:** Iniciales/avatar, nombre del usuario conectado, su rol (`Administrador` / `Vendedor`) con enlace a `/perfil` y botón `Salir`.
   - **Adaptabilidad móvil (`Telefono/movil-menu.jpg`):** En pantallas menores a `768 px`, el panel lateral se colapsa en un menú desplegable (`Sheet` de shadcn/ui).
3. **Pantalla `/usuarios` (`Usuarios/usuarios.jpg` y `Usuarios/nuevo-usuario.jpg`):**
   - Buscador por `Nombre o email`, selector de estado (`Todos`, `Activos`, `Inactivos`) y botón `+ Nuevo usuario`.
   - Tabla con columnas: `Nombre` (indicando `(vos)` en el usuario actual), `Email`, `Rol` (insignia `Administrador` / `Vendedor`), `Estado` (`Activo` / `Inactivo`), `Alta` (`dd/mm/aaaa`) y `Acciones` (`Editar`, `Restablecer`, `Desactivar` / `Reactivar` — ocultando `Desactivar` en la fila del propio usuario conectado).
   - Modal `Nuevo usuario`: campos `Nombre`, `Email`, `Rol` y `Contraseña temporal`.
   - Modal o aviso al `Restablecer`: muestra por única vez la `passwordTemporal` generada.
4. **Pantalla `/perfil` (`Usuarios/perfil.jpg`):**
   - Datos del usuario conectado y formulario para cambiar su contraseña (`Contraseña actual`, `Nueva contraseña` mínimo 8 caracteres y confirmación).

---

## 4. Archivos a Crear / Modificar

- **Utilidades de Sesión y Adaptadores (`src/utilidades/`):**
  - `src/utilidades/sesion.ts`: Hash/verificación de contraseñas, firma/lectura de cookie `httpOnly` con `SESSION_SECRET` y `obtenerUsuarioActual()` consultando la BD.
  - `src/utilidades/envoltorio-ruta.ts`: Envoltorio para Route Handlers que exige sesión (opcionalmente pública en login), parsea JSON y delega errores a `manejador-errores.ts`.
  - `src/utilidades/envoltorio-accion.ts`: Envoltorio para Server Actions.
- **Validaciones (`src/validaciones/`):**
  - `src/validaciones/validacion-autenticacion.ts` y `src/validaciones/validacion-usuarios.ts` (con `.strict()`).
- **Verificadores de Error (`src/errores/verificadores-negocio.ts`):**
  - `asegurarCredencialesValidas`, `asegurarNoEsOperacionSobreSiMismo`, `asegurarEmailNoDuplicado`.
- **Servicios (`src/servicios/`):**
  - `src/servicios/servicio-autenticacion.ts`: `iniciarSesion`, `obtenerPerfilActual`, `cambiarContrasenaPropia`.
  - `src/servicios/servicio-usuarios.ts`: `listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `restablecerContrasenaUsuario`.
- **Rutas API REST (8 endpoints en `src/app/api/`):**
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/password`
  - `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/[id]`, `POST /api/usuarios/[id]/reset-password`
- **Componentes Reutilizables (`src/componentes/`):**
  - `maquetacion/`, `estados/` (`EstadoCarga`, `EstadoVacio`, `EstadoError`, `DialogoConfirmacion`), `formularios/` (`CampoFormulario`, `CampoImporte`, `InsigniaEstado`, `PaginadorListado`, `usar-formulario-accion.ts`) y `navegacion/` (`PanelLateral`, `BarraSuperior`).
- **Páginas (`src/app/`):**
  - `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/(sistema)/layout.tsx`, `src/app/(sistema)/perfil/page.tsx`, `src/app/(sistema)/usuarios/page.tsx`.
- **Testing Separado (`src/pruebas/`):**
  - `src/pruebas/autenticacion-y-usuarios.prueba.ts`: Pruebas de login, rechazo de usuario inactivo, bloqueo `403` a vendedor en rutas de admin, bloqueo `422 OPERACION_SOBRE_SI_MISMO` y cambio de contraseña.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P2.3:** ¿Dónde se verifica que el usuario haya iniciado sesión antes de atender un pedido?
- **P2.4:** ¿Qué pasa si un vendedor llama directamente a una ruta de administrador? Muéstrenlo.
- **P4.2:** ¿Cómo se guardan las contraseñas?
- **P4.3:** ¿Dónde se verifica el rol del usuario? ¿Alcanza con ocultar el botón?
- **P4.4:** ¿Dónde está el secreto que firma la sesión? ¿Por qué no está en el repositorio?
- **P4.5:** Si se desactiva a un usuario que tiene la sesión abierta, ¿qué pasa?
- **P5.1:** ¿Dónde se define el panel lateral que comparten todas las pantallas?
- **P5.3:** ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?
- **P5.5:** ¿Qué muestra un listado mientras carga, cuando está vacío o cuando falla?
