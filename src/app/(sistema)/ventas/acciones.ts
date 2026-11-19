"use server";

import { revalidatePath as revalidarRuta } from "next/cache";
import { anularFactura } from "@/servicios/servicio-facturas";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";

export const accionAnularFactura = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const factura = await anularFactura(usuarioActual, datosSinValidar);
  revalidarRuta("/ventas");
  revalidarRuta(`/ventas/${factura.id}`);
  revalidarRuta("/productos");
  revalidarRuta("/productos/[id]", "page");
  if (factura.cliente) {
    revalidarRuta("/clientes");
    revalidarRuta(`/clientes/${factura.cliente.id}`);
    revalidarRuta("/clientes/saldos");
  }
  revalidarRuta("/", "layout");
  return factura;
});
