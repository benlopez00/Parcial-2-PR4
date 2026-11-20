import { eq as igual } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarContrasenaActualCorrecta,
  asegurarCredencialesValidas,
  asegurarSesionValida,
  asegurarUsuarioAutenticado,
} from "@/errores/verificadores-negocio";
import {
  HASH_FICTICIO_TIMING,
  generarHashContrasena,
  verificarContrasena,
} from "@/utilidades/sesion";
import {
  esquemaCambioContrasena,
  esquemaInicioSesion,
  esquemaSinDatos,
} from "@/validaciones/validacion-autenticacion";

function proyectarUsuarioAutenticado(usuario: {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
}): UsuarioAutenticado {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

// Implementa RF-U1: valida credenciales y estado activo sin exponer el motivo del rechazo ni el hash.
export async function iniciarSesion(
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<UsuarioAutenticado> {
  const { email, password: contrasena } = esquemaInicioSesion.parse(datosSinValidar);

  const [usuario] = await baseDatos
    .select()
    .from(usuarios)
    .where(igual(usuarios.email, email))
    .limit(1);

  const hashAComparar = usuario ? usuario.contrasenaHash : HASH_FICTICIO_TIMING;
  const coincide = await verificarContrasena(contrasena, hashAComparar);
  asegurarCredencialesValidas(usuario, coincide);

  return proyectarUsuarioAutenticado(usuario);
}

// Implementa RF-U2: devuelve los datos públicos del usuario ya validado contra la base de datos.
export async function obtenerPerfilActual(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
): Promise<UsuarioAutenticado> {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  return proyectarUsuarioAutenticado(usuarioActual);
}

// Implementa RF-U5: verifica la contraseña actual del usuario conectado y guarda el nuevo hash.
export async function cambiarContrasenaPropia(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<void> {
  const { actual, nueva } = esquemaCambioContrasena.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const [usuario] = await baseDatos
    .select()
    .from(usuarios)
    .where(igual(usuarios.id, usuarioActual.id))
    .limit(1);

  asegurarSesionValida(usuario);
  const coincide = await verificarContrasena(actual, usuario.contrasenaHash);
  asegurarContrasenaActualCorrecta(coincide);

  const nuevoHash = await generarHashContrasena(nueva);
  await baseDatos
    .update(usuarios)
    .set({ contrasenaHash: nuevoHash })
    .where(igual(usuarios.id, usuarioActual.id));
}
