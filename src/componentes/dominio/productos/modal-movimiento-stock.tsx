"use client";

import { useRef as usarReferencia, useState as usarEstado } from "react";
import { registrarMovimientoStockAccion } from "@/app/(sistema)/productos/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import { asociarErroresFormularioProductos } from "@/errores/errores-formularios-productos";
import type { OpcionProducto } from "@/servicios/servicio-productos";
import type { MovimientoStockPublico } from "@/servicios/servicio-stock";
import { esquemaRegistrarMovimientoManual, opcionesMotivosEgreso, opcionesMotivosIngreso } from "@/validaciones/validacion-productos";
import { SelectorProducto } from "./selector-producto";

interface PropiedadesModalMovimientoStock {
  abierto: boolean; alCambiarAbierto: (abierto: boolean) => void; tipo: "ingreso" | "egreso";
  productoInicial?: OpcionProducto; alCompletar: () => void;
}

export function ModalMovimientoStock({ abierto, alCambiarAbierto, tipo, productoInicial, alCompletar }: PropiedadesModalMovimientoStock) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  const motivos = tipo === "ingreso" ? opcionesMotivosIngreso : opcionesMotivosEgreso;
  const [producto, cambiarProducto] = usarEstado<OpcionProducto | null>(productoInicial ?? null);
  const [cantidad, cambiarCantidad] = usarEstado("1");
  const [motivo, cambiarMotivo] = usarEstado<string>(motivos[0]);
  const [observacion, cambiarObservacion] = usarEstado("");
  const formulario = usarFormularioAccion<unknown, MovimientoStockPublico>({
    esquema: esquemaRegistrarMovimientoManual,
    accion: async (datos) => {
      const resultado = await registrarMovimientoStockAccion(datos);
      return resultado.ok ? resultado : asociarErroresFormularioProductos(resultado, "movimiento");
    },
    alCompletar: () => { alCambiarAbierto(false); alCompletar(); },
  });
  const entrada = { productoId: producto?.id ?? 0, movimiento: { tipo, cantidad: cantidad === "" ? undefined : Number(cantidad), motivo, observacion } };
  return <Dialogo open={abierto} onOpenChange={(estado) => !formulario.enviando && alCambiarAbierto(estado)}>
    <DialogoContenido className="max-h-[90dvh] max-w-xl overflow-y-auto"
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}>
      <DialogoEncabezado><DialogoTitulo>{tipo === "ingreso" ? "Ingreso de stock" : "Egreso de stock"}</DialogoTitulo>
        <DialogoDescripcion>{tipo === "ingreso" ? "Suma unidades y registra el motivo del ingreso." : "Resta unidades. Un egreso no puede dejar la existencia en negativo."}</DialogoDescripcion></DialogoEncabezado>
      <form noValidate className="space-y-4" onSubmit={(evento) => { evento.preventDefault(); void formulario.enviar(entrada); }}>
        <div className="space-y-1.5"><p className="text-sm font-medium">Producto</p>
          <SelectorProducto uso="movimiento" valor={producto} deshabilitado={formulario.enviando || Boolean(productoInicial)} error={formulario.erroresPorCampo.productoId}
            alSeleccionar={(seleccionado) => { cambiarProducto(seleccionado); formulario.validarCampos({ ...entrada, productoId: seleccionado?.id ?? 0 }, ["productoId"]); }} />
          {producto && <p className="text-sm text-muted-foreground">Existencia actual: <strong className="text-foreground">{producto.existencia}</strong> unidades. Se volverá a comprobar al registrar.</p>}
        </div>
        <fieldset disabled={formulario.enviando} className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario id="cantidad-stock" etiqueta="Cantidad" obligatorio error={formulario.erroresPorCampo["movimiento.cantidad"]}>
            <Entrada id="cantidad-stock" type="number" min="1" step="1" value={cantidad} aria-invalid={Boolean(formulario.erroresPorCampo["movimiento.cantidad"])} aria-describedby="cantidad-stock-error"
              onChange={(evento) => { const valor = evento.target.value; cambiarCantidad(valor); formulario.validarCampos({ ...entrada, movimiento: { ...entrada.movimiento, cantidad: valor === "" ? undefined : Number(valor) } }, ["movimiento.cantidad"]); }} />
          </CampoFormulario>
          <CampoFormulario id="motivo-stock" etiqueta="Motivo" obligatorio error={formulario.erroresPorCampo["movimiento.motivo"]}>
            <Selector value={motivo} onValueChange={(valor) => { cambiarMotivo(valor); formulario.validarCampos({ ...entrada, movimiento: { ...entrada.movimiento, motivo: valor } }, ["movimiento.motivo"]); }}>
              <SelectorDisparador id="motivo-stock"><SelectorValor /></SelectorDisparador><SelectorContenido>{motivos.map((opcion) => <SelectorOpcion key={opcion} value={opcion}>{opcion}</SelectorOpcion>)}</SelectorContenido>
            </Selector>
          </CampoFormulario>
          <CampoFormulario id="observacion-stock" etiqueta="Observación (opcional)" className="sm:col-span-2" error={formulario.erroresPorCampo["movimiento.observacion"]}>
            <Entrada id="observacion-stock" value={observacion} onChange={(evento) => cambiarObservacion(evento.target.value)} />
          </CampoFormulario>
        </fieldset>
        {formulario.errorGeneral && <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>}
        <DialogoPie><Boton type="button" variant="outline" disabled={formulario.enviando} onClick={() => alCambiarAbierto(false)}>Cancelar</Boton>
          <Boton type="submit" disabled={formulario.enviando}>{formulario.enviando ? "Registrando…" : `Registrar ${tipo}`}</Boton></DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
