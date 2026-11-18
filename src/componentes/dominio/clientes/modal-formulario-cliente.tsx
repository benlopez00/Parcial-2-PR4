"use client";

import { useRef as usarReferencia, useState as usarEstado } from "react";
import { actualizarClienteAccion, crearClienteAccion } from "@/app/(sistema)/clientes/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { CampoImporte } from "@/componentes/formularios/campo-importe";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Interruptor } from "@/componentes/interfaz/interruptor";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import { asociarErroresFormularioClientes } from "@/errores/errores-formularios-clientes";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import { esquemaCrearCliente, esquemaEditarCliente } from "@/validaciones/validacion-clientes";

interface PropiedadesModalFormularioCliente {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  cliente?: ClientePublico;
  alCompletar: (cliente: ClientePublico) => void;
}
interface ValoresFormularioCliente {
  tipoDoc: "DNI" | "CUIT"; nroDoc: string; nombre: string; domicilio: string; telefono: string; email: string;
  cuentaCorriente: boolean; limiteCredito: number | null;
}

export function ModalFormularioCliente({ abierto, alCambiarAbierto, cliente, alCompletar }: PropiedadesModalFormularioCliente) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  const [valores, cambiarValores] = usarEstado<ValoresFormularioCliente>({
    tipoDoc: cliente?.tipoDoc ?? "DNI", nroDoc: cliente?.nroDoc ?? "", nombre: cliente?.nombre ?? "",
    domicilio: cliente?.domicilio ?? "", telefono: cliente?.telefono ?? "", email: cliente?.email ?? "",
    cuentaCorriente: cliente?.cuentaCorriente ?? false, limiteCredito: cliente?.limiteCredito ?? null,
  });

  const formulario = usarFormularioAccion<unknown, ClientePublico>({
    esquema: cliente ? esquemaEditarCliente : esquemaCrearCliente,
    accion: async (datos) => {
      const resultado = cliente ? await actualizarClienteAccion({ id: cliente.id, cambios: datos }) : await crearClienteAccion(datos);
      return resultado.ok ? resultado : asociarErroresFormularioClientes(resultado, "cliente");
    },
    alCompletar: (datos) => { alCambiarAbierto(false); alCompletar(datos); },
  });

  // Los opcionales vacíos viajan como null: el esquema los guarda así, no como cadena vacía.
  function prepararEntrada(entrada: ValoresFormularioCliente): unknown {
    return {
      tipoDoc: entrada.tipoDoc, nroDoc: entrada.nroDoc, nombre: entrada.nombre,
      domicilio: entrada.domicilio.trim() === "" ? null : entrada.domicilio,
      telefono: entrada.telefono.trim() === "" ? null : entrada.telefono,
      email: entrada.email.trim() === "" ? null : entrada.email,
      cuentaCorriente: entrada.cuentaCorriente,
      limiteCredito: entrada.cuentaCorriente ? entrada.limiteCredito : null,
    };
  }

  function actualizarCampo<Campo extends keyof ValoresFormularioCliente>(campo: Campo, valor: ValoresFormularioCliente[Campo]): void {
    const siguientes = { ...valores, [campo]: valor };
    cambiarValores(siguientes);
    formulario.validarCampos(prepararEntrada(siguientes), [campo]);
  }

  return <Dialogo open={abierto} onOpenChange={(estado) => !formulario.enviando && alCambiarAbierto(estado)}>
    <DialogoContenido className="max-h-[90dvh] max-w-2xl overflow-y-auto"
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}>
      <DialogoEncabezado>
        <DialogoTitulo>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogoTitulo>
        <DialogoDescripcion>
          {cliente ? "El saldo no se edita: surge de los movimientos de la cuenta corriente."
            : "El documento no se puede repetir, aunque se escriba con puntos o sin ellos."}
        </DialogoDescripcion>
      </DialogoEncabezado>
      <form noValidate className="space-y-5" onSubmit={(evento) => { evento.preventDefault(); void formulario.enviar(prepararEntrada(valores)); }}>
        <fieldset disabled={formulario.enviando} className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario id="tipo-doc-cliente" etiqueta="Tipo de documento" obligatorio error={formulario.erroresPorCampo.tipoDoc}>
            <Selector value={valores.tipoDoc} onValueChange={(valor) => actualizarCampo("tipoDoc", valor as "DNI" | "CUIT")}>
              <SelectorDisparador id="tipo-doc-cliente" aria-invalid={Boolean(formulario.erroresPorCampo.tipoDoc)} aria-describedby="tipo-doc-cliente-error"><SelectorValor /></SelectorDisparador>
              <SelectorContenido><SelectorOpcion value="DNI">DNI</SelectorOpcion><SelectorOpcion value="CUIT">CUIT</SelectorOpcion></SelectorContenido>
            </Selector>
          </CampoFormulario>
          <CampoFormulario id="nro-doc-cliente" etiqueta="Número de documento" obligatorio error={formulario.erroresPorCampo.nroDoc}>
            <Entrada id="nro-doc-cliente" inputMode="numeric" autoComplete="off" value={valores.nroDoc}
              aria-invalid={Boolean(formulario.erroresPorCampo.nroDoc)} aria-describedby="nro-doc-cliente-error"
              onChange={(evento) => actualizarCampo("nroDoc", evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="nombre-cliente" etiqueta="Nombre o razón social" obligatorio error={formulario.erroresPorCampo.nombre} className="sm:col-span-2">
            <Entrada id="nombre-cliente" value={valores.nombre} aria-invalid={Boolean(formulario.erroresPorCampo.nombre)}
              aria-describedby="nombre-cliente-error" onChange={(evento) => actualizarCampo("nombre", evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="domicilio-cliente" etiqueta="Domicilio" error={formulario.erroresPorCampo.domicilio} className="sm:col-span-2">
            <Entrada id="domicilio-cliente" value={valores.domicilio} aria-invalid={Boolean(formulario.erroresPorCampo.domicilio)}
              aria-describedby="domicilio-cliente-error" onChange={(evento) => actualizarCampo("domicilio", evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="telefono-cliente" etiqueta="Teléfono" error={formulario.erroresPorCampo.telefono}>
            <Entrada id="telefono-cliente" inputMode="tel" value={valores.telefono} aria-invalid={Boolean(formulario.erroresPorCampo.telefono)}
              aria-describedby="telefono-cliente-error" onChange={(evento) => actualizarCampo("telefono", evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="email-cliente" etiqueta="Email" error={formulario.erroresPorCampo.email}>
            <Entrada id="email-cliente" type="email" autoComplete="off" value={valores.email} aria-invalid={Boolean(formulario.erroresPorCampo.email)}
              aria-describedby="email-cliente-error" onChange={(evento) => actualizarCampo("email", evento.target.value)} />
          </CampoFormulario>
          <div className="flex min-h-10 items-center gap-2 sm:col-span-2">
            <Interruptor id="cuenta-corriente-cliente" etiqueta="Habilitar cuenta corriente" marcado={valores.cuentaCorriente}
              alCambiar={(marcado) => actualizarCampo("cuentaCorriente", marcado)} />
            <Etiqueta htmlFor="cuenta-corriente-cliente">Habilitar cuenta corriente</Etiqueta>
          </div>
          {valores.cuentaCorriente && <CampoImporte id="limite-cliente" etiqueta="Límite de crédito ($)" valorCentavos={valores.limiteCredito}
            alCambiarCentavos={(valor) => actualizarCampo("limiteCredito", valor)} error={formulario.erroresPorCampo.limiteCredito}
            ayuda="Dejalo vacío para no fijar tope." />}
        </fieldset>
        {formulario.errorGeneral && <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>}
        <DialogoPie>
          <Boton type="button" variant="outline" disabled={formulario.enviando} onClick={() => alCambiarAbierto(false)}>Cancelar</Boton>
          <Boton type="submit" disabled={formulario.enviando}>{formulario.enviando ? "Guardando…" : "Guardar"}</Boton>
        </DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
