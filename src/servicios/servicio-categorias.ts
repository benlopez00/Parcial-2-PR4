import { and as yLogico, asc as ascendente, count as contar, eq as igual, ne as distinto } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { categorias, productos, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarCategoriaSinProductosActivos, asegurarNombreCategoriaUnico, asegurarRecursoExiste,
  asegurarRolAdmin, asegurarUsuarioAutenticado, traducirErrorEscrituraCategoria,
} from "@/errores/verificadores-negocio";
import { esquemaActualizarCategoria, esquemaCrearCategoria, esquemaListadoCategorias } from "@/validaciones/validacion-categorias";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";

export interface CategoriaPublica { id: number; nombre: string; activa: boolean }
export interface CategoriaAdministrable extends CategoriaPublica { cantidadProductosActivos: number }
const columnasCategoria = { id: categorias.id, nombre: categorias.nombre, activa: categorias.activa };

// Implementa RF-P7: administración de categorías activas/inactivas y conteo de sus productos activos.
export async function listarCategoriasAdministracion(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<CategoriaAdministrable[]> {
  esquemaListadoCategorias.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  const listado = await baseDatos.select({ ...columnasCategoria, cantidadProductosActivos: contar(productos.id) })
    .from(categorias).leftJoin(productos, yLogico(igual(productos.categoriaId, categorias.id), igual(productos.activo, true)))
    .groupBy(categorias.id).orderBy(ascendente(categorias.nombre), ascendente(categorias.id));
  return listado;
}

// Implementa RF-P7: lista todas las categorías activas sin paginación.
export async function listarCategorias(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<CategoriaPublica[]> {
  esquemaListadoCategorias.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  return baseDatos.select(columnasCategoria).from(categorias).where(igual(categorias.activa, true))
    .orderBy(ascendente(categorias.nombre), ascendente(categorias.id));
}

// Implementa RF-P7: crea una categoría activa con nombre único.
export async function crearCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<CategoriaPublica> {
  const entrada = esquemaCrearCategoria.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [existente] = await transaccion.select({ id: categorias.id }).from(categorias).where(igual(categorias.nombre, entrada.nombre)).limit(1);
      asegurarNombreCategoriaUnico(Boolean(existente));
      const [creada] = await transaccion.insert(categorias).values(entrada).returning(columnasCategoria);
      return creada;
    });
  } catch (error) { traducirErrorEscrituraCategoria(error); }
}

// Implementa RF-P7: edita o desactiva sin perder historial ni dejar productos activos en una baja.
export async function actualizarCategoria(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<CategoriaPublica> {
  const { id, cambios } = esquemaActualizarCategoria.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [actual] = await transaccion.select(columnasCategoria).from(categorias).where(igual(categorias.id, id)).limit(1);
      asegurarRecursoExiste(actual, "la categoría");
      if (cambios.nombre !== undefined) {
        const [otra] = await transaccion.select({ id: categorias.id }).from(categorias)
          .where(yLogico(igual(categorias.nombre, cambios.nombre), distinto(categorias.id, id))).limit(1);
        asegurarNombreCategoriaUnico(Boolean(otra));
      }
      if (cambios.activa === false) {
        const [productoActivo] = await transaccion.select({ id: productos.id }).from(productos)
          .where(yLogico(igual(productos.categoriaId, id), igual(productos.activo, true))).limit(1);
        asegurarCategoriaSinProductosActivos(Boolean(productoActivo));
      }
      const [actualizada] = await transaccion.update(categorias).set(cambios).where(igual(categorias.id, id)).returning(columnasCategoria);
      return actualizada;
    });
  } catch (error) { traducirErrorEscrituraCategoria(error); }
}
