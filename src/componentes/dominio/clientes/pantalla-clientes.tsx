"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador, useSearchParams as usarParametrosBusqueda } from "next/navigation";
import { useState as usarEstado, useTransition as usarTransicion } from "react";
import { Plus as Mas, Wallet as Billetera } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { ListadoClientes } from "@/servicios/servicio-clientes";
import { construirUrlClientes } from "@/utilidades/consultas-clientes";
import { formatearMoneda } from "@/utilidades/formatos";
import type { CambiosConsultaClientes, ConsultaPantallaClientes } from "@/validaciones/validacion-pantalla-clientes";
import { FiltrosClientes } from "./filtros-clientes";
import { ModalFormularioCliente } from "./modal-formulario-cliente";
import { TablaClientes } from "./tabla-clientes";

interface PropiedadesPantallaClientes {
  consulta: ConsultaPantallaClientes;
  listado: ListadoClientes;
  totalAdeudado: number;
}

export function PantallaClientes({ consulta, listado, totalAdeudado }: PropiedadesPantallaClientes) {
  const enrutador = usarEnrutador();
  const parametros = usarParametrosBusqueda();
  const [pendiente, iniciarTransicion] = usarTransicion();
  const [modalAbierto, cambiarModalAbierto] = usarEstado(false);

  function navegar(cambios: CambiosConsultaClientes): void {
    iniciarTransicion(() => enrutador.push(construirUrlClientes("/clientes", new URLSearchParams(parametros), cambios), { scroll: false }));
  }
  function limpiar(): void { navegar({ q: null, activo: null, conDeuda: null, orden: null, page: null }); }

  return <ContenedorPagina ancho="completo">
    <EncabezadoPagina titulo="Clientes"
      descripcion={totalAdeudado > 0 ? `${formatearMoneda(totalAdeudado)} adeudados en cuentas corrientes` : "Sin deuda en cuentas corrientes"}
      acciones={<>
        <Boton comoHijo variant="ghost"><Enlace href="/clientes/saldos"><Billetera className="size-4" />Saldos</Enlace></Boton>
        <Boton onClick={() => cambiarModalAbierto(true)}><Mas className="size-4" />Nuevo cliente</Boton>
      </>} />
    <div aria-busy={pendiente} className="space-y-4">
      {pendiente && <p role="status" className="text-sm text-muted-foreground">Actualizando listado…</p>}
      <Tarjeta className="overflow-hidden">
        <FiltrosClientes consulta={consulta} alCambiar={navegar} />
        <TablaClientes listado={listado} alCambiarPagina={(page) => navegar({ page })} alLimpiar={limpiar} />
      </Tarjeta>
    </div>
    {modalAbierto && <ModalFormularioCliente abierto alCambiarAbierto={cambiarModalAbierto}
      alCompletar={() => enrutador.refresh()} />}
  </ContenedorPagina>;
}
