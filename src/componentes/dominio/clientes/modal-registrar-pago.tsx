"use client";

import { useRef as usarReferencia, useState as usarEstado } from "react";
import { registrarPagoAccion } from "@/app/(sistema)/clientes/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { CampoImporte } from "@/componentes/formularios/campo-importe";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import { asociarErroresFormularioClientes } from "@/errores/errores-formularios-clientes";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import type { ReciboPago } from "@/servicios/servicio-pagos";
import { formatearMoneda } from "@/utilidades/formatos";
import { esquemaCuerpoPago } from "@/validaciones/validacion-pagos";

interface PropiedadesModalRegistrarPago {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  cliente: ClientePublico;
  alCompletar: (recibo: ReciboPago) => void;
}

export function ModalRegistrarPago({ abierto, alCambiarAbierto, cliente, alCompletar }: PropiedadesModalRegistrarPago) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  const [importe, cambiarImporte] = usarEstado<number | null>(null);
  const [medio, cambiarMedio] = usarEstado<"efectivo" | "transferencia" | "tarjeta_debito">("efectivo");
  const [observacion, cambiarObservacion] = usarEstado("");

  const formulario = usarFormularioAccion<unknown, ReciboPago>({
    esquema: esquemaCuerpoPago,
    accion: async (datos) => {
      const resultado = await registrarPagoAccion({ clienteId: cliente.id, pago: datos });
      return resultado.ok ? resultado : asociarErroresFormularioClientes(resultado, "pago");
    },
    alCompletar: (recibo) => { alCambiarAbierto(false); alCompletar(recibo); },
  });

  // Regla 8: el servidor rechaza un pago mayor que la deuda. Acá se adelanta el aviso,
  // pero la decisión sigue siendo del servicio: esto es solo comodidad para el vendedor.
  const excedeLaDeuda = importe !== null && importe > cliente.saldo;
  const errorImporte = excedeLaDeuda
    ? `El pago no puede superar la deuda de ${formatearMoneda(cliente.saldo)}.`
    : formulario.erroresPorCampo.importe;

  return <Dialogo open={abierto} onOpenChange={(estado) => !formulario.enviando && alCambiarAbierto(estado)}>
    <DialogoContenido className="max-h-[90dvh] max-w-lg overflow-y-auto"
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}>
      <DialogoEncabezado>
        <DialogoTitulo>Registrar pago</DialogoTitulo>
        <DialogoDescripcion>{cliente.nombre} · deuda actual {formatearMoneda(cliente.saldo)}</DialogoDescripcion>
      </DialogoEncabezado>
      <form noValidate className="space-y-5" onSubmit={(evento) => {
        evento.preventDefault();
        if (excedeLaDeuda) return;
        void formulario.enviar({ importe, medio, observacion: observacion.trim() === "" ? null : observacion });
      }}>
        <fieldset disabled={formulario.enviando} className="space-y-4">
          <div className="space-y-2">
            <CampoImporte id="importe-pago" etiqueta="Importe ($)" obligatorio valorCentavos={importe}
              alCambiarCentavos={(valor) => { cambiarImporte(valor); formulario.limpiarErrorCampo("importe"); }} error={errorImporte} />
            <Boton type="button" variant="outline" size="sm" onClick={() => { cambiarImporte(cliente.saldo); formulario.limpiarErrorCampo("importe"); }}>
              Completar con el total: {formatearMoneda(cliente.saldo)}
            </Boton>
          </div>
          <CampoFormulario id="medio-pago" etiqueta="Medio de pago" obligatorio error={formulario.erroresPorCampo.medio}>
            <Selector value={medio} onValueChange={(valor) => cambiarMedio(valor as typeof medio)}>
              <SelectorDisparador id="medio-pago" aria-describedby="medio-pago-error"><SelectorValor /></SelectorDisparador>
              <SelectorContenido>
                <SelectorOpcion value="efectivo">Efectivo</SelectorOpcion>
                <SelectorOpcion value="transferencia">Transferencia</SelectorOpcion>
                <SelectorOpcion value="tarjeta_debito">Tarjeta de débito</SelectorOpcion>
              </SelectorContenido>
            </Selector>
          </CampoFormulario>
          <CampoFormulario id="observacion-pago" etiqueta="Observación" error={formulario.erroresPorCampo.observacion}>
            <Entrada id="observacion-pago" value={observacion} aria-describedby="observacion-pago-error"
              onChange={(evento) => cambiarObservacion(evento.target.value)} />
          </CampoFormulario>
        </fieldset>
        {formulario.errorGeneral && <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>}
        <DialogoPie>
          <Boton type="button" variant="outline" disabled={formulario.enviando} onClick={() => alCambiarAbierto(false)}>Cancelar</Boton>
          <Boton type="submit" disabled={formulario.enviando || excedeLaDeuda || importe === null}>
            {formulario.enviando ? "Registrando…" : "Registrar pago"}
          </Boton>
        </DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
