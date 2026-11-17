import type { Usuario, UsuarioAutenticado } from "@/base-de-datos/esquema";
import { CODIGOS_ERROR } from "./codigos-error";
import { ErrorApi } from "./error-api";

// Implementa RF-U2: cada pedido exige un usuario existente y activo en la base de datos.
export function asegurarSesionValida(usuario: Usuario | null | undefined): asserts usuario is Usuario {
  if (!usuario?.activo) {
    throw new ErrorApi(401, CODIGOS_ERROR.NO_AUTENTICADO, "Iniciá sesión para continuar.");
  }
}

// Implementa RF-U2: valida que el adaptador haya resuelto un usuario autenticado para operar.
export function asegurarUsuarioAutenticado(
  usuarioActual: UsuarioAutenticado | null | undefined,
): asserts usuarioActual is UsuarioAutenticado {
  if (!usuarioActual) {
    throw new ErrorApi(401, CODIGOS_ERROR.NO_AUTENTICADO, "Iniciá sesión para continuar.");
  }
}

// Implementa RF-U1: no revela si existe el email ni si la cuenta está inactiva.
export function asegurarCredencialesValidas(
  usuario: Usuario | undefined,
  coincide: boolean,
): asserts usuario is Usuario {
  if (!usuario?.activo || !coincide) {
    throw new ErrorApi(401, CODIGOS_ERROR.CREDENCIALES_INVALIDAS, "Email o contraseña incorrectos.");
  }
}

// Implementa RF-U4: el email es único incluso en usuarios inactivos.
export function asegurarEmailNoDuplicado(enUso: boolean): void {
  if (enUso) {
    throw new ErrorApi(409, CODIGOS_ERROR.EMAIL_DUPLICADO, "El email ya está registrado.");
  }
}

// Implementa RF-U4: traduce la colisión del índice único de email en escrituras concurrentes.
export function traducirErrorEscrituraUsuario(error: unknown): never {
  const mensajes: string[] = [];
  let actual: unknown = error;
  for (let profundidad = 0; profundidad < 4 && actual && typeof actual === "object"; profundidad += 1) {
    if ("message" in actual && typeof actual.message === "string") {
      mensajes.push(actual.message);
    }
    actual = "cause" in actual ? actual.cause : null;
  }
  const esEmailDuplicado = mensajes.some(
    (mensaje) =>
      mensaje.includes("UNIQUE constraint failed: usuarios.email") ||
      mensaje.includes("usuarios_email_unique"),
  );
  if (esEmailDuplicado) {
    asegurarEmailNoDuplicado(true);
  }
  throw error;
}

// Implementa RF-U4: impide perder el acceso administrativo propio.
export function asegurarNoEsOperacionSobreSiMismo(
  usuario: UsuarioAutenticado,
  id: number,
  cambios: { activo?: boolean; rol?: UsuarioAutenticado["rol"] },
): void {
  if (usuario.id === id && (cambios.activo === false || (cambios.rol !== undefined && cambios.rol !== "admin"))) {
    throw new ErrorApi(
      422,
      CODIGOS_ERROR.OPERACION_SOBRE_SI_MISMO,
      "No podés desactivarte ni quitarte el rol administrador.",
    );
  }
}

// Implementa RF-U5: comprueba la contraseña actual antes de reemplazarla.
export function asegurarContrasenaActualCorrecta(coincide: boolean): void {
  if (!coincide) {
    throw new ErrorApi(422, CODIGOS_ERROR.CONTRASENA_ACTUAL_INCORRECTA, "La contraseña actual es incorrecta.");
  }
}

// Implementa la sección 11.1: las operaciones de administrador exigen rol admin.
export function asegurarRolAdmin(usuarioActual: UsuarioAutenticado): void {
  if (usuarioActual.rol !== "admin") {
    throw new ErrorApi(403, CODIGOS_ERROR.SIN_PERMISO, "No tenés permiso para realizar esta operación.");
  }
}

// Implementa la sección 11.8: un recurso inexistente produce NO_ENCONTRADO.
export function asegurarRecursoExiste<T>(
  recurso: T | null | undefined,
  nombreRecurso: string,
): asserts recurso is T {
  if (recurso === null || recurso === undefined) {
    throw new ErrorApi(404, CODIGOS_ERROR.NO_ENCONTRADO, `No se encontró ${nombreRecurso}.`);
  }
}

// Implementa RF-P7: el nombre de categoría es único, incluso si está inactiva.
export function asegurarNombreCategoriaUnico(enUso: boolean): void {
  if (enUso) throw new ErrorApi(409, CODIGOS_ERROR.NOMBRE_DUPLICADO, "El nombre de categoría ya existe.");
}

// Implementa RF-P7: una categoría con productos activos no se puede desactivar.
export function asegurarCategoriaSinProductosActivos(tieneProductosActivos: boolean): void {
  if (tieneProductosActivos) throw new ErrorApi(409, CODIGOS_ERROR.CATEGORIA_EN_USO, "La categoría tiene productos activos.");
}

// Implementa RF-P2: el código de producto es único, incluso si está inactivo.
export function asegurarCodigoProductoUnico(enUso: boolean): void {
  if (enUso) throw new ErrorApi(409, CODIGOS_ERROR.CODIGO_DUPLICADO, "El código de producto ya existe.");
}

// Implementa RF-P1: solo admin puede consultar el catálogo de inactivos o todos.
export function asegurarFiltroEstadoProductosPermitido(usuarioActual: UsuarioAutenticado, activo: "true" | "false" | "todos"): void {
  asegurarUsuarioAutenticado(usuarioActual);
  if (activo !== "true") asegurarRolAdmin(usuarioActual);
}

// Implementa RF-P4, RF-P5 y RF-V9: solo la venta admite al vendedor como operador.
export function asegurarPermisoMovimientoStock(usuarioActual: UsuarioAutenticado, tipo: "ingreso" | "egreso" | "venta" | "anulacion"): void {
  asegurarUsuarioAutenticado(usuarioActual);
  if (tipo !== "venta") asegurarRolAdmin(usuarioActual);
}

// Implementa RF-P2 y RF-P7: un producto activo requiere una categoría activa.
export function asegurarCategoriaCompatibleConProducto(categoriaActiva: boolean, productoActivo: boolean): void {
  if (productoActivo && !categoriaActiva) {
    throw new ErrorApi(422, CODIGOS_ERROR.VALIDACION, "La categoría debe estar activa.", [
      { campo: "categoriaId", mensaje: "Elegí una categoría activa." },
    ]);
  }
}

// Implementa Reglas 1 y 10: las existencias permanecen dentro del entero seguro.
export function asegurarExistenciaDentroDeRango(existencia: number, variacion: number): void {
  if (BigInt(existencia) + BigInt(variacion) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ErrorApi(422, CODIGOS_ERROR.VALIDACION, "La existencia supera el máximo permitido.", [
      { campo: "cantidad", mensaje: "La existencia resultante debe ser un entero seguro." },
    ]);
  }
}

// Implementa RF-P1 y Regla 10: la valoración se devuelve en centavos enteros seguros.
export function asegurarValorStockDentroDeRango(valorCentavos: bigint): void {
  if (valorCentavos < 0n || valorCentavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ErrorApi(422, CODIGOS_ERROR.VALIDACION, "El valor del stock supera el máximo permitido.", [
      { campo: "valorStock", mensaje: "El valor del stock debe ser un entero seguro en centavos." },
    ]);
  }
}

// Implementa Regla 1: la actualización atómica debe haber modificado el producto.
export function asegurarStockSuficiente(actualizacionRealizada: boolean, detalle: {
  productoId: number; codigo: string; solicitado: number; disponible: number;
}): void {
  if (!actualizacionRealizada) {
    throw new ErrorApi(409, CODIGOS_ERROR.STOCK_INSUFICIENTE, "No hay stock suficiente.", detalle);
  }
}

// Implementa RF-P2 y RF-P7: reconoce solo la restricción única solicitada, también en causas encapsuladas.
function esColisionUnica(error: unknown, columna: string, indice: string): boolean {
  let actual: unknown = error;
  for (let profundidad = 0; profundidad < 8 && actual && typeof actual === "object"; profundidad += 1) {
    if ("message" in actual && typeof actual.message === "string" &&
      (actual.message.includes(`UNIQUE constraint failed: ${columna}`) || actual.message.includes(indice))) return true;
    actual = "cause" in actual ? actual.cause : null;
  }
  return false;
}

// Implementa RF-P7: traduce la colisión del nombre ante escrituras concurrentes.
export function traducirErrorEscrituraCategoria(error: unknown): never {
  asegurarNombreCategoriaUnico(esColisionUnica(error, "categorias.nombre", "categorias_nombre_unique"));
  throw error;
}

// Implementa RF-P2: traduce la colisión del código ante escrituras concurrentes.
export function traducirErrorEscrituraProducto(error: unknown): never {
  asegurarCodigoProductoUnico(esColisionUnica(error, "productos.codigo", "productos_codigo_unique"));
  throw error;
}

// Implementa Regla 1: distingue contención transitoria de SQLite de un rechazo de negocio.
export function esBloqueoTransitorioSqlite(error: unknown): boolean {
  let actual: unknown = error;
  for (let profundidad = 0; profundidad < 8 && actual && typeof actual === "object"; profundidad += 1) {
    if ("code" in actual && (actual.code === "SQLITE_BUSY" || actual.code === "SQLITE_BUSY_SNAPSHOT" || actual.code === "TRANSACTION_ACTIVE")) return true;
    actual = "cause" in actual ? actual.cause : null;
  }
  return false;
}

// Implementa RF-C2: el documento es único por tipo, comparado sin puntos ni guiones.
export function asegurarDocumentoClienteUnico(enUso: boolean): void {
  if (enUso) throw new ErrorApi(409, CODIGOS_ERROR.DOCUMENTO_DUPLICADO, "El documento ya está registrado.");
}

// Implementa RF-C7: un cliente con saldo no se desactiva ni pierde la cuenta corriente.
export function asegurarClienteSinSaldoPendiente(saldo: number): void {
  if (saldo !== 0) {
    throw new ErrorApi(422, CODIGOS_ERROR.SALDO_PENDIENTE, "El cliente tiene saldo pendiente.", { saldo });
  }
}

// Implementa RF-C2: traduce la colisión del índice único ante escrituras concurrentes.
export function traducirErrorEscrituraCliente(error: unknown): never {
  asegurarDocumentoClienteUnico(esColisionUnica(error, "clientes.nro_doc", "clientes_documento_unico"));
  throw error;
}

// Implementa RF-C5: a un cliente dado de baja tampoco se le permite operar en cuenta corriente.
export function asegurarClienteActivo(cliente: { activo: boolean }): void {
  if (!cliente.activo) {
    throw new ErrorApi(422, CODIGOS_ERROR.CUENTA_CORRIENTE_NO_HABILITADA, "El cliente está dado de baja.");
  }
}

// Implementa RF-C5 y Regla 6: la cuenta corriente solo opera con clientes habilitados.
export function asegurarCuentaCorrienteHabilitada(cliente: { cuentaCorriente: boolean }): void {
  if (!cliente.cuentaCorriente) {
    throw new ErrorApi(422, CODIGOS_ERROR.CUENTA_CORRIENTE_NO_HABILITADA, "El cliente no tiene cuenta corriente habilitada.");
  }
}

// Implementa RF-C5 y Regla 8: un pago nunca supera la deuda; con deuda cero cualquier pago la supera.
export function asegurarPagoNoSuperaDeuda(importe: number, saldoActual: number): void {
  if (importe > saldoActual) {
    throw new ErrorApi(422, CODIGOS_ERROR.PAGO_SUPERA_DEUDA, "El pago supera la deuda del cliente.", {
      importe, saldoActual: Math.max(saldoActual, 0),
    });
  }
}
