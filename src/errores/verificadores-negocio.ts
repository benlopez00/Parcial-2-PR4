import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { CODIGOS_ERROR } from "./codigos-error";
import { ErrorApi } from "./error-api";

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
