"use client";

import { useEffect as usarEfecto, useRef as usarReferencia, useState as usarEstado } from "react";
import { useRouter as usarEnrutador } from "next/navigation";
import Enlace from "next/link";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta, TarjetaContenido, TarjetaEncabezado } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { Titulo } from "@/componentes/maquetacion/titulo";
import { DialogoConfirmacion } from "@/componentes/estados/dialogo-confirmacion";
import { clasificarErrorEmisionVenta, describirErrorVenta, leerRespuestaVenta } from "@/errores/errores-nueva-venta";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import type { ProductoPublico } from "@/servicios/servicio-productos";
import type { FacturaPublica } from "@/servicios/servicio-facturas";
import {
  agregarProductoVenta, cambiarCantidadVenta, prepararEmisionVenta, resumirVenta, validarPagoVenta,
  type PagoVenta, type RenglonVenta,
} from "@/servicios/borrador-venta";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";
import { BuscadorItemsVenta } from "./buscador-items-venta";
import { TablaRenglonesVenta } from "./tabla-renglones-venta";
import { SelectorCompradorVenta } from "./selector-comprador-venta";
import { SelectorFormaPago } from "./selector-forma-pago";

export function PanelNuevaVenta({ vendedor }: { vendedor: string }) {
  const enrutador = usarEnrutador();
  const [renglones, cambiarRenglones] = usarEstado<RenglonVenta[]>([]);
  const [cliente, cambiarCliente] = usarEstado<ClientePublico | null>(null);
  const [registrado, cambiarRegistrado] = usarEstado(false);
  const [pago, cambiarPago] = usarEstado<PagoVenta>({ forma: "contado" });
  const [montoValido, cambiarMontoValido] = usarEstado(true);
  const [enviando, cambiarEnviando] = usarEstado(false);
  const [resultadoIncierto, cambiarResultadoIncierto] = usarEstado(false);
  const [error, cambiarError] = usarEstado<string | null>(null);
  const [sesionVencida, cambiarSesionVencida] = usarEstado(false);
  const [descartar, cambiarDescartar] = usarEstado(false);
  const [numero, cambiarNumero] = usarEstado<string | null>(null);
  const [errorNumero, cambiarErrorNumero] = usarEstado<string | null>(null);
  const [reintentoNumero, cambiarReintentoNumero] = usarEstado(0);
  const bloqueo = usarReferencia(false);
  const resumen = resumirVenta(renglones, cliente, pago);
  const deshabilitado = enviando || resultadoIncierto;

  let impedimento: string | null = null;
  if (!renglones.length) impedimento = "Agregá al menos un producto.";
  else if (registrado && !cliente) impedimento = "Seleccioná un cliente o elegí Consumidor final.";
  else if (!montoValido && pago.forma === "contado") impedimento = "Corregí el formato del monto recibido.";
  else {
    try { validarPagoVenta(cliente, pago, resumen.total); }
    catch (fallo) { impedimento = describirErrorVenta(fallo); }
  }

  usarEfecto(() => {
    const control = new AbortController();
    cambiarErrorNumero(null);
    void (async () => {
      try {
        const respuesta = await fetch("/api/facturas/proximo-numero", { signal: control.signal });
        const datos = await leerRespuestaVenta<{ numeroFormateado: string }>(respuesta);
        if (!control.signal.aborted) cambiarNumero(datos.numeroFormateado);
      } catch (fallo) {
        if (!control.signal.aborted) cambiarErrorNumero(describirErrorVenta(fallo));
      }
    })();
    return () => control.abort();
  }, [reintentoNumero]);

  function seleccionarCliente(nuevo: ClientePublico | null) {
    cambiarCliente(nuevo); cambiarError(null);
    if (pago.forma === "cuenta_corriente" && !nuevo?.cuentaCorriente) cambiarPago({ forma: "contado" });
  }

  function cambiarModo(nuevo: boolean) {
    cambiarRegistrado(nuevo);
    if (!nuevo) seleccionarCliente(null);
    if (nuevo) requestAnimationFrame(() => document.getElementById("buscar-cliente-venta")?.focus());
  }

  function agregarProducto(producto: ProductoPublico, cantidad: number): boolean {
    try { cambiarRenglones(agregarProductoVenta(renglones, producto, cantidad)); cambiarError(null); return true; }
    catch (fallo) { cambiarError(describirErrorVenta(fallo)); return false; }
  }

  function modificarCantidad(producto: ProductoPublico, cantidad: number) {
    try { cambiarRenglones(cambiarCantidadVenta(renglones, producto, cantidad)); cambiarError(null); }
    catch (fallo) { cambiarError(describirErrorVenta(fallo)); }
  }

  async function confirmar() {
    if (bloqueo.current || deshabilitado) return;
    if (impedimento) { cambiarError(impedimento); return; }
    let cuerpo;
    try { cuerpo = prepararEmisionVenta(renglones, cliente, pago); }
    catch (fallo) { cambiarError(describirErrorVenta(fallo)); return; }
    bloqueo.current = true;
    cambiarEnviando(true); cambiarError(null); cambiarSesionVencida(false);
    try {
      const respuesta = await fetch("/api/facturas", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
      });
      const factura = await leerRespuestaVenta<FacturaPublica>(respuesta);
      enrutador.push(`/ventas/${factura.id}`);
      enrutador.refresh();
    } catch (fallo) {
      const rechazo = clasificarErrorEmisionVenta(fallo);
      // Un 5xx tampoco prueba que la transacción no se haya guardado.
      bloqueo.current = rechazo.incierto;
      cambiarResultadoIncierto(rechazo.incierto); cambiarEnviando(false);
      cambiarSesionVencida(rechazo.sesionVencida); cambiarError(rechazo.mensaje);
    }
  }

  usarEfecto(() => {
    function manejarAtajo(evento: KeyboardEvent) {
      if (evento.defaultPrevented || evento.repeat || evento.ctrlKey || evento.altKey || evento.metaKey || deshabilitado
        || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (!["F2", "F4", "F8", "F9"].includes(evento.key)) return;
      evento.preventDefault();
      if (evento.key === "F2") document.getElementById("buscar-producto-venta")?.focus();
      if (evento.key === "F4") {
        cambiarRegistrado(true); seleccionarCliente(null);
        requestAnimationFrame(() => document.getElementById("buscar-cliente-venta")?.focus());
      }
      if (evento.key === "F8") document.getElementById(`pago-venta-${pago.forma}`)?.focus();
      if (evento.key === "F9") void confirmar();
    }
    window.addEventListener("keydown", manejarAtajo);
    return () => window.removeEventListener("keydown", manejarAtajo);
  });

  function reiniciar() {
    cambiarRenglones([]); cambiarCliente(null); cambiarRegistrado(false); cambiarPago({ forma: "contado" });
    cambiarMontoValido(true); cambiarError(null); cambiarDescartar(false); cambiarResultadoIncierto(false);
    bloqueo.current = false; cambiarReintentoNumero((valor) => valor + 1);
    requestAnimationFrame(() => document.getElementById("buscar-producto-venta")?.focus());
  }

  return <ContenedorPagina ancho="completo">
    <EncabezadoPagina titulo="Nueva venta" descripcion="El número se asigna al confirmar. Operable con teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar." />
    {/* La columna de ítems ocupa el resto: ancho = ítems + 21rem + 1.5rem de separación. */}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <Tarjeta className="min-w-0 shadow-none">
        <TarjetaEncabezado><div className="flex items-center justify-between gap-3"><Titulo nivel="h2" className="text-base">Ítems</Titulo>
          <p className="text-xs text-muted-foreground">{formatearNumero(renglones.length)} {renglones.length === 1 ? "renglón" : "renglones"}</p></div></TarjetaEncabezado>
        <TarjetaContenido>
          <BuscadorItemsVenta deshabilitado={deshabilitado} alAgregar={agregarProducto} />
          {error && <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p>{error}</p>{resultadoIncierto && <p className="mt-2 text-xs">Conservamos el borrador. No se volvió a enviar.</p>}
            {sesionVencida && <Enlace href="/login" className="mt-2 inline-block underline">Volver a iniciar sesión</Enlace>}
          </div>}
          <TablaRenglonesVenta renglones={renglones} deshabilitado={deshabilitado} alCambiarCantidad={modificarCantidad}
            alQuitar={(productoId) => { cambiarRenglones(renglones.filter((renglon) => renglon.producto.id !== productoId)); cambiarError(null); }} />
        </TarjetaContenido>
      </Tarjeta>
      <div className="min-w-0 space-y-4">
        <Tarjeta className="shadow-none">
          <TarjetaEncabezado className="p-4"><Titulo nivel="h2" className="text-base">Comprador</Titulo></TarjetaEncabezado>
          <TarjetaContenido className="p-4 pt-0"><SelectorCompradorVenta registrado={registrado} cliente={cliente} deshabilitado={deshabilitado}
            alCambiarModo={cambiarModo} alSeleccionar={seleccionarCliente} /></TarjetaContenido>
        </Tarjeta>
        <Tarjeta className="shadow-none">
          <TarjetaEncabezado className="p-4"><Titulo nivel="h2" className="text-base">Forma de pago <span className="ml-2 text-xs font-normal text-muted-foreground">F8</span></Titulo></TarjetaEncabezado>
          <TarjetaContenido className="p-4 pt-0"><SelectorFormaPago pago={pago} cliente={cliente} resumen={resumen} deshabilitado={deshabilitado} montoValido={montoValido}
            alCambiar={(nuevo) => { if (nuevo.forma !== pago.forma) cambiarMontoValido(true); cambiarPago(nuevo); cambiarError(null); }}
            alCambiarValidezMonto={cambiarMontoValido} /></TarjetaContenido>
        </Tarjeta>
        <Tarjeta className="shadow-none">
          <TarjetaContenido className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3"><Titulo nivel="h2" className="text-base">Total</Titulo>
              <strong className="text-3xl font-semibold tabular-nums">{formatearMoneda(resumen.total)}</strong></div>
            <div className="flex gap-2">
              <Boton className="min-h-11 min-w-0 flex-1 px-2" disabled={deshabilitado || Boolean(impedimento)} onClick={() => void confirmar()}>
                {enviando ? "Confirmando…" : "Confirmar factura (F9)"}</Boton>
              <Boton variant="ghost" className="min-h-11 px-2" disabled={enviando || !renglones.length} onClick={() => cambiarDescartar(true)}>Descartar venta</Boton>
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">{resultadoIncierto ? "Verificá la emisión antes de continuar." : impedimento ?? "Se verifica el stock al confirmar."}</p>
            <dl className="space-y-1 border-t pt-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Unidades</dt><dd className="tabular-nums">{formatearNumero(resumen.unidades)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vendedor</dt><dd className="min-w-0 break-words text-right">{vendedor}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Número (informativo)</dt><dd className="tabular-nums">{numero ?? "Al confirmar"}</dd></div>
            </dl>
            {errorNumero && <div className="text-xs"><p>{errorNumero}</p><Boton variant="link" className="h-auto p-0 text-xs" onClick={() => cambiarReintentoNumero((valor) => valor + 1)}>Volver a consultar número</Boton></div>}
          </TarjetaContenido>
        </Tarjeta>
      </div>
    </div>
    <DialogoConfirmacion abierto={descartar} alCambiarAbierto={cambiarDescartar} titulo="¿Descartar esta venta?"
      descripcion={resultadoIncierto ? "Esto solo borra el borrador. No anula una factura que el servidor haya emitido; verificá el listado antes de volver a vender."
        : "Se quitarán los productos, el comprador y el pago del borrador. No se emitirá ninguna factura."}
      textoConfirmar="Descartar venta" destructivo alConfirmar={reiniciar} />
  </ContenedorPagina>;
}
