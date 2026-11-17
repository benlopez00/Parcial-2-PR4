import { and as yLogico, asc as ascendente, count as contar, eq as igual, ne as distinto, or as oLogico, sql as expresionSql } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { categorias, productos, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarCategoriaCompatibleConProducto, asegurarCodigoProductoUnico, asegurarFiltroEstadoProductosPermitido,
  asegurarRecursoExiste, asegurarRolAdmin, asegurarUsuarioAutenticado, traducirErrorEscrituraProducto,
} from "@/errores/verificadores-negocio";
import {
  esquemaActualizarProducto, esquemaCrearProducto, esquemaListadoProductos, esquemaObtenerProducto,
} from "@/validaciones/validacion-productos";
import { moverStock } from "./servicio-stock";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";

export interface ProductoPublico {
  id: number; codigo: string; descripcion: string; categoria: { id: number; nombre: string };
  precio: number; existencia: number; stockMinimo: number; bajoMinimo: boolean; activo: boolean;
}
export interface ListadoProductos { data: ProductoPublico[]; page: number; pageSize: number; total: number }

const columnasProducto = {
  id: productos.id, codigo: productos.codigo, descripcion: productos.descripcion,
  categoria: { id: categorias.id, nombre: categorias.nombre }, precio: productos.precio,
  existencia: productos.existencia, stockMinimo: productos.stockMinimo, activo: productos.activo,
  bajoMinimo: expresionSql<boolean>`${productos.existencia} < ${productos.stockMinimo}`.mapWith(Boolean),
};

function minusculasSql(columna: typeof productos.codigo | typeof productos.descripcion) {
  return expresionSql`replace(replace(replace(replace(replace(replace(replace(lower(${columna}), 'Á', 'á'), 'É', 'é'), 'Í', 'í'), 'Ó', 'ó'), 'Ú', 'ú'), 'Ü', 'ü'), 'Ñ', 'ñ')`;
}

// Implementa RF-P1: catálogo filtrado y paginado con indicador de stock bajo mínimo.
export async function listarProductos(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ListadoProductos> {
  const consulta = esquemaListadoProductos.parse(datosSinValidar);
  asegurarFiltroEstadoProductosPermitido(usuarioActual, consulta.activo);
  const patron = `%${consulta.q.toLowerCase().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const filtro = yLogico(
    consulta.q ? oLogico(
      expresionSql`${minusculasSql(productos.codigo)} LIKE ${patron} ESCAPE '\\'`,
      expresionSql`${minusculasSql(productos.descripcion)} LIKE ${patron} ESCAPE '\\'`,
    ) : undefined,
    consulta.categoriaId !== undefined ? igual(productos.categoriaId, consulta.categoriaId) : undefined,
    consulta.bajoMinimo === "true" ? expresionSql`${productos.existencia} < ${productos.stockMinimo}` : undefined,
    consulta.activo === "todos" ? undefined : igual(productos.activo, consulta.activo === "true"),
  );
  const [{ total }] = await baseDatos.select({ total: contar() }).from(productos).where(filtro);
  const filas = await baseDatos.select(columnasProducto).from(productos).innerJoin(categorias, igual(productos.categoriaId, categorias.id))
    .where(filtro).orderBy(ascendente(productos.descripcion), ascendente(productos.id))
    .limit(consulta.pageSize).offset((consulta.page - 1) * consulta.pageSize);
  return { data: filas, page: consulta.page, pageSize: consulta.pageSize, total };
}

// Implementa RF-P1: obtiene un producto, conservando la consulta de los dados de baja.
export async function obtenerProductoPorId(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ProductoPublico> {
  const { id } = esquemaObtenerProducto.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const [producto] = await baseDatos.select(columnasProducto).from(productos).innerJoin(categorias, igual(productos.categoriaId, categorias.id))
    .where(igual(productos.id, id)).limit(1);
  asegurarRecursoExiste(producto, "el producto");
  return producto;
}

// Implementa RF-P2 y Reglas 1 y 2: alta y stock inicial se confirman juntos mediante moverStock.
export async function crearProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ProductoPublico> {
  const { stockInicial, ...entrada } = esquemaCrearProducto.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [categoria] = await transaccion.select().from(categorias).where(igual(categorias.id, entrada.categoriaId)).limit(1);
      asegurarRecursoExiste(categoria, "la categoría");
      asegurarCategoriaCompatibleConProducto(categoria.activa, true);
      const [existente] = await transaccion.select({ id: productos.id }).from(productos).where(igual(productos.codigo, entrada.codigo)).limit(1);
      asegurarCodigoProductoUnico(Boolean(existente));
      const [creado] = await transaccion.insert(productos).values(entrada).returning({ id: productos.id });
      if (stockInicial > 0) {
        await moverStock(usuarioActual, { productoId: creado.id, tipo: "ingreso", cantidad: stockInicial, motivo: "Stock inicial" }, transaccion);
      }
      const [producto] = await transaccion.select(columnasProducto).from(productos).innerJoin(categorias, igual(productos.categoriaId, categorias.id))
        .where(igual(productos.id, creado.id));
      return producto;
    });
  } catch (error) { traducirErrorEscrituraProducto(error); }
}

// Implementa RF-P2 y RF-P3: edición y baja lógica sin aceptar cambios directos de existencia.
export async function actualizarProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ProductoPublico> {
  const { id, cambios } = esquemaActualizarProducto.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [actual] = await transaccion.select().from(productos).where(igual(productos.id, id)).limit(1);
      asegurarRecursoExiste(actual, "el producto");
      const [categoria] = await transaccion.select().from(categorias).where(igual(categorias.id, cambios.categoriaId ?? actual.categoriaId)).limit(1);
      asegurarRecursoExiste(categoria, "la categoría");
      asegurarCategoriaCompatibleConProducto(categoria.activa, cambios.activo ?? actual.activo);
      if (cambios.codigo !== undefined) {
        const [otro] = await transaccion.select({ id: productos.id }).from(productos)
          .where(yLogico(igual(productos.codigo, cambios.codigo), distinto(productos.id, id))).limit(1);
        asegurarCodigoProductoUnico(Boolean(otro));
      }
      await transaccion.update(productos).set(cambios).where(igual(productos.id, id));
      const [producto] = await transaccion.select(columnasProducto).from(productos).innerJoin(categorias, igual(productos.categoriaId, categorias.id))
        .where(igual(productos.id, id));
      return producto;
    });
  } catch (error) { traducirErrorEscrituraProducto(error); }
}
