# Plan técnico — T02: autenticación, layout y usuarios

## 1. Resumen del flujo

El personal ingresa con email y contraseña; el servidor valida las credenciales y establece una cookie firmada, `httpOnly` y `SameSite=Lax`.
En cada pedido se comprueban la firma y el vencimiento, y se consulta el usuario en la base para aplicar inmediatamente sus cambios de estado o rol.
Las páginas protegidas comparten panel lateral, barra del usuario y menú móvil; cada persona consulta su perfil, cambia su contraseña y cierra sesión.
El administrador puede buscar y paginar usuarios, crearlos con contraseña temporal, editarlos, desactivarlos, reactivarlos y restablecer sus contraseñas.
API y Server Actions delegan en los mismos servicios, con validaciones compartidas, errores centralizados y pruebas aisladas por fuera del flujo productivo.

## 2. Archivos a crear o modificar

### Base de datos / Utilidades

T01 ya aporta la tabla `usuarios`, el tipo `UsuarioAutenticado`, la conexión libSQL, los formatos y el manejador de errores. Se reutilizarán sin duplicarlos. No se necesitan tablas ni migraciones nuevas, ni se implementará la semilla de T12. La columna real de contraseña es `contrasenaHash` / `contrasena_hash`; la mención a `passwordHash` de la guía de defensa se corregirá al auditar el desarrollo.

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/utilidades/sesion.ts` | Hash y comparación con bcryptjs; firma y verificación de sesión; lectura, escritura y eliminación de cookie; resolución del usuario contra la BD. Módulo exclusivo del servidor. |
| Crear | `src/utilidades/envoltorio-ruta.ts` | Sesión obligatoria por defecto, parámetros de ruta, consulta/cuerpo y conversión centralizada de errores HTTP. |
| Crear | `src/utilidades/envoltorio-accion.ts` | Sesión obligatoria por defecto y contrato de resultado de acciones con `datos`, conforme a AGENTS.md. |
| Reutilizar | `src/base-de-datos/conexion.ts` | Instancia `bd` existente, local o Turso según entorno. |
| Reutilizar | `src/base-de-datos/esquema.ts` | Usuarios, productos y tipos existentes; proyecciones explícitas sin hash. |
| Reutilizar | `src/utilidades/formatos.ts` | Fechas de alta, números y conversión exacta de importes para componentes base. |
| Reutilizar | `src/utilidades/clases.ts` | Composición de clases de las primitivas de interfaz. |

Archivos de soporte fuera de `src/`: modificar `package.json` y `pnpm-lock.yaml` para incorporar bcryptjs y las dependencias efectivamente utilizadas por las primitivas shadcn/ui; modificar `.env.example` para documentar `SESSION_SECRET` obligatorio, sin guardar un valor real. Reutilizar `components.json` y `.gitignore`; sus alias ya apuntan a `src/componentes/interfaz/` y los archivos de entorno privados ya están excluidos.

### Validaciones Zod

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/validaciones/validacion-autenticacion.ts` | Acceso, consulta sin cuerpo, cambio de contraseña y formulario con confirmación. |
| Crear | `src/validaciones/validacion-usuarios.ts` | Alta, edición parcial, identificador, restablecimiento y filtros/paginación. |

### Control de errores y verificadores

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/errores/verificadores-negocio.ts` | Incorporar verificaciones de sesión, credenciales, contraseña actual, email y operación sobre sí mismo. Reutilizar `asegurarRolAdmin` y `asegurarRecursoExiste`. |
| Reutilizar | `src/errores/codigos-error.ts` | Todos los códigos de T02 ya existen entre los 22 códigos oficiales. |
| Reutilizar | `src/errores/error-api.ts` | `ErrorApi(estadoHttp, codigo, mensaje, detalles)`. |
| Reutilizar | `src/errores/manejador-errores.ts` | `convertirErrorARespuestaHttp` y `convertirErrorAResultadoAccion`; ya resuelven ErrorApi, ZodError, JSON inválido y errores inesperados. |

### Flujo normal en servicios

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Crear | `src/servicios/servicio-autenticacion.ts` | `iniciarSesion`, `obtenerPerfilActual`, `cambiarContrasenaPropia`. |
| Crear | `src/servicios/servicio-usuarios.ts` | `listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `restablecerContrasenaUsuario`; tipos públicos de usuarios y paginación. |
| Crear | `src/servicios/servicio-navegacion.ts` | `obtenerResumenNavegacion`: consulta mínima del contador real de productos activos bajo mínimo para el panel lateral. |

El servicio de navegación evita calcular el contador en el layout y evita depender de los futuros servicios de T03/T11. No implementa catálogo, movimientos ni tablero; no modifica existencias y no agrega endpoints al contrato REST.

### Adaptadores API / Páginas / Componentes

Las ocho operaciones REST se distribuyen en siete archivos; `src/app/api/usuarios/route.ts` exportará dos métodos.

| Acción | Ruta exacta | Exportaciones o responsabilidad |
| --- | --- | --- |
| Crear | `src/app/api/auth/login/route.ts` | `POST`, único endpoint público. |
| Crear | `src/app/api/auth/logout/route.ts` | `POST`. |
| Crear | `src/app/api/auth/me/route.ts` | `GET`. |
| Crear | `src/app/api/auth/password/route.ts` | `PUT`. |
| Crear | `src/app/api/usuarios/route.ts` | `GET` y `POST`. |
| Crear | `src/app/api/usuarios/[id]/route.ts` | `PATCH`. |
| Crear | `src/app/api/usuarios/[id]/reset-password/route.ts` | `POST`. |
| Crear | `src/middleware.ts` | Barrera de navegación exigida por el ticket: redirección si falta la cookie; exclusión de API y recursos estáticos. |
| Crear | `src/app/login/page.tsx` | Composición de la pantalla pública. |
| Crear | `src/app/login/acciones.ts` | Acción pública `iniciarSesionAccion`. |
| Crear | `src/app/(sistema)/layout.tsx` | Comprobación de sesión, datos de navegación y estructura común. |
| Mover | `src/app/page.tsx` → `src/app/(sistema)/page.tsx` | Conservar el inicio mínimo de T01 dentro del grupo protegido y evitar dos páginas para `/`. Tablero pendiente de T11. |
| Crear | `src/app/(sistema)/acciones.ts` | Acción protegida `cerrarSesionAccion`. |
| Crear | `src/app/(sistema)/perfil/page.tsx` | Lectura del perfil en servidor y composición del formulario. |
| Crear | `src/app/(sistema)/perfil/acciones.ts` | Acción protegida `cambiarContrasenaPropiaAccion`. |
| Crear | `src/app/(sistema)/usuarios/page.tsx` | Sesión y rol, parámetros de URL y listado inicial desde el servicio. |
| Crear | `src/app/(sistema)/usuarios/acciones.ts` | Acciones protegidas de alta, edición y restablecimiento. La baja/reactivación utiliza la edición. |
| Crear | `src/app/(sistema)/usuarios/loading.tsx` | Estado de carga reutilizable. |
| Crear | `src/app/(sistema)/usuarios/error.tsx` | Estado de error con reintento y mensaje público. |
| Modificar | `src/app/globals.css` | Tema propio y consistente para Tailwind/shadcn/ui. |

Se conservará `src/app/layout.tsx` como layout raíz de documento. Antes de implementar la barrera inicial se verificará la compatibilidad de `src/middleware.ts` con Next instalado; si la versión exige `src/proxy.ts`, se usará esa única ruta equivalente, documentando el ajuste y sin registrar ambas convenciones. La barrera inicial no consulta la BD ni sustituye las comprobaciones por pedido.

Componentes de maquetación a crear, uno por ruta:

- `src/componentes/maquetacion/contenedor-pagina.tsx`: `ContenedorPagina`.
- `src/componentes/maquetacion/encabezado-pagina.tsx`: `EncabezadoPagina`.
- `src/componentes/maquetacion/apilar.tsx`: `Apilar`.
- `src/componentes/maquetacion/alinear.tsx`: `Alinear`.
- `src/componentes/maquetacion/grilla.tsx`: `Grilla`.
- `src/componentes/maquetacion/texto.tsx`: `Texto`.
- `src/componentes/maquetacion/titulo.tsx`: `Titulo`.

Componentes de estados y formularios a crear:

- `src/componentes/estados/estado-carga.tsx`: `EstadoCarga`.
- `src/componentes/estados/estado-vacio.tsx`: `EstadoVacio`.
- `src/componentes/estados/estado-error.tsx`: `EstadoError`.
- `src/componentes/estados/dialogo-confirmacion.tsx`: `DialogoConfirmacion`.
- `src/componentes/formularios/campo-formulario.tsx`: `CampoFormulario`.
- `src/componentes/formularios/campo-importe.tsx`: `CampoImporte`.
- `src/componentes/formularios/insignia-estado.tsx`: `InsigniaEstado`.
- `src/componentes/formularios/paginador-listado.tsx`: `PaginadorListado`.
- `src/componentes/formularios/usar-formulario-accion.ts`: `usarFormularioAccion`.

Componentes de navegación y dominio a crear:

- `src/componentes/navegacion/panel-lateral.tsx`: navegación por módulos, enlace activo y contador recibido del servicio.
- `src/componentes/navegacion/barra-superior.tsx`: iniciales, nombre, rol, acceso al perfil y salida.
- `src/componentes/navegacion/menu-movil.tsx`: panel desplegable que comparte las opciones del panel lateral.
- `src/componentes/dominio/autenticacion/pantalla-acceso.tsx`: panel institucional y formulario adaptable.
- `src/componentes/dominio/autenticacion/formulario-acceso.tsx`: credenciales, envío y errores.
- `src/componentes/dominio/usuarios/perfil-usuario.tsx`: datos públicos y composición del perfil.
- `src/componentes/dominio/usuarios/formulario-cambio-contrasena.tsx`: actual, nueva y confirmación.
- `src/componentes/dominio/usuarios/listado-usuarios.tsx`: listado, estados, acciones y paginación.
- `src/componentes/dominio/usuarios/filtros-usuarios.tsx`: búsqueda y estado sincronizados con URL.
- `src/componentes/dominio/usuarios/formulario-usuario.tsx`: campos y reglas compartidos de alta/edición.
- `src/componentes/dominio/usuarios/dialogo-usuario.tsx`: apertura/cierre de alta o edición.
- `src/componentes/dominio/usuarios/dialogo-restablecer-contrasena.tsx`: confirmación y visualización única de la contraseña temporal.

Primitivas shadcn/ui a incorporar con nombres propios en castellano, bajo el alias ya configurado:

- `src/componentes/interfaz/boton.tsx`.
- `src/componentes/interfaz/entrada.tsx`.
- `src/componentes/interfaz/etiqueta.tsx`.
- `src/componentes/interfaz/selector.tsx`.
- `src/componentes/interfaz/tabla.tsx`.
- `src/componentes/interfaz/tarjeta.tsx`.
- `src/componentes/interfaz/insignia.tsx`.
- `src/componentes/interfaz/dialogo.tsx`.
- `src/componentes/interfaz/dialogo-alerta.tsx`.
- `src/componentes/interfaz/panel-desplegable.tsx` (primitiva Sheet).
- `src/componentes/interfaz/avatar.tsx`.
- `src/componentes/interfaz/alerta.tsx`.
- `src/componentes/interfaz/esqueleto.tsx`.

### Pruebas separadas

| Acción | Ruta exacta | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/pruebas/ayudantes-prueba.ts` | Reutilizar BD en memoria y migraciones de T01; agregar preparación de usuarios por rol con hash real y aislamiento de cookies/conexión en pruebas. |
| Crear | `src/pruebas/autenticacion-y-usuarios.prueba.ts` | Credenciales, hashes, perfil, gestión de usuarios, permisos, cambio y restablecimiento de contraseñas. |
| Crear | `src/pruebas/sesion-y-adaptadores.prueba.ts` | Firma, expiración, flags de cookie, consulta actualizada contra BD y contratos de rutas/acciones. |

La implementación futura quedará verificada con `pnpm test`, `pnpm run verificar:tipos` y `pnpm build`, y con revisión funcional de escritorio y 360 px. Esta planificación solo modifica este `plan.md`.

## 3. Firmas de funciones principales y contratos (en castellano)

### Tipos públicos y convenciones

- Reutilizar `UsuarioAutenticado = Pick<Usuario, "id" | "nombre" | "email" | "rol">` de T01. El rol siempre se obtiene del registro actual de BD, nunca de un campo confiado al navegador.
- Definir `UsuarioPublico = UsuarioAutenticado & { activo: boolean; fechaCreacion: string }` en `servicio-usuarios.ts` para listado, alta y edición. La fecha se transmite en ISO y se muestra con `formatearFecha`.
- Definir `ListadoUsuarios = { data: UsuarioPublico[]; page: number; pageSize: number; total: number }`. El total usa los mismos filtros que la consulta de datos; el orden será estable por nombre e id.
- Definir `ResultadoAccion<Datos> = { ok: true; datos: Datos } | ResultadoAccionFallida` en el envoltorio de acciones. Se conserva `datos`, según AGENTS.md; los errores reutilizan `ErrorPublico` de T01.
- Los campos públicos `email`, `password`, `passwordTemporal`, `data`, `page`, `pageSize`, `code`, `message` y `details`, así como los segmentos `auth` y `reset-password`, se conservan para cumplir la sección 11. Los nombres internos serán castellanos; por ejemplo, se leerá `password` en una variable `contrasena`.
- Todas las funciones de servicio, salvo `iniciarSesion`, reciben primero `usuarioActual: UsuarioAutenticado` y segundo `datosSinValidar: unknown`, incluso las consultas sin cuerpo: estas reciben `{}` y lo validan. Cada función lleva arriba un comentario con RF-U1/U2/U4/U5 o la sección correspondiente.

### Esquemas compartidos

| Esquema | Entrada y resultado esperado |
| --- | --- |
| `esquemaInicioSesion` | `{ email, password }`; email válido, contraseña obligatoria y objeto `.strict()`. No aplicar al acceso una longitud mínima que impida verificar una contraseña existente. |
| `esquemaSinDatos` | Objeto vacío `.strict()` para consultas o acciones sin entrada de negocio. |
| `esquemaCambioContrasena` | `{ actual, nueva }`, actual obligatoria, nueva de al menos 8 caracteres, `.strict()`. |
| `esquemaFormularioCambioContrasena` | Extensión del esquema anterior con `confirmacion`; comprobar igualdad y atribuir el error a ese campo. Compartido entre cliente y acción. La API mantiene solo `actual` y `nueva`. |
| `esquemaCrearUsuario` | `{ nombre, email, rol, password }`, nombre no vacío, email válido, rol `admin` o `vendedor`, temporal de al menos 8 caracteres, `.strict()`. El estado inicial lo decide el servicio. |
| `esquemaEditarUsuario` | Campos opcionales `{ nombre, email, rol, activo }`, al menos uno presente, `.strict()`; rechazar contraseña, hash, fecha e id dentro del cuerpo. |
| `esquemaIdentificadorUsuario` | Entero positivo seguro; convertir el segmento textual de ruta y rechazar valores inválidos. |
| `esquemaActualizarUsuario` | Sobre interno `{ id, cambios }`, `.strict()`, componiendo identificador y esquema de edición. El adaptador mantiene separado el id de ruta del cuerpo. |
| `esquemaRestablecerContrasenaUsuario` | Sobre interno `{ id }`, `.strict()`; la petición pública no tiene cuerpo. |
| `esquemaListadoUsuarios` | `q`, `activo`, `page`, `pageSize`; búsqueda por nombre/email, `activo` admite `true`, `false` o `todos` y por defecto muestra todos; página inicial 1, tamaño 20 y máximo 100. Convertir explícitamente `"false"` a falso. |

Normalizar email con recorte y minúsculas tanto al ingresar como al crear/editar. No recortar ni modificar las contraseñas. Al elegir bcryptjs, evitar truncamiento silencioso: los esquemas de nuevas contraseñas comprobarán además su límite de 72 bytes UTF-8. La confirmación es del formulario; no se agrega al contrato REST de cambio de contraseña.

### Servicios: orden obligatorio de ejecución

| Firma | Pasos en orden y devolución |
| --- | --- |
| `iniciarSesion(datosSinValidar: unknown): Promise<UsuarioAutenticado>` | 1. Parsear `esquemaInicioSesion`. 2. Comprobar credenciales y estado mediante `asegurarCredencialesValidas` después de consultar por email y comparar hash. Este es el control de acceso de la operación pública. 3. Proyectar el usuario autenticado. 4. Devolver exactamente id, nombre, email y rol. No escribe cookies ni devuelve el hash. |
| `obtenerPerfilActual(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<UsuarioAutenticado>` | 1. Validar `{}`. 2. `asegurarUsuarioAutenticado`. 3. Usar el usuario resuelto por pedido contra BD. 4. Devolver la misma proyección que el acceso. Ambos roles. |
| `cambiarContrasenaPropia(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<void>` | 1. Validar actual/nueva. 2. `asegurarUsuarioAutenticado`. 3. Leer el hash del propio usuario, comprobar la actual con `asegurarContrasenaActualCorrecta`, generar hash nuevo y actualizar únicamente su contraseña. 4. Completar sin datos; el adaptador responde 204. |
| `listarUsuarios(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<ListadoUsuarios>` | 1. Validar consulta. 2. `asegurarRolAdmin`. 3. Aplicar búsqueda, estado, orden estable, límite/desplazamiento y conteo en Drizzle. 4. Devolver la envoltura paginada, seleccionando solo columnas públicas. |
| `crearUsuario(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<UsuarioPublico>` | 1. Validar alta. 2. `asegurarRolAdmin`. 3. Comprobar email, generar hash temporal e insertar usuario activo; traducir también la colisión del índice único si hay altas simultáneas. 4. Devolver proyección pública. |
| `actualizarUsuario(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<UsuarioPublico>` | 1. Validar `{ id, cambios }`. 2. `asegurarRolAdmin`. 3. Consultar destino, comprobar existencia, impedir autodesactivación/autodegradación, comprobar email excluyendo el id actual y actualizar solo los campos presentes. 4. Devolver proyección pública actualizada. |
| `restablecerContrasenaUsuario(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<{ passwordTemporal: string }>` | 1. Validar id. 2. `asegurarRolAdmin`. 3. Comprobar destino, generar temporal criptográficamente aleatoria, guardar únicamente su hash. 4. Devolver la temporal solo como resultado de esta operación. |
| `obtenerResumenNavegacion(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown): Promise<{ cantidadProductosBajoMinimo: number }>` | 1. Validar `{}`. 2. `asegurarUsuarioAutenticado`. 3. Contar productos activos cuya existencia sea menor que stock mínimo. 4. Devolver el contador a la navegación; no un número fijo tomado de la captura. |

Las escrituras de T02 afectan una sola tabla por operación. Si durante el desarrollo una operación pasa a modificar más de una tabla, deberá usar `bd.transaction`. Se mantendrá el índice único de email como garantía definitiva ante concurrencia; ninguna consulta previa lo sustituye. La edición de nombre/email propios y el restablecimiento propio como administrador están permitidos: la prohibición sobre sí mismo solo abarca desactivarse o perder el rol admin.

### Sesión y contraseñas: utilidades de servidor

| Firma | Contrato y secuencia |
| --- | --- |
| `generarHashContrasena(contrasena: string): Promise<string>` | Producir hash bcryptjs con sal y costo inicial 12; nunca persistir ni registrar la contraseña original. |
| `verificarContrasena(contrasena: string, contrasenaHash: string): Promise<boolean>` | Comparación mediante bcryptjs. El acceso de email inexistente usará un hash ficticio válido para evitar omitir por completo el trabajo de comparación. |
| `generarContrasenaTemporal(): string` | Usar aleatoriedad criptográfica de Node y longitud suficiente para cumplir las reglas compartidas; no usar `Math.random`. |
| `firmarSesion(usuarioId: number): Promise<string>` | Firmar con HMAC-SHA-256 y `SESSION_SECRET` un contenido mínimo `{ usuarioId, venceEn }`; propuesta de duración: 8 horas. No incluir un rol que luego se use como autorización. |
| `verificarSesion(valorCookie: string): Promise<{ usuarioId: number; venceEn: number } \| null>` | Comprobar formato, firma con comparación de tiempo constante y vencimiento; devolver null ante token adulterado, malformado o vencido. Falta de secreto es un fallo de configuración, nunca un secreto de respaldo. |
| `establecerCookieSesion(usuarioId: number): Promise<void>` | Firmar y guardar cookie `sesion`, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure` en producción y vencimiento coherente con el contenido firmado. |
| `eliminarCookieSesion(): Promise<void>` | Expirar la misma cookie y con el mismo ámbito, desde Route Handler o Server Action. |
| `obtenerUsuarioActual(): Promise<UsuarioAutenticado>` | Leer cookie, verificarla, consultar usuario por id en BD y comprobar que exista y esté activo mediante `asegurarSesionValida`. Devolver datos públicos actuales o lanzar 401. No usar caché persistente entre pedidos. |

Crear/expirar la cookie corresponde a los adaptadores, después del servicio de acceso o de comprobar sesión para salir. Los servicios desconocen HTTP y cookies. El cierre devuelve 204 sin cuerpo. No se promete revocación de otras cookies al cambiar la contraseña, porque el ticket no incorpora una versión de sesión ni una tabla de sesiones.

### Envoltorios, API y acciones

- `envoltorioRuta<Datos>(operacion: OperacionRuta<Datos>, opciones?: OpcionesRuta): ManejadorRuta`: exige sesión por defecto; solo el acceso permite modo público. Resuelve los parámetros asíncronos de Next, lee JSON únicamente cuando la operación declara cuerpo, obtiene consulta/id sin aplicar reglas de negocio y llama a la operación. Esta delega al servicio. Devuelve el estado de éxito configurado o `convertirErrorARespuestaHttp(error)`. API sin sesión siempre responde JSON 401, sin redirección HTML. Las variantes de tipos diferenciarán usuario obligatorio de acceso público.
- `envoltorioAccion<Entrada, Salida>(operacion: OperacionAccion<Entrada, Salida>, opciones?: OpcionesAccion): (entrada: Entrada) => Promise<ResultadoAccion<Salida>>`: resuelve sesión, ejecuta el adaptador y normaliza errores con la función de T01; modo público reservado al acceso. Señales de navegación de Next no se convertirán en `ERROR_INTERNO`; la redirección tras éxito puede realizarse fuera del bloque de captura.
- `usarFormularioAccion<Entrada, Salida>(opciones: OpcionesFormularioAccion<Entrada, Salida>): EstadoFormularioAccion<Entrada, Salida>`: recibe esquema Zod, acción y manejador de éxito; expone enviar, errores por campo/general y estado de envío. Primero valida localmente; luego ejecuta la acción y muestra errores/aviso de resultado. Evita doble envío y borra campos sensibles tras éxito.

Los tipos auxiliares `OperacionRuta`, `OpcionesRuta`, `ManejadorRuta`, `OperacionAccion`, `OpcionesAccion`, `OpcionesFormularioAccion` y `EstadoFormularioAccion` se declaran junto al envoltorio o hook correspondiente, con nombres y propiedades internas en castellano, sin `any`.

| Operación REST | Entrada pública | Éxito y efecto |
| --- | --- | --- |
| `POST /api/auth/login` | `{ email, password }` | 200 `UsuarioAutenticado` y `Set-Cookie`. |
| `POST /api/auth/logout` | Sin cuerpo | 204, expira cookie; exige sesión válida. |
| `GET /api/auth/me` | Sin cuerpo | 200 `UsuarioAutenticado`. |
| `PUT /api/auth/password` | `{ actual, nueva }` | 204 sin cuerpo. |
| `GET /api/usuarios` | `q`, `activo`, `page`, `pageSize` | 200 `ListadoUsuarios`. |
| `POST /api/usuarios` | `{ nombre, email, rol, password }` | 201 `UsuarioPublico`. |
| `PATCH /api/usuarios/[id]` | Uno o varios de `nombre`, `email`, `rol`, `activo` | 200 `UsuarioPublico`. |
| `POST /api/usuarios/[id]/reset-password` | Sin cuerpo | 200 `{ passwordTemporal }`. |

Acciones concretas, todas asíncronas:

- `iniciarSesionAccion(datosSinValidar: unknown): Promise<ResultadoAccion<UsuarioAutenticado>>`: envoltorio público → servicio → cookie; el formulario navega a `/` al completar.
- `cerrarSesionAccion(datosSinValidar: unknown): Promise<ResultadoAccion<null>>`: validar entrada vacía, exigir sesión → eliminar cookie; navegar a `/login` al completar.
- `cambiarContrasenaPropiaAccion(datosSinValidar: unknown): Promise<ResultadoAccion<null>>`: validar esquema de formulario con confirmación → pasar solo actual/nueva al servicio → aviso y limpieza.
- `crearUsuarioAccion(datosSinValidar: unknown): Promise<ResultadoAccion<UsuarioPublico>>`: envoltorio protegido → servicio → revalidar `/usuarios` y cerrar modal.
- `actualizarUsuarioAccion(datosSinValidar: unknown): Promise<ResultadoAccion<UsuarioPublico>>`: envoltorio protegido → servicio con id/cambios → revalidar usuarios y layout si cambian datos propios.
- `restablecerContrasenaUsuarioAccion(datosSinValidar: unknown): Promise<ResultadoAccion<{ passwordTemporal: string }>>`: envoltorio protegido → servicio → mostrar temporal en diálogo y borrarla al cerrar.

Las páginas de lectura son Server Components y llaman a servicios con el usuario autenticado. Los filtros viven en la URL; la búsqueda en vivo consume `GET /api/usuarios`, conserva esos parámetros y descarta respuestas obsoletas. Las mutaciones de formularios usan acciones y los endpoints REST siguen disponibles con los mismos servicios y reglas. Se evita el cacheo compartido de respuestas de sesión/usuarios y de la contraseña temporal.

### Contratos funcionales de interfaz, contrastados con las seis imágenes

| Referencia revisada | Implementación prevista |
| --- | --- |
| `docs/pantallas/Acceso/login.jpg` | Dos columnas en escritorio, identidad del comercio a la izquierda y acceso a la derecha; una columna usable a 360 px. Email, contraseña, Ingresar y error general uniforme ante credenciales inválidas. Enter envía el formulario. |
| `docs/pantallas/Usuarios/usuarios.jpg` | Encabezado, botón Nuevo usuario, búsqueda Nombre o email, selector Todos/Activos/Inactivos, columnas Nombre/Email/Rol/Estado/Alta/Acciones, `(vos)` y paginador. Editar, Restablecer, Desactivar/Reactivar; sin desactivación propia. Fechas centralizadas. |
| `docs/pantallas/Usuarios/nuevo-usuario.jpg` | Diálogo con nombre, email, rol y contraseña temporal de mínimo 8 caracteres; ayuda sobre comunicación de la clave, Cancelar y Guardar. Edición reutiliza formulario sin contraseña y bloquea la pérdida de rol propio en la interfaz. |
| `docs/pantallas/Usuarios/perfil.jpg` | Tarjeta de nombre/email/rol y formulario de actual, nueva y repetición; validación junto a cada campo, estado de envío y aviso de éxito. |
| `docs/pantallas/Vendedor/vendedor-productos.jpg` | Reutilizar únicamente la referencia de navegación del vendedor: sin Usuarios y con barra de perfil/salida. No construir catálogo ni pestañas de productos en T02. |
| `docs/pantallas/Telefono/movil-menu.jpg` | Sheet por debajo de 768 px, con identidad, Nueva venta, enlaces por rol, indicador bajo mínimo y enlace activo; restauración del foco y cierre al navegar. |

`PanelLateral` y `MenuMovil` reciben el usuario y el contador; `BarraSuperior` recibe el usuario y dispara la acción de salida. Las primitivas de maquetación reciben contenido y variantes de disposición, sin reglas de negocio. `EstadoError` recibe un mensaje público y una acción de reintento; `DialogoConfirmacion` recibe título, explicación, estado pendiente y acción de confirmar. `PaginadorListado` recibe página, tamaño, total y cambios de URL. `CampoImporte` entrega centavos enteros usando `pesosACentavos`, aunque todavía no haya formularios monetarios en este módulo.

El panel contendrá Inicio, Ventas, Productos, Clientes y Usuarios solo para admin, el botón Nueva venta y la leyenda de comprobantes sin validez fiscal. Los enlaces de módulos futuros se preparan sin desarrollar sus pantallas. Las páginas se componen exclusivamente con primitivas y componentes del dominio; el HTML semántico queda encapsulado en componentes. Se usarán etiquetas accesibles, foco inicial en diálogos, Tab/Shift+Tab, Enter y Escape. F2/F4/F8/F9 y flechas de selección de productos pertenecen a Nueva venta/T09; las referencias de T02 no agregan esos atajos a usuarios.

## 4. Reglas de negocio y errores controlados

Los verificadores siguientes viven en `src/errores/verificadores-negocio.ts`. Los servicios los llaman después del parseo de entrada y antes de efectuar la operación restringida. La construcción del JSON HTTP queda exclusivamente en el manejador de T01.

| HTTP / código de sección 11.8 | Función y firma prevista | Dónde se aplica |
| --- | --- | --- |
| 401 `NO_AUTENTICADO` | `asegurarSesionValida(usuario: Usuario \| null \| undefined): asserts usuario is Usuario` | `obtenerUsuarioActual` entrega null ante cookie ausente/inválida/vencida; el verificador rechaza también usuario inexistente o inactivo. |
| 401 `NO_AUTENTICADO` | `asegurarUsuarioAutenticado(usuarioActual: UsuarioAutenticado \| null \| undefined): asserts usuarioActual is UsuarioAutenticado` | Paso de permisos en servicios habilitados para ambos roles, luego de resolución real de sesión por el adaptador. No sustituye la consulta de BD. |
| 401 `CREDENCIALES_INVALIDAS` | `asegurarCredencialesValidas(usuario: Usuario \| undefined, contrasenaCoincide: boolean): asserts usuario is Usuario` | `iniciarSesion`; mismo mensaje para email desconocido, contraseña incorrecta o usuario inactivo. |
| 403 `SIN_PERMISO` | `asegurarRolAdmin(usuarioActual: UsuarioAutenticado): void` (existente) | Todos los servicios de gestión de usuarios y acceso directo a la página administrativa. Ocultar Usuarios en el menú es solo presentación. |
| 404 `NO_ENCONTRADO` | `asegurarRecursoExiste<T>(recurso: T \| null \| undefined, nombreRecurso: string): asserts recurso is T` (existente) | Destino de editar/restablecer inexistente; comprobarlo después del permiso de administrador. Usuario inexistente en sesión/acceso produce 401, no 404. |
| 409 `EMAIL_DUPLICADO` | `asegurarEmailNoDuplicado(emailEnUso: boolean): void` | Alta y edición, incluyendo registros inactivos; edición excluye el propio id del destino. |
| 409 `EMAIL_DUPLICADO` | `traducirErrorEscrituraUsuario(error: unknown): never` | Identificar exclusivamente la restricción única del email de usuarios en errores SQLite/libSQL y delegar a `asegurarEmailNoDuplicado(true)`; relanzar cualquier otro error. Cubre carreras que superen la consulta previa. |
| 422 `OPERACION_SOBRE_SI_MISMO` | `asegurarNoEsOperacionSobreSiMismo(usuarioActual: UsuarioAutenticado, usuarioDestinoId: number, cambios: { activo?: boolean; rol?: UsuarioAutenticado["rol"] }): void` | `actualizarUsuario`, si destino coincide y solicita `activo: false` o rol distinto de admin. No bloquea editar nombre/email propios. |
| 422 `CONTRASENA_ACTUAL_INCORRECTA` | `asegurarContrasenaActualCorrecta(contrasenaCoincide: boolean): void` | Cambio propio antes de guardar el nuevo hash. |

Los códigos técnicos no necesitan nuevos verificadores de negocio:

| HTTP / código | Origen y tratamiento |
| --- | --- |
| 400 `JSON_INVALIDO` | Lectura del JSON en envoltorio de ruta; `SyntaxError` normalizado por el manejador existente. No leer cuerpo en logout ni reset sin cuerpo. |
| 422 `VALIDACION` | `.parse()` de Zod: email/rol/id/paginación inválidos, contraseña nueva débil, confirmación distinta, edición vacía o propiedades extra. `details` con `{ campo, mensaje }`. No inventar códigos adicionales. |
| 500 `ERROR_INTERNO` | Secreto ausente, fallo inesperado de BD o infraestructura: manejador registra diagnóstico seguro en servidor y devuelve mensaje genérico. No registrar cuerpos de acceso, hashes, cookies ni contraseñas temporales. |

Reglas de seguridad y persistencia que deberán verificarse:

1. Tres barreras: navegación inicial; sesión verificada en cada página/operación; permiso en cada servicio. El layout no alcanza por sí solo: las páginas consultan sesión al atenderse y las acciones/rutas siempre pasan por su envoltorio.
2. Sesión firmada, con vencimiento, cookie httpOnly/Lax y Secure en producción; `SESSION_SECRET` solo del entorno. Un rol antiguo en cookie nunca autoriza operaciones.
3. Bajas exclusivamente lógicas (`activo: false`), con reactivación posible; no eliminar usuarios ni cambiar sus referencias históricas.
4. Contraseñas almacenadas únicamente como hash con sal. Respuestas y consultas públicas seleccionan columnas permitidas; no usar el registro completo como respuesta.
5. Contraseña temporal del restablecimiento disponible solo en esa respuesta/diálogo, sin almacenamiento en URL, localStorage o logs y sin endpoint posterior para recuperarla. No agregar un flujo obligatorio de cambio que el ticket no exige.
6. Confirmación visual antes de desactivar o restablecer y avisos tras completar cada mutación. Los controles del servidor siguen funcionando aunque se omita la interfaz.

Cobertura prevista en Vitest, usando BD en memoria y sin tocar `local.db`:

- Acceso válido con usuario activo; mismo 401/código/mensaje ante email inexistente, clave incorrecta e inactividad; ninguna respuesta incluye hash.
- Cookie con flags y vencimiento; ausencia, manipulación, formato inválido o expiración → 401. Logout autenticado → 204 y cookie expirada; me sin sesión → JSON 401.
- Reutilizar la misma cookie después de desactivar al usuario → 401; después de cambiar su rol → nuevo rol en me y 403 en gestión. Repetir mediante rutas y acciones, no solo probar el verificador aislado.
- Vendedor con entrada válida en listar/crear/editar/restablecer → 403; ambas cuentas pueden consultar su perfil y cambiar su contraseña.
- Alta con hash verificable; email duplicado incluso inactivo; edición del mismo email propio permitida; colisión del índice único traducida sin encubrir otros fallos.
- Autodesactivación y autodegradación → 422, sin modificación parcial; edición de datos propios permitida; baja/reactivación de otro usuario y 404 en destino inexistente.
- Búsqueda por nombre/email, filtro falso explícito, filtro todos y paginación con total correcto; rechazo de tamaños fuera de rango e identificadores inválidos.
- Cambio con contraseña actual incorrecta → 422 y hash intacto; cambio válido → 204, contraseña anterior deja de servir y nueva sirve. Confirmación distinta falla también en la acción.
- Restablecimiento devuelve una temporal válida una vez, cambia el hash, invalida la contraseña anterior y no agrega la temporal a listado/me/perfil.
- JSON malformado → 400; campos extra en POST/PATCH → 422 con details; errores de infraestructura → 500 sin detalles internos; acciones → contrato `ok/datos/error`.
- Contador de navegación: solo activos con existencia estrictamente menor que mínimo; cero cuando no hay coincidencias.

Revisión funcional futura: escritorio y 360 px, login a dos/una columnas, menú móvil desde el corte de 768 px, navegación por rol, altas/edición/confirmaciones, temporal borrada al cerrar, errores por campo, paginación en URL, carga/vacío/error/reintento y uso mediante teclado. No se agregarán pruebas que solo repliquen JSX; se priorizan contratos y reglas de seguridad.

## 5. Preguntas de defensa cubiertas

Se leyó `respuestas-defensa.md`. Al completar y auditar T02, estas nueve preguntas tendrán una demostración concreta; en ese momento se actualizarán sus referencias con líneas reales, sin declarar ahora código inexistente como implementado.

| Pregunta | Respuesta y ubicación que quedarán demostrables |
| --- | --- |
| **P2.3 — ¿Dónde se verifica que el usuario haya iniciado sesión antes de atender un pedido?** | Mostrar barrera inicial en `src/middleware.ts` (o equivalente compatible), `obtenerUsuarioActual` en `src/utilidades/sesion.ts`, envoltorios, layout y comprobación por página. Sin cookie o con firma inválida, una ruta responde 401. |
| **P2.4 — ¿Qué pasa si un vendedor llama directamente a una ruta de administrador? Muéstrenlo.** | Mostrar `asegurarRolAdmin` desde `listarUsuarios`/`crearUsuario` y ejecutar una petición de vendedor a `/api/usuarios`: 403 `SIN_PERMISO`. La demostración con productos/anulación se completa en sus tickets. |
| **P4.2 — ¿Cómo se guardan las contraseñas?** | Mostrar `generarHashContrasena`, su uso en servicios y la columna real `usuarios.contrasenaHash`; verificar hash con bcryptjs y proyecciones públicas sin ese campo. |
| **P4.3 — ¿Dónde se verifica el rol del usuario? ¿Alcanza con ocultar el botón?** | Mostrar verificador en servicios administrativos y menú por rol; demostrar que una llamada directa igualmente recibe 403. |
| **P4.4 — ¿Dónde está el secreto que firma la sesión? ¿Por qué no está en el repositorio?** | Mostrar lectura de `process.env.SESSION_SECRET` en sesión, plantilla sin secreto real y exclusión de `.env` en `.gitignore`. Explicar que conocer el secreto permite falsificar sesiones. |
| **P4.5 — Si se desactiva a un usuario que tiene la sesión abierta, ¿qué pasa?** | Mostrar consulta a `usuarios` por cada pedido y prueba con la misma cookie antes/después: al siguiente pedido obtiene 401. Cambio de rol aplica de igual modo. |
| **P5.1 — ¿Dónde se define el panel lateral que comparten todas las pantallas?** | Mostrar `src/componentes/navegacion/panel-lateral.tsx`, su uso en `src/app/(sistema)/layout.tsx` y el mismo contenido dentro del menú móvil; login fuera del grupo. |
| **P5.3 — ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?** | Mostrar esquemas de `src/validaciones/`, su importación por formulario/hook y `.parse()` en servicio. Para contraseña, explicar extensión con confirmación y contrato REST actual/nueva. |
| **P5.5 — ¿Qué muestra un listado mientras carga, cuando está vacío o cuando falla?** | Mostrar `EstadoCarga`, `EstadoVacio`, `EstadoError`, su integración en usuarios y el reintento; agregar confirmaciones y avisos de resultado del flujo. |

No se modificará `respuestas-defensa.md` durante esta planificación; su actualización con evidencia corresponde al cierre del desarrollo y auditoría del ticket.
