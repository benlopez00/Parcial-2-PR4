import { and as yLogico, eq as igual, inArray as dentroDe, sql as expresionSql } from "drizzle-orm";
import type { BaseDatos, TransaccionBaseDatos } from "./conexion";
import { categorias, clientes, facturas, movimientosCuenta, movimientosStock, pagos, productos, usuarios, type UsuarioAutenticado } from "./esquema";
import { categoriasDemostracion, clientesDemostracion, CONTRASENA_DEMOSTRACION, productosDemostracion, usuariosDemostracion } from "./datos-demostracion";
import { crearUsuario } from "@/servicios/servicio-usuarios";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { crearProducto } from "@/servicios/servicio-productos";
import { crearCliente } from "@/servicios/servicio-clientes";
import { anularFactura, confirmarFactura } from "@/servicios/servicio-facturas";
import { registrarPagoCuentaCorriente } from "@/servicios/servicio-pagos";
import { esquemaContrasenaNueva } from "@/validaciones/validacion-autenticacion";
import { calcularPeriodosTablero } from "@/utilidades/fechas-tablero";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";

async function contarRegistros(baseDatos: TransaccionBaseDatos) {
  const filas = await baseDatos.all<{ tabla: string; cantidad: number }>(expresionSql`
    select 'usuarios' as tabla, count(*) as cantidad from usuarios union all
    select 'categorias', count(*) from categorias union all select 'productos', count(*) from productos union all
    select 'clientes', count(*) from clientes union all select 'facturas', count(*) from facturas union all
    select 'pagos', count(*) from pagos union all select 'factura_items', count(*) from factura_items union all
    select 'movimientos_stock', count(*) from movimientos_stock union all select 'movimientos_cuenta', count(*) from movimientos_cuenta
  `);
  return Object.fromEntries(filas.map((fila) => [fila.tabla, fila.cantidad]));
}

// Solo ajusta fechas de los registros recién creados en esta transacción; precios, stock y saldo siguen en servicios.
async function fecharFactura(baseDatos: TransaccionBaseDatos, id: number, fecha: string, anulacion = false) {
  await baseDatos.update(facturas).set(anulacion ? { fechaAnulacion: fecha } : { fecha }).where(igual(facturas.id, id));
  await baseDatos.update(movimientosStock).set({ fecha }).where(yLogico(igual(movimientosStock.facturaId, id), igual(movimientosStock.tipo, anulacion ? "anulacion" : "venta")));
  await baseDatos.update(movimientosCuenta).set({ fecha }).where(yLogico(igual(movimientosCuenta.facturaId, id), igual(movimientosCuenta.tipo, anulacion ? "credito" : "debito")));
}

// Implementa T12 y sección 10.7: demo atómica por servicios; repetir conserva los datos y nunca borra una base ocupada.
export async function cargarDatosDemostracion(baseDatos: BaseDatos, contrasenaSinValidar: unknown = CONTRASENA_DEMOSTRACION) {
  const password = esquemaContrasenaNueva.parse(contrasenaSinValidar);
  const referencia = new Date();
  const periodo = calcularPeriodosTablero(referencia);
  return ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
    const conteos = await contarRegistros(transaccion);
    if (Object.values(conteos).some((cantidad) => cantidad > 0)) {
      const correos = await transaccion.select({ id: usuarios.id }).from(usuarios).where(dentroDe(usuarios.email, usuariosDemostracion.map((usuario) => usuario.email)));
      const codigos = await transaccion.select({ id: productos.id }).from(productos).where(dentroDe(productos.codigo, productosDemostracion.map((producto) => producto.codigo)));
      const documentos = await transaccion.select({ id: clientes.id }).from(clientes).where(dentroDe(clientes.nroDoc, clientesDemostracion.map((cliente) => cliente.nroDoc)));
      if (correos.length !== 3 || codigos.length !== 30 || documentos.length !== 10 || conteos.categorias < 5 || conteos.facturas < 51 || conteos.pagos < 6) {
        throw new Error("La base contiene datos ajenos o una demo incompleta. Usá una base vacía dedicada a demostración; no se modificó ningún registro.");
      }
      return { creada: false, conteos };
    }

    // Los servicios usan consultas y transacciones anidadas (savepoints), disponibles también en esta transacción.
    const baseSemilla = transaccion as unknown as BaseDatos;
    const contextoInicial: UsuarioAutenticado = { id: 0, nombre: "Carga inicial de demo", email: "semilla@ferreteria.test", rol: "admin" };
    const admin = await crearUsuario(contextoInicial, { ...usuariosDemostracion[0], password }, baseSemilla);
    const vendedores = [];
    for (const datos of usuariosDemostracion.slice(1)) vendedores.push(await crearUsuario(admin, { ...datos, password }, baseSemilla));
    const categoriasCreadas = [];
    for (const nombre of categoriasDemostracion) categoriasCreadas.push(await crearCategoria(admin, { nombre }, baseSemilla));
    const productosCreados = [];
    for (const [indice, datos] of productosDemostracion.entries()) {
      const { categoria, ...producto } = datos;
      productosCreados.push(await crearProducto(admin, {
        ...producto, categoriaId: categoriasCreadas[categoria].id, stockMinimo: 5, stockInicial: indice < 4 ? indice : 40,
      }, baseSemilla));
    }
    const clientesCreados = [];
    for (const [indice, cliente] of clientesDemostracion.entries()) clientesCreados.push(await crearCliente(admin, {
      ...cliente, domicilio: `Calle de la Demo ${100 + indice}`, email: `cliente${indice + 1}@ferreteria.test`,
      cuentaCorriente: indice < 6, limiteCredito: indice < 3 ? 50000000 : null,
    }, baseSemilla));

    const fechaInicial = new Date(`${periodo.fechas[0]}T08:00:00-03:00`).toISOString();
    for (const tabla of [usuarios, categorias, productos, clientes]) await transaccion.update(tabla).set({ fechaCreacion: fechaInicial });
    await transaccion.update(movimientosStock).set({ fecha: fechaInicial });
    const indicesAnulacion = new Set([8, 25, 42]);
    const indicesPago = new Set([2, 11, 17, 29, 35, 47]);
    for (let indice = 0; indice < 51; indice += 1) {
      const dia = periodo.fechas[Math.floor(indice * 29 / 50)];
      const fecha = dia === periodo.hoy ? referencia.toISOString() : new Date(new Date(`${dia}T10:00:00-03:00`).getTime() + indice * 180000).toISOString();
      const cliente = clientesCreados[Math.floor(indice / 3) % 6];
      const forma = indice % 3;
      const factura = await confirmarFactura(vendedores[indice % vendedores.length], {
        clienteId: forma === 2 ? cliente.id : indice % 2 === 0 ? null : clientesCreados[indice % 10].id,
        items: [{ productoId: productosCreados[4 + indice % 26].id, cantidad: 1 + indice % 3 }],
        pago: forma === 0 ? { forma: "contado" } : forma === 1
          ? { forma: "tarjeta", tarjeta: { tipo: indice % 2 === 0 ? "debito" : "credito", marca: "Visa", ultimos4: "4242" } }
          : { forma: "cuenta_corriente" },
      }, baseSemilla);
      await fecharFactura(transaccion, factura.id, fecha);
      if (indicesPago.has(indice)) {
        const recibo = await registrarPagoCuentaCorriente(admin, { clienteId: cliente.id, pago: { importe: Math.floor(factura.total / 2), medio: "efectivo" } }, baseSemilla);
        const fechaPago = new Date(new Date(fecha).getTime() + 120000).toISOString();
        await transaccion.update(pagos).set({ fecha: fechaPago }).where(igual(pagos.id, recibo.id));
        await transaccion.update(movimientosCuenta).set({ fecha: fechaPago }).where(igual(movimientosCuenta.pagoId, recibo.id));
      }
      if (indicesAnulacion.has(indice)) {
        await anularFactura(admin, { id: factura.id, motivo: "Devolución de demostración" }, baseSemilla);
        await fecharFactura(transaccion, factura.id, new Date(new Date(fecha).getTime() + 60000).toISOString(), true);
      }
    }
    return { creada: true, conteos: await contarRegistros(transaccion) };
  });
}
