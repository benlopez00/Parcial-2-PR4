"use client";

import { Boton } from "@/componentes/interfaz/boton";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { CampoImporte } from "@/componentes/formularios/campo-importe";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import type { PagoVenta } from "@/servicios/borrador-venta";
import { formatearMoneda } from "@/utilidades/formatos";

interface PropiedadesSelectorFormaPago {
  pago: PagoVenta;
  cliente: ClientePublico | null;
  resumen: { total: number; montoRecibido: number; vuelto: number; saldoResultante: number | null };
  deshabilitado: boolean;
  alCambiar: (pago: PagoVenta) => void;
  alCambiarValidezMonto: (valido: boolean) => void;
}

export function SelectorFormaPago({ pago, cliente, resumen, deshabilitado, alCambiar, alCambiarValidezMonto }: PropiedadesSelectorFormaPago) {
  return <div className="space-y-3">
    <div role="group" aria-label="Forma de pago" className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
      {([['contado', 'Contado'], ['tarjeta', 'Tarjeta'], ['cuenta_corriente', 'Cta. cte.']] as const).map(([forma, etiqueta]) => <Boton key={forma}
        id={`pago-venta-${forma}`} variant={pago.forma === forma ? "outline" : "ghost"} className="min-h-11 px-1 shadow-none"
        disabled={deshabilitado || (forma === "cuenta_corriente" && !cliente?.cuentaCorriente)} aria-pressed={pago.forma === forma}
        onClick={() => alCambiar(forma === "tarjeta" ? { forma, tarjeta: { tipo: "debito", marca: "", ultimos4: "" } } : { forma })}>{etiqueta}</Boton>)}
    </div>
    {pago.forma === "contado" && <div className="space-y-4">
      <CampoImporte id="monto-recibido-venta" etiqueta="Monto recibido ($)" valorCentavos={resumen.montoRecibido}
        alCambiarCentavos={(monto) => alCambiar(monto === null ? { forma: "contado" } : { forma: "contado", montoRecibido: monto })}
        alCambiarValidez={alCambiarValidezMonto} deshabilitado={deshabilitado} ayuda="Si lo dejás vacío, se toma el importe justo." />
      <p className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Vuelto</span><span className="font-medium tabular-nums">{formatearMoneda(resumen.vuelto)}</span></p>
    </div>}
    {pago.forma === "tarjeta" && <div className="grid grid-cols-2 gap-3">
      <CampoFormulario id="tipo-tarjeta-venta" etiqueta="Tipo de tarjeta" obligatorio>
        <Selector value={pago.tarjeta.tipo} disabled={deshabilitado} onValueChange={(tipo) => alCambiar({ ...pago, tarjeta: { ...pago.tarjeta, tipo: tipo as "debito" | "credito" } })}>
          <SelectorDisparador id="tipo-tarjeta-venta"><SelectorValor /></SelectorDisparador>
          <SelectorContenido><SelectorOpcion value="debito">Débito</SelectorOpcion><SelectorOpcion value="credito">Crédito</SelectorOpcion></SelectorContenido>
        </Selector>
      </CampoFormulario>
      <CampoFormulario id="marca-tarjeta-venta" etiqueta="Marca" obligatorio>
        <Entrada id="marca-tarjeta-venta" list="marcas-tarjeta-venta" value={pago.tarjeta.marca} disabled={deshabilitado} autoComplete="off"
          onChange={(evento) => alCambiar({ ...pago, tarjeta: { ...pago.tarjeta, marca: evento.target.value } })} />
        <datalist id="marcas-tarjeta-venta">{['Visa', 'Mastercard', 'Cabal', 'Naranja', 'American Express'].map((marca) => <option key={marca} value={marca} />)}</datalist>
      </CampoFormulario>
      <CampoFormulario id="ultimos4-tarjeta-venta" etiqueta="Últimos 4 dígitos" obligatorio className="col-span-2" ayuda="Solo cuatro números; nunca el número completo.">
        <Entrada id="ultimos4-tarjeta-venta" inputMode="numeric" autoComplete="off" maxLength={4} value={pago.tarjeta.ultimos4} disabled={deshabilitado}
          aria-describedby="ultimos4-tarjeta-venta-ayuda" onChange={(evento) => alCambiar({ ...pago, tarjeta: { ...pago.tarjeta, ultimos4: evento.target.value } })} />
      </CampoFormulario>
    </div>}
    {pago.forma === "cuenta_corriente" && <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Saldo actual</dt><dd className="tabular-nums">{formatearMoneda(cliente?.saldo ?? 0)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Esta factura</dt><dd className="tabular-nums">+ {formatearMoneda(resumen.total)}</dd></div>
      <div className="flex justify-between gap-3 border-t pt-3 font-medium"><dt>Saldo resultante</dt><dd className="tabular-nums">{resumen.saldoResultante === null ? "Fuera de rango" : formatearMoneda(resumen.saldoResultante)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Límite de crédito</dt><dd className="tabular-nums">{cliente?.limiteCredito == null ? "Sin límite" : formatearMoneda(cliente.limiteCredito)}</dd></div>
    </dl>}
    {!cliente?.cuentaCorriente && <p className="text-xs text-muted-foreground">Cta. cte. requiere un cliente con cuenta corriente habilitada.</p>}
  </div>;
}
