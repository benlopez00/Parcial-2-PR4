"use server";

import { revalidatePath as revalidarRuta } from "next/cache";
import { actualizarCliente, crearCliente } from "@/servicios/servicio-clientes";
import { registrarPagoCuentaCorriente } from "@/servicios/servicio-pagos";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";

export const crearClienteAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const cliente = await crearCliente(usuarioActual, datosSinValidar);
  revalidarRuta("/clientes");
  revalidarRuta("/clientes/saldos");
  return cliente;
});

export const actualizarClienteAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const cliente = await actualizarCliente(usuarioActual, datosSinValidar);
  revalidarRuta("/clientes");
  revalidarRuta(`/clientes/${cliente.id}`);
  revalidarRuta("/clientes/saldos");
  return cliente;
});

// El pago cambia el saldo, así que además del cliente hay que refrescar los listados que lo muestran.
export const registrarPagoAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const recibo = await registrarPagoCuentaCorriente(usuarioActual, datosSinValidar);
  revalidarRuta("/clientes");
  revalidarRuta(`/clientes/${recibo.cliente.id}`);
  revalidarRuta("/clientes/saldos");
  revalidarRuta("/");
  return recibo;
});
