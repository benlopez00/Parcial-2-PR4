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
