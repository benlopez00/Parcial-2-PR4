import { and as yLogico, asc as ascendente, count as contar, eq as igual, ne as distinto, or as oLogico, sql as expresionSql, type SQL } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarEmailNoDuplicado,
  asegurarNoEsOperacionSobreSiMismo,
  asegurarRecursoExiste,
  asegurarRolAdmin,
  traducirErrorEscrituraUsuario,
} from "@/errores/verificadores-negocio";
import { generarContrasenaTemporal, generarHashContrasena } from "@/utilidades/sesion";
import {
  esquemaActualizarUsuario,
  esquemaCrearUsuario,
  esquemaListadoUsuarios,
  esquemaRestablecerContrasenaUsuario,
} from "@/validaciones/validacion-usuarios";

export type UsuarioPublico = UsuarioAutenticado & {
  activo: boolean;
  fechaCreacion: string;
};

export interface ListadoUsuarios {
  data: UsuarioPublico[];
  page: number;
  pageSize: number;
  total: number;
}

const columnasPublicasUsuario = {
  id: usuarios.id,
  nombre: usuarios.nombre,
  email: usuarios.email,
  rol: usuarios.rol,
  activo: usuarios.activo,
  fechaCreacion: usuarios.fechaCreacion,
};

function escaparPatronBusqueda(termino: string): string {
  return `%${termino.toLowerCase().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

// Implementa RF-U4: lista usuarios paginados con filtros de búsqueda y estado, solo para administradores.
export async function listarUsuarios(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<ListadoUsuarios> {
  const consulta = esquemaListadoUsuarios.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);

  const condiciones: SQL[] = [];
  if (consulta.q.length > 0) {
    const patron = escaparPatronBusqueda(consulta.q);
    const filtroTexto = oLogico(
      expresionSql`lower(${usuarios.nombre}) LIKE ${patron} ESCAPE '\\'`,
      expresionSql`lower(${usuarios.email}) LIKE ${patron} ESCAPE '\\'`,
    );
    if (filtroTexto) {
      condiciones.push(filtroTexto);
    }
  }

  if (consulta.activo === "true") {
    condiciones.push(igual(usuarios.activo, true));
  } else if (consulta.activo === "false") {
    condiciones.push(igual(usuarios.activo, false));
  }

  const filtroFinal = condiciones.length > 0 ? yLogico(...condiciones) : undefined;

  const [{ total }] = await baseDatos
    .select({ total: contar() })
    .from(usuarios)
    .where(filtroFinal);

  const filas = await baseDatos
    .select(columnasPublicasUsuario)
    .from(usuarios)
    .where(filtroFinal)
    .orderBy(ascendente(usuarios.nombre), ascendente(usuarios.id))
    .limit(consulta.pageSize)
    .offset((consulta.page - 1) * consulta.pageSize);

  return {
    data: filas,
    page: consulta.page,
    pageSize: consulta.pageSize,
    total,
  };
}

// Implementa RF-U4: da de alta un usuario activo con contraseña temporal hasheada y email único.
export async function crearUsuario(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<UsuarioPublico> {
  const entrada = esquemaCrearUsuario.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);

  const [existente] = await baseDatos
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(igual(usuarios.email, entrada.email))
    .limit(1);
  asegurarEmailNoDuplicado(Boolean(existente));

  const contrasenaHash = await generarHashContrasena(entrada.password);

  try {
    const [creado] = await baseDatos
      .insert(usuarios)
      .values({
        nombre: entrada.nombre,
        email: entrada.email,
        rol: entrada.rol,
        contrasenaHash,
        activo: true,
      })
      .returning(columnasPublicasUsuario);
    return creado;
  } catch (error) {
    traducirErrorEscrituraUsuario(error);
  }
}

// Implementa RF-U4: actualiza datos, rol o baja/reactivación lógica evitando autodesactivación o autodegradación.
export async function actualizarUsuario(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<UsuarioPublico> {
  const { id, cambios } = esquemaActualizarUsuario.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);

  const [destino] = await baseDatos
    .select(columnasPublicasUsuario)
    .from(usuarios)
    .where(igual(usuarios.id, id))
    .limit(1);
  asegurarRecursoExiste(destino, "el usuario");

  asegurarNoEsOperacionSobreSiMismo(usuarioActual, id, cambios);

  if (cambios.email !== undefined) {
    const [otro] = await baseDatos
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(yLogico(igual(usuarios.email, cambios.email), distinto(usuarios.id, id)))
      .limit(1);
    asegurarEmailNoDuplicado(Boolean(otro));
  }

  const valoresAActualizar: Partial<typeof usuarios.$inferInsert> = {};
  if (cambios.nombre !== undefined) valoresAActualizar.nombre = cambios.nombre;
  if (cambios.email !== undefined) valoresAActualizar.email = cambios.email;
  if (cambios.rol !== undefined) valoresAActualizar.rol = cambios.rol;
  if (cambios.activo !== undefined) valoresAActualizar.activo = cambios.activo;

  try {
    const [actualizado] = await baseDatos
      .update(usuarios)
      .set(valoresAActualizar)
      .where(igual(usuarios.id, id))
      .returning(columnasPublicasUsuario);
    return actualizado;
  } catch (error) {
    traducirErrorEscrituraUsuario(error);
  }
}

// Implementa RF-U5: genera una contraseña temporal única para un usuario y persiste únicamente su hash.
export async function restablecerContrasenaUsuario(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<{ passwordTemporal: string }> {
  const { id } = esquemaRestablecerContrasenaUsuario.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);

  const [destino] = await baseDatos
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(igual(usuarios.id, id))
    .limit(1);
  asegurarRecursoExiste(destino, "el usuario");

  const passwordTemporal = generarContrasenaTemporal();
  const contrasenaHash = await generarHashContrasena(passwordTemporal);

  await baseDatos
    .update(usuarios)
    .set({ contrasenaHash })
    .where(igual(usuarios.id, id));

  return { passwordTemporal };
}
