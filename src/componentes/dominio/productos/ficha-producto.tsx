"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador, useSearchParams as usarParametrosBusqueda } from "next/navigation";
import { useState as usarEstado, useTransition as usarTransicion } from "react";
import { ArrowDown as FlechaAbajo, ArrowUp as FlechaArriba, Pencil as Lapiz, Archive as Archivo } from "lucide-react";
import { actualizarProductoAccion } from "@/app/(sistema)/productos/acciones";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta, TarjetaContenido, TarjetaEncabezado, TarjetaTitulo } from "@/componentes/interfaz/tarjeta";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { DialogoConfirmacion } from "@/componentes/estados/dialogo-confirmacion";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import type { CategoriaPublica } from "@/servicios/servicio-categorias";
import type { FichaProducto as DatosFichaProducto, ProductoPublico } from "@/servicios/servicio-productos";
import type { ListadoMovimientosStockPantalla } from "@/servicios/servicio-stock";
import { esquemaActualizarProducto } from "@/validaciones/validacion-productos";
import { construirUrlProductos } from "@/utilidades/consultas-productos";
import { formatearMoneda } from "@/utilidades/formatos";
import { ModalFormularioProducto } from "./modal-formulario-producto";
import { ModalMovimientoStock } from "./modal-movimiento-stock";
import { TablaMovimientosStock } from "./tabla-movimientos-stock";

interface PropiedadesFichaProducto {
  ficha: DatosFichaProducto; movimientos: ListadoMovimientosStockPantalla; usuarioActual: UsuarioAutenticado; categorias: CategoriaPublica[];
}

export function FichaProducto({ ficha, movimientos, usuarioActual, categorias }: PropiedadesFichaProducto) {
  const { producto } = ficha;
  const enrutador = usarEnrutador();
  const parametros = usarParametrosBusqueda();
  const [pendiente, iniciarTransicion] = usarTransicion();
  const [modal, cambiarModal] = usarEstado<"editar" | "ingreso" | "egreso" | null>(null);
  const [confirmarBaja, cambiarConfirmarBaja] = usarEstado(false);
  const baja = usarFormularioAccion<unknown, ProductoPublico>({
    esquema: esquemaActualizarProducto, accion: actualizarProductoAccion,
    alCompletar: () => { cambiarConfirmarBaja(false); enrutador.refresh(); },
  });
  const esAdministrador = usuarioActual.rol === "admin";
  const tarjetas = [
    { etiqueta: "Existencia", valor: producto.existencia }, { etiqueta: "Stock mínimo", valor: producto.stockMinimo },
    { etiqueta: "Precio de venta", valor: formatearMoneda(producto.precio) }, { etiqueta: "Valor del stock", valor: formatearMoneda(ficha.valorStock) },
  ];
  return <ContenedorPagina ancho="completo">
    <Boton comoHijo variant="link" className="mb-4 px-0"><Enlace href="/productos">← Productos</Enlace></Boton>
    <EncabezadoPagina titulo={producto.descripcion} descripcion={`${producto.codigo} · ${producto.categoria.nombre}`}
      acciones={esAdministrador && <>
        <Boton variant="outline" onClick={() => cambiarModal("ingreso")}><FlechaAbajo className="size-4" />Ingreso</Boton>
        <Boton variant="outline" onClick={() => cambiarModal("egreso")}><FlechaArriba className="size-4" />Egreso</Boton>
        <Boton variant="outline" onClick={() => cambiarModal("editar")}><Lapiz className="size-4" />Editar</Boton>
        <Boton variant="outline" disabled={!producto.activo} onClick={() => { baja.limpiarErrores(); cambiarConfirmarBaja(true); }}><Archivo className="size-4" />Dar de baja</Boton>
      </>} />
    {!producto.activo && <div className="mb-4"><InsigniaEstado tipo="inactivo" etiqueta="Producto inactivo · conserva su historial" /></div>}
    {producto.bajoMinimo && <div className="mb-4"><InsigniaEstado tipo="alerta" etiqueta={`${producto.existencia} · bajo mínimo`} /></div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tarjetas.map((tarjeta) => <Tarjeta key={tarjeta.etiqueta}>
      <TarjetaEncabezado><TarjetaTitulo className="text-sm font-normal text-muted-foreground">{tarjeta.etiqueta}</TarjetaTitulo></TarjetaEncabezado>
      <TarjetaContenido className="break-words text-2xl font-semibold tabular-nums">{tarjeta.valor}</TarjetaContenido>
    </Tarjeta>)}</div>
    <Tarjeta className="overflow-hidden" aria-busy={pendiente}>
      <TarjetaEncabezado className="flex-row flex-wrap items-center justify-between gap-2 border-b p-4"><TarjetaTitulo>Movimientos de stock</TarjetaTitulo><p className="text-sm text-muted-foreground">{pendiente ? "Actualizando…" : "Del más nuevo al más viejo"}</p></TarjetaEncabezado>
      <TablaMovimientosStock listado={movimientos} mostrarProducto={false} alCambiarPagina={(page) => iniciarTransicion(() => enrutador.push(construirUrlProductos(`/productos/${producto.id}`, new URLSearchParams(parametros), { page }), { scroll: false }))} />
    </Tarjeta>
    {esAdministrador && modal === "editar" && <ModalFormularioProducto abierto producto={producto} categorias={categorias} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)} alCompletar={() => enrutador.refresh()} />}
    {esAdministrador && (modal === "ingreso" || modal === "egreso") && <ModalMovimientoStock abierto tipo={modal} productoInicial={producto} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)} alCompletar={() => enrutador.refresh()} />}
    {esAdministrador && <DialogoConfirmacion abierto={confirmarBaja} alCambiarAbierto={cambiarConfirmarBaja} titulo="Dar de baja el producto" destructivo pendiente={baja.enviando} textoConfirmar="Dar de baja"
      descripcion={`El producto dejará de ofrecerse en ventas y conservará su historial.${baja.errorGeneral ? ` ${baja.errorGeneral}` : ""}`}
      alConfirmar={() => { return baja.enviar({ id: producto.id, cambios: { activo: false } }).then(() => undefined); }} />}
  </ContenedorPagina>;
}
