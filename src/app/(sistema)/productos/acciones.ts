"use server";

import { revalidatePath as revalidarRuta } from "next/cache";
import { actualizarProducto, crearProducto, listarOpcionesProductos } from "@/servicios/servicio-productos";
import { actualizarCategoria, crearCategoria } from "@/servicios/servicio-categorias";
import { registrarMovimientoManual } from "@/servicios/servicio-stock";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";

export const crearProductoAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const producto = await crearProducto(usuarioActual, datosSinValidar);
  revalidarRuta("/productos");
  revalidarRuta("/productos/categorias");
  revalidarRuta("/", "layout");
  return producto;
});

export const actualizarProductoAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const producto = await actualizarProducto(usuarioActual, datosSinValidar);
  revalidarRuta("/productos");
  revalidarRuta(`/productos/${producto.id}`);
  revalidarRuta("/productos/categorias");
  revalidarRuta("/", "layout");
  return producto;
});

export const registrarMovimientoStockAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const movimiento = await registrarMovimientoManual(usuarioActual, datosSinValidar);
  revalidarRuta("/productos");
  revalidarRuta(`/productos/${movimiento.producto.id}`);
  revalidarRuta("/", "layout");
  return movimiento;
});

export const crearCategoriaAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const categoria = await crearCategoria(usuarioActual, datosSinValidar);
  revalidarRuta("/productos/categorias");
  revalidarRuta("/productos");
  return categoria;
});

export const actualizarCategoriaAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const categoria = await actualizarCategoria(usuarioActual, datosSinValidar);
  revalidarRuta("/productos/categorias");
  revalidarRuta("/productos");
  revalidarRuta("/productos/[id]", "page");
  return categoria;
});

export const buscarOpcionesProductosAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  return listarOpcionesProductos(usuarioActual, datosSinValidar);
});
