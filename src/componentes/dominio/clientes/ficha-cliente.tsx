"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador, useSearchParams as usarParametrosBusqueda } from "next/navigation";
import { useState as usarEstado, useTransition as usarTransicion } from "react";
import { Pencil as Lapiz, Archive as Archivo, Wallet as Billetera } from "lucide-react";
import { actualizarClienteAccion } from "@/app/(sistema)/clientes/acciones";
import { Boton } from "@/componentes/interfaz/boton";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Pestanas } from "@/componentes/interfaz/pestanas";
import { Tarjeta, TarjetaContenido, TarjetaEncabezado, TarjetaTitulo } from "@/componentes/interfaz/tarjeta";
import { Tabla, TablaCelda, TablaCeldaEncabezado, TablaCuerpo, TablaEncabezado, TablaFila } from "@/componentes/interfaz/tabla";
import { DialogoConfirmacion } from "@/componentes/estados/dialogo-confirmacion";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { ClientePublico, FichaCliente as DatosFichaCliente } from "@/servicios/servicio-clientes";
import type { CuentaCorrienteCliente } from "@/servicios/servicio-pagos";
import { construirUrlClientes } from "@/utilidades/consultas-clientes";
import { formatearFecha, formatearMoneda } from "@/utilidades/formatos";
import { esquemaActualizarCliente } from "@/validaciones/validacion-clientes";
import type { CambiosConsultaClientes, ConsultaFichaCliente } from "@/validaciones/validacion-pantalla-clientes";
import { ModalFormularioCliente } from "./modal-formulario-cliente";
import { ModalRegistrarPago } from "./modal-registrar-pago";
import { PestanaCuentaCorriente } from "./pestana-cuenta-corriente";

interface PropiedadesFichaCliente {
  ficha: DatosFichaCliente;
  cuenta: CuentaCorrienteCliente;
  consulta: ConsultaFichaCliente;
}

export function FichaCliente({ ficha, cuenta, consulta }: PropiedadesFichaCliente) {
  const enrutador = usarEnrutador();
  const parametros = usarParametrosBusqueda();
  const [pendiente, iniciarTransicion] = usarTransicion();
  const [modal, cambiarModal] = usarEstado<"editar" | "pago" | null>(null);
  const [confirmarBaja, cambiarConfirmarBaja] = usarEstado(false);

  const baja = usarFormularioAccion<unknown, ClientePublico>({
    esquema: esquemaActualizarCliente, accion: actualizarClienteAccion,
    alCompletar: () => { cambiarConfirmarBaja(false); enrutador.refresh(); },
  });

  function navegar(cambios: CambiosConsultaClientes): void {
    iniciarTransicion(() => enrutador.push(construirUrlClientes(`/clientes/${ficha.id}`, new URLSearchParams(parametros), cambios), { scroll: false }));
  }

  // Regla 8: sin deuda no hay pago posible, así que el botón se deshabilita con el motivo a la vista.
  const puedeCobrar = ficha.cuentaCorriente && ficha.saldo > 0;
  const tarjetas = [
    { etiqueta: "Saldo actual", valor: formatearMoneda(ficha.saldo), destacado: ficha.saldo > 0 },
    { etiqueta: "Límite de crédito", valor: ficha.limiteCredito === null ? "Sin límite" : formatearMoneda(ficha.limiteCredito), destacado: false },
    { etiqueta: "Disponible", valor: ficha.disponible === null ? "Sin límite" : formatearMoneda(ficha.disponible), destacado: false },
  ];

  return <ContenedorPagina ancho="completo">
    <Boton comoHijo variant="link" className="mb-4 px-0"><Enlace href="/clientes">← Clientes</Enlace></Boton>
    <EncabezadoPagina titulo={ficha.nombre} descripcion={`${ficha.tipoDoc} ${ficha.nroDoc}`}
      acciones={<>
        <Boton variant="outline" disabled={!puedeCobrar} title={puedeCobrar ? undefined : "El cliente no tiene deuda para cancelar"}
          onClick={() => cambiarModal("pago")}><Billetera className="size-4" />Registrar pago</Boton>
        <Boton variant="outline" onClick={() => cambiarModal("editar")}><Lapiz className="size-4" />Editar</Boton>
        <Boton variant="outline" disabled={!ficha.activo} onClick={() => { baja.limpiarErrores(); cambiarConfirmarBaja(true); }}>
          <Archivo className="size-4" />Dar de baja</Boton>
      </>} />

    <div className="mb-4 flex flex-wrap items-center gap-2">
      {ficha.cuentaCorriente && <Insignia variant="secondary">Cta. cte.</Insignia>}
      {!ficha.activo && <InsigniaEstado tipo="inactivo" etiqueta="Cliente inactivo · conserva su historial" />}
      {ficha.saldo < 0 && <InsigniaEstado tipo="alerta" etiqueta={`Saldo a favor del cliente: ${formatearMoneda(-ficha.saldo)}`} />}
    </div>

    <div className="mb-6 grid gap-4 sm:grid-cols-3">{tarjetas.map((tarjeta) => <Tarjeta key={tarjeta.etiqueta}>
      <TarjetaEncabezado><TarjetaTitulo className="text-sm font-normal text-muted-foreground">{tarjeta.etiqueta}</TarjetaTitulo></TarjetaEncabezado>
      <TarjetaContenido className={`break-words text-2xl font-semibold tabular-nums ${tarjeta.destacado ? "text-destructive" : ""}`}>{tarjeta.valor}</TarjetaContenido>
    </Tarjeta>)}</div>

    <Pestanas valor={consulta.pestana} etiqueta="Información del cliente"
      opciones={[{ valor: "datos", etiqueta: "Datos y facturas" }, { valor: "cuenta", etiqueta: "Cuenta corriente" }]}
      alCambiar={(pestana) => navegar({ pestana })} />

    <div aria-busy={pendiente} className="space-y-4">
      {pendiente && <p role="status" className="text-sm text-muted-foreground">Actualizando…</p>}

      <section id="panel-datos" role="tabpanel" aria-labelledby="pestana-datos" hidden={consulta.pestana !== "datos"}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Tarjeta>
            <TarjetaEncabezado className="border-b p-4"><TarjetaTitulo>Datos del cliente</TarjetaTitulo></TarjetaEncabezado>
            <TarjetaContenido className="p-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  { etiqueta: "Documento", valor: `${ficha.tipoDoc} ${ficha.nroDoc}` },
                  { etiqueta: "Nombre o razón social", valor: ficha.nombre },
                  { etiqueta: "Domicilio", valor: ficha.domicilio ?? "—" },
                  { etiqueta: "Teléfono", valor: ficha.telefono ?? "—" },
                  { etiqueta: "Email", valor: ficha.email ?? "—" },
                  { etiqueta: "Cuenta corriente", valor: ficha.cuentaCorriente ? "Habilitada" : "No habilitada" },
                ].map((dato) => <div key={dato.etiqueta} className="min-w-0">
                  <dt className="text-sm text-muted-foreground">{dato.etiqueta}</dt>
                  <dd className="break-words font-medium">{dato.valor}</dd>
                </div>)}
              </dl>
            </TarjetaContenido>
          </Tarjeta>

          <Tarjeta className="overflow-hidden">
            <TarjetaEncabezado className="flex-row flex-wrap items-center justify-between gap-2 border-b p-4">
              <TarjetaTitulo>Últimas facturas</TarjetaTitulo>
              <Boton comoHijo variant="link" className="px-0"><Enlace href={`/ventas?clienteId=${ficha.id}`}>Ver todas</Enlace></Boton>
            </TarjetaEncabezado>
            {ficha.ultimasFacturas.length ? <Tabla>
              <TablaEncabezado><TablaFila>
                <TablaCeldaEncabezado>Número</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">Total</TablaCeldaEncabezado>
              </TablaFila></TablaEncabezado>
              <TablaCuerpo>{ficha.ultimasFacturas.map((factura) => <TablaFila key={factura.id}>
                <TablaCelda className="whitespace-nowrap font-mono text-xs">
                  <Enlace className="text-primary underline-offset-4 hover:underline" href={`/ventas/${factura.id}`}>{factura.numeroFormateado}</Enlace>
                  {factura.estado === "anulada" && <span className="ml-2"><InsigniaEstado tipo="inactivo" etiqueta="Anulada" /></span>}
                </TablaCelda>
                <TablaCelda className="whitespace-nowrap text-muted-foreground">{formatearFecha(factura.fecha)}</TablaCelda>
                <TablaCelda className="whitespace-nowrap text-right tabular-nums">{formatearMoneda(factura.total)}</TablaCelda>
              </TablaFila>)}</TablaCuerpo>
            </Tabla> : <EstadoVacio titulo="Sin facturas" descripcion="Todavía no se le emitieron comprobantes a este cliente." />}
          </Tarjeta>
        </div>
      </section>

      <section id="panel-cuenta" role="tabpanel" aria-labelledby="pestana-cuenta" hidden={consulta.pestana !== "cuenta"}>
        <Tarjeta className="overflow-hidden">
          <PestanaCuentaCorriente cuenta={cuenta} consulta={consulta} alCambiar={navegar} />
        </Tarjeta>
      </section>
    </div>

    {modal === "editar" && <ModalFormularioCliente abierto cliente={ficha} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)}
      alCompletar={() => enrutador.refresh()} />}
    {modal === "pago" && <ModalRegistrarPago abierto cliente={ficha} alCambiarAbierto={(abierto) => !abierto && cambiarModal(null)}
      alCompletar={(recibo) => enrutador.push(`/clientes/recibos/${recibo.id}`)} />}
    <DialogoConfirmacion abierto={confirmarBaja} alCambiarAbierto={cambiarConfirmarBaja} titulo="Dar de baja el cliente" destructivo
      pendiente={baja.enviando} textoConfirmar="Dar de baja"
      descripcion={`El cliente dejará de aparecer en los listados y conservará su historial. No se puede dar de baja con saldo pendiente.${baja.errorGeneral ? ` ${baja.errorGeneral}` : ""}`}
      alConfirmar={() => baja.enviar({ id: ficha.id, cambios: { activo: false } }).then(() => undefined)} />
  </ContenedorPagina>;
}
