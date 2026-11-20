"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador, useSearchParams as usarParametrosBusqueda } from "next/navigation";
import { useState as usarEstado, useTransition as usarTransicion } from "react";
import { ArrowDown as FlechaAbajo, ArrowUp as FlechaArriba, Plus as Mas, Tags as Etiquetas } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { Pestanas } from "@/componentes/interfaz/pestanas";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { EstadoCarga } from "@/componentes/estados/estado-carga";
import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import type { CategoriaPublica } from "@/servicios/servicio-categorias";
import type { ListadoProductos, OpcionProducto, ResumenProductos } from "@/servicios/servicio-productos";
import type { ListadoMovimientosStockPantalla } from "@/servicios/servicio-stock";
import type { CambiosConsultaProductos, ConsultaPantallaProductos } from "@/validaciones/validacion-pantalla-productos";
import { construirUrlProductos } from "@/utilidades/consultas-productos";
import { FiltrosCatalogoProductos } from "./filtros-catalogo-productos";
import { FiltrosMovimientosStock } from "./filtros-movimientos-stock";
import { TablaCatalogoProductos } from "./tabla-catalogo-productos";
import { TablaMovimientosStock } from "./tabla-movimientos-stock";
import { ModalFormularioProducto } from "./modal-formulario-producto";
import { ModalMovimientoStock } from "./modal-movimiento-stock";

interface PropiedadesPantallaProductos {
  usuarioActual: UsuarioAutenticado; resumen: ResumenProductos; categorias: CategoriaPublica[];
  consulta: ConsultaPantallaProductos; listado: ListadoProductos | null; movimientos: ListadoMovimientosStockPantalla | null;
  productoSeleccionado: OpcionProducto | null;
}

export function PantallaProductos({ usuarioActual, resumen, categorias, consulta, listado, movimientos, productoSeleccionado }: PropiedadesPantallaProductos) {
  const enrutador = usarEnrutador();
  const parametros = usarParametrosBusqueda();
  const [pendiente, iniciarTransicion] = usarTransicion();
  const [modal, cambiarModal] = usarEstado<"producto" | "ingreso" | "egreso" | null>(null);
  const esAdministrador = usuarioActual.rol === "admin";
  function navegar(cambios: CambiosConsultaProductos): void {
    iniciarTransicion(() => enrutador.push(construirUrlProductos("/productos", new URLSearchParams(parametros), cambios), { scroll: false }));
  }
  function limpiarCatalogo(): void { navegar({ q: null, categoriaId: null, activo: null, bajoMinimo: null, page: null }); }
  function limpiarMovimientos(): void { navegar({ productoId: null, tipo: null, desde: null, hasta: null, paginaMovimientos: null }); }
  return <ContenedorPagina ancho="completo">
    <EncabezadoPagina titulo="Productos" descripcion={`${resumen.cantidadProductosActivos} productos activos en el catálogo`}
      acciones={esAdministrador && <>
        <Boton comoHijo variant="ghost"><Enlace href="/productos/categorias"><Etiquetas className="size-4" />Categorías</Enlace></Boton>
        <Boton variant="outline" onClick={() => cambiarModal("ingreso")}><FlechaAbajo className="size-4" />Ingreso</Boton>
        <Boton variant="outline" onClick={() => cambiarModal("egreso")}><FlechaArriba className="size-4" />Egreso</Boton>
        <Boton onClick={() => cambiarModal("producto")}><Mas className="size-4" />Nuevo producto</Boton>
      </>} />
    <Pestanas valor={consulta.pestana} opciones={[{ valor: "catalogo", etiqueta: "Catálogo" }, { valor: "movimientos", etiqueta: "Existencias y movimientos" }]}
      etiqueta="Consulta de productos" alCambiar={(pestana) => navegar({ pestana })} />
    <div aria-busy={pendiente} className="space-y-4">
      {pendiente && <p role="status" className="text-sm text-muted-foreground">Actualizando listado…</p>}
      <section id="panel-catalogo" role="tabpanel" aria-labelledby="pestana-catalogo" hidden={consulta.pestana !== "catalogo"}>
        {listado && <Tarjeta className="overflow-hidden">
          <FiltrosCatalogoProductos consulta={consulta.catalogo} categorias={categorias} esAdministrador={esAdministrador} alCambiar={navegar} />
          <TablaCatalogoProductos listado={listado} alCambiarPagina={(page) => navegar({ page })} alLimpiar={limpiarCatalogo} />
        </Tarjeta>}
      </section>
      <section id="panel-movimientos" role="tabpanel" aria-labelledby="pestana-movimientos" hidden={consulta.pestana !== "movimientos"}>
        {movimientos && <Tarjeta className="overflow-hidden">
          <FiltrosMovimientosStock key={`${consulta.movimientos.desde ?? ""}-${consulta.movimientos.hasta ?? ""}`} consulta={consulta.movimientos} productoSeleccionado={productoSeleccionado} alCambiar={navegar} />
          <TablaMovimientosStock listado={movimientos} alCambiarPagina={(paginaMovimientos) => navegar({ paginaMovimientos })} alLimpiar={limpiarMovimientos} />
        </Tarjeta>}
      </section>
      {!listado && !movimientos && <EstadoCarga filas={5} />}
    </div>
    {esAdministrador && modal === "producto" && <ModalFormularioProducto abierto categorias={categorias} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)} alCompletar={() => enrutador.refresh()} />}
    {esAdministrador && (modal === "ingreso" || modal === "egreso") && <ModalMovimientoStock key={modal} abierto tipo={modal} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)} alCompletar={() => enrutador.refresh()} />}
  </ContenedorPagina>;
}
