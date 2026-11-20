import { describe as describir, it as probar, expect as esperar, vi } from "vitest";
import { createElement as crearElemento } from "react";
import { renderToStaticMarkup as representarHtml } from "react-dom/server";
import { PantallaProductos } from "@/componentes/dominio/productos/pantalla-productos";
import { leerConsultaProductos } from "@/utilidades/consultas-productos";
import { asociarErroresFormularioProductos } from "@/errores/errores-formularios-productos";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { esquemaCrearProducto, esquemaActualizarProducto, esquemaRegistrarMovimientoManual, opcionesMotivosIngreso, opcionesMotivosEgreso } from "@/validaciones/validacion-productos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

describir("Permisos visibles y catálogo de productos", () => {
  probar.each(["admin", "vendedor"] as const)("el rol %s muestra solo las acciones permitidas", (rol) => {
    const html = representarHtml(crearElemento(PantallaProductos, {
      usuarioActual: { id: 1, nombre: "Operador", email: "operador@prueba.test", rol },
      resumen: { cantidadProductosActivos: 99 }, categorias: [], consulta: leerConsultaProductos({}),
      movimientos: null, productoSeleccionado: null,
      listado: { page: 1, pageSize: 20, total: 1, data: [{ id: 1, codigo: "HE-01", descripcion: "Martillo", categoria: { id: 1, nombre: "Herramientas" }, precio: 1250000, existencia: 1, stockMinimo: 2, bajoMinimo: true, activo: true }] },
    }));
    esperar(html).toContain("99 productos activos");
    esperar(html).toContain("1 · bajo mínimo");
    esperar(html).toContain("$ 12.500,00");
    esperar(html).toContain('href="/productos/1"');
    for (const accion of ["Nuevo producto", ">Ingreso<", ">Egreso<", 'href="/productos/categorias"', 'id="estado-catalogo"']) {
      if (rol === "admin") esperar(html).toContain(accion);
      else esperar(html).not.toContain(accion);
    }
  });
});

describir("Contratos y errores de formularios de productos", () => {
  const producto = { codigo: "HE-01", descripcion: "Martillo", categoriaId: 1, precio: 101, stockMinimo: 0 };
  probar("alta admite stock inicial y edición rechaza existencia, stock inicial y mínimo vacío (null)", () => {
    esperar(esquemaCrearProducto.parse({ ...producto, stockInicial: 2 }).stockInicial).toBe(2);
    esperar(esquemaCrearProducto.safeParse({ ...producto, existencia: 2 }).success).toBe(false);
    esperar(esquemaActualizarProducto.safeParse({ id: 1, cambios: { existencia: 2 } }).success).toBe(false);
    esperar(esquemaActualizarProducto.safeParse({ id: 1, cambios: { stockInicial: 2 } }).success).toBe(false);
    esperar(esquemaActualizarProducto.safeParse({ id: 1, cambios: { ...producto, stockMinimo: null } }).success).toBe(false);
    esperar(esquemaCrearProducto.safeParse({ ...producto, precio: 10.5 }).success).toBe(false);
  });
  probar("todos los motivos visibles provienen del mismo esquema y no se intercambian", () => {
    for (const motivo of opcionesMotivosIngreso) esperar(esquemaRegistrarMovimientoManual.safeParse({ productoId: 1, movimiento: { tipo: "ingreso", cantidad: 1, motivo } }).success).toBe(true);
    for (const motivo of opcionesMotivosEgreso) esperar(esquemaRegistrarMovimientoManual.safeParse({ productoId: 1, movimiento: { tipo: "egreso", cantidad: 1, motivo } }).success).toBe(true);
    esperar(esquemaRegistrarMovimientoManual.safeParse({ productoId: 1, movimiento: { tipo: "egreso", cantidad: 1, motivo: "Reposición" } }).success).toBe(false);
    esperar(esquemaRegistrarMovimientoManual.safeParse({ productoId: 1, movimiento: { tipo: "ingreso", cantidad: 0, motivo: "Reposición" } }).success).toBe(false);
  });
  probar("asocia duplicados, stock concurrente y errores de edición al campo visible", () => {
    esperar(asociarErroresFormularioProductos({ ok: false, error: { code: "CODIGO_DUPLICADO", message: "Código repetido" } }, "producto").error.details).toEqual([{ campo: "codigo", mensaje: "Código repetido" }]);
    esperar(asociarErroresFormularioProductos({ ok: false, error: { code: "NOMBRE_DUPLICADO", message: "Nombre repetido" } }, "categoria").error.details).toEqual([{ campo: "nombre", mensaje: "Nombre repetido" }]);
    esperar(asociarErroresFormularioProductos({ ok: false, error: { code: "STOCK_INSUFICIENTE", message: "Sin stock", details: { solicitado: 5, disponible: 2 } } }, "movimiento").error.details).toEqual([{ campo: "movimiento.cantidad", mensaje: "Sin stock Disponible: 2." }]);
    const validacion = esquemaActualizarProducto.safeParse({ id: 1, cambios: { precio: -1 } });
    if (validacion.success) throw new Error("Debe rechazar el precio negativo.");
    const errorServidor = convertirErrorAResultadoAccion(validacion.error);
    esperar(asociarErroresFormularioProductos(errorServidor, "producto").error.details).toEqual(esperar.arrayContaining([esperar.objectContaining({ campo: "precio" })]));
  });
});
