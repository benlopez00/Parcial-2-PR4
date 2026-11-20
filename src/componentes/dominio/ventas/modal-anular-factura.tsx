"use client";

import { useState as usarEstado } from "react";
import { useRouter as usarEnrutador } from "next/navigation";
import { accionAnularFactura } from "@/app/(sistema)/ventas/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Boton } from "@/componentes/interfaz/boton";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import type { FacturaPublica } from "@/servicios/servicio-facturas";
import { esquemaAnularFactura } from "@/validaciones/validacion-facturas";

interface PropiedadesModalAnularFactura {
  factura: FacturaPublica;
  alCerrar: () => void;
  alCompletar: (factura: FacturaPublica) => void;
}

export function ModalAnularFactura({ factura, alCerrar, alCompletar }: PropiedadesModalAnularFactura) {
  const [motivo, cambiarMotivo] = usarEstado("");
  const enrutador = usarEnrutador();
  const formulario = usarFormularioAccion<unknown, FacturaPublica>({
    esquema: esquemaAnularFactura, accion: accionAnularFactura, alCompletar,
  });
  return <Dialogo open onOpenChange={(abierto) => !abierto && !formulario.enviando && alCerrar()}>
    <DialogoContenido className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <DialogoEncabezado>
        <DialogoTitulo>Anular factura {factura.numeroFormateado}</DialogoTitulo>
        <DialogoDescripcion>
          Se reingresa el stock de cada producto{factura.pago.forma === "cuenta_corriente" ? " y se acredita el total en la cuenta corriente del cliente" : ""}.
          La factura queda visible como anulada. Esta operación no se puede deshacer.
        </DialogoDescripcion>
      </DialogoEncabezado>
      <form noValidate className="space-y-5" onSubmit={(evento) => {
        evento.preventDefault(); void formulario.enviar({ id: factura.id, motivo });
      }}>
        <fieldset disabled={formulario.enviando} className="min-w-0">
          <CampoFormulario id="motivo-anulacion" etiqueta="Motivo de anulación" obligatorio error={formulario.erroresPorCampo.motivo}>
            <textarea id="motivo-anulacion" autoFocus required rows={3} value={motivo}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-invalid={Boolean(formulario.erroresPorCampo.motivo)} aria-describedby="motivo-anulacion-error"
              placeholder="Por ejemplo: error en la carga de cantidades"
              onChange={(evento) => { cambiarMotivo(evento.target.value); formulario.limpiarErrorCampo("motivo"); }} />
          </CampoFormulario>
        </fieldset>
        {formulario.errorGeneral && <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>
          <Boton type="button" variant="outline" onClick={() => { alCerrar(); enrutador.refresh(); }}>Actualizar comprobante</Boton>
        </div>}
        <DialogoPie>
          <Boton type="button" variant="outline" disabled={formulario.enviando} onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" variant="destructive" disabled={formulario.enviando}>{formulario.enviando ? "Anulando…" : "Anular factura"}</Boton>
        </DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
