import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar } from "vitest";
import { clientes, facturas, movimientosCuenta, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { convertirErrorARespuestaHttp } from "@/errores/manejador-errores";
import {
  actualizarCliente, calcularSaldoCliente, crearCliente, listarClientes, obtenerClientePorId,
} from "@/servicios/servicio-clientes";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Clientes: alta, búsqueda, saldo y baja lógica", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;

  antesDeCadaPrueba(async () => {
    entorno = await crearBaseDatosPrueba();
    [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Administradora", email: "admin@prueba.test", rol: "admin", contrasenaHash: "no-se-usa" },
      { nombre: "Vendedor", email: "vendedor@prueba.test", rol: "vendedor", contrasenaHash: "no-se-usa" },
    ]).returning();
  });
  despuesDeCadaPrueba(() => entorno.cerrar());

  function datosCliente(cambios: Record<string, unknown> = {}) {
    return { tipoDoc: "DNI", nroDoc: "28.456.123", nombre: "Mariana López", ...cambios };
  }

  // Los movimientos de cuenta son los que escribirán T06 (pagos) y T08 (facturación).
  async function registrarMovimiento(clienteId: number, tipo: "debito" | "credito", importe: number) {
    const [factura] = await entorno.bd.insert(facturas).values({
      numero: Math.floor(Math.random() * 90000000) + 1, clienteId, usuarioId: admin.id,
      total: importe, formaPago: "cuenta_corriente",
    }).returning({ id: facturas.id });
    await entorno.bd.insert(movimientosCuenta).values({
      clienteId, facturaId: factura.id, tipo, importe, descripcion: `Movimiento de prueba ${tipo}`,
    });
    return factura.id;
  }

  probar("busca por nombre y por documento, con puntos o sin puntos", async () => {
    const cliente = await crearCliente(admin, datosCliente(), entorno.bd);
    await crearCliente(admin, datosCliente({ nroDoc: "30-71234567-9", nombre: "Ferretería Norte", tipoDoc: "CUIT" }), entorno.bd);

    for (const busqueda of ["28456123", "28.456.123", "mariana", "LÓPEZ"]) {
      const { data } = await listarClientes(vendedor, { q: busqueda }, entorno.bd);
      esperar(data.map((fila) => fila.id), `buscando "${busqueda}"`).toEqual([cliente.id]);
    }
    const { data: porCuit } = await listarClientes(vendedor, { q: "30712345679" }, entorno.bd);
    esperar(porCuit.map((fila) => fila.nombre)).toEqual(["Ferretería Norte"]);
  });

  probar("rechaza un documento repetido aunque venga escrito distinto", async () => {
    await crearCliente(admin, datosCliente(), entorno.bd);
    await esperar(crearCliente(admin, datosCliente({ nroDoc: "28456123", nombre: "Otra persona" }), entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 409, codigo: "DOCUMENTO_DUPLICADO" });
    // El mismo número con otro tipo de documento es otra persona y sí se admite.
    const cuit = await crearCliente(admin, datosCliente({ tipoDoc: "CUIT", nroDoc: "28456123", nombre: "Comercio" }), entorno.bd);
    esperar(cuit.tipoDoc).toBe("CUIT");
  });

  probar("calcula el saldo desde los movimientos y deriva el disponible del límite", async () => {
    const conLimite = await crearCliente(admin, datosCliente({ cuentaCorriente: true, limiteCredito: 40000000 }), entorno.bd);
    const sinLimite = await crearCliente(admin, datosCliente({ nroDoc: "27111222", nombre: "Juan Pérez", cuentaCorriente: true }), entorno.bd);
    esperar(conLimite.saldo).toBe(0);
    esperar(conLimite.disponible).toBe(40000000);
    esperar(sinLimite.disponible).toBeNull();

    await registrarMovimiento(conLimite.id, "debito", 2000000);
    await registrarMovimiento(conLimite.id, "credito", 560000);

    esperar(await calcularSaldoCliente(entorno.bd, conLimite.id)).toBe(1440000);
    const ficha = await obtenerClientePorId(vendedor, { id: conLimite.id }, entorno.bd);
    esperar(ficha.saldo).toBe(1440000);
    esperar(ficha.disponible).toBe(38560000);
    esperar(ficha.ultimasFacturas).toHaveLength(2);
    esperar(ficha.ultimasFacturas[0].numeroFormateado).toMatch(/^0001-\d{8}$/);
  });

  probar("lista solo los deudores y suma el total adeudado, ordenado de mayor a menor", async () => {
    const deudorChico = await crearCliente(admin, datosCliente({ nombre: "Ana Deuda Chica" }), entorno.bd);
    const deudorGrande = await crearCliente(admin, datosCliente({ nroDoc: "27111222", nombre: "Beto Deuda Grande" }), entorno.bd);
    await crearCliente(admin, datosCliente({ nroDoc: "26999888", nombre: "Carla Sin Deuda" }), entorno.bd);
    await registrarMovimiento(deudorChico.id, "debito", 500000);
    await registrarMovimiento(deudorGrande.id, "debito", 1500000);

    const listado = await listarClientes(vendedor, { conDeuda: "true", orden: "saldo" }, entorno.bd);
    esperar(listado.data.map((fila) => fila.nombre)).toEqual(["Beto Deuda Grande", "Ana Deuda Chica"]);
    esperar(listado.total).toBe(2);
    esperar(listado.totalAdeudado).toBe(2000000);

    const completo = await listarClientes(vendedor, {}, entorno.bd);
    esperar(completo.total).toBe(3);
    esperar(completo.totalAdeudado).toBeUndefined();
  });

  probar("no acepta campos no previstos como saldo, y la API responde 422 VALIDACION", async () => {
    const cliente = await crearCliente(admin, datosCliente(), entorno.bd);
    await esperar(actualizarCliente(admin, { id: cliente.id, cambios: { saldo: 0 } }, entorno.bd))
      .rejects.toMatchObject({ name: "ZodError" });
    await esperar(crearCliente(admin, datosCliente({ saldo: 1000 }), entorno.bd))
      .rejects.toMatchObject({ name: "ZodError" });

    // Criterio de aceptación 3: el rechazo tiene que llegar al cliente como 422 VALIDACION.
    const error = await actualizarCliente(admin, { id: cliente.id, cambios: { saldo: 0 } }, entorno.bd)
      .then(() => null, (falla: unknown) => falla);
    const respuesta = convertirErrorARespuestaHttp(error);
    esperar(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json() as { error: { code: string; details: { campo: string }[] } };
    esperar(cuerpo.error.code).toBe("VALIDACION");
    // El prefijo "cambios." viene del envoltorio { id, cambios }, igual que en productos (T03).
    esperar(cuerpo.error.details.map((detalle) => detalle.campo)).toContain("cambios.saldo");
  });

  probar("impide desactivar o quitar la cuenta corriente a un cliente con saldo", async () => {
    const cliente = await crearCliente(admin, datosCliente({ cuentaCorriente: true }), entorno.bd);
    await registrarMovimiento(cliente.id, "debito", 750000);

    for (const cambios of [{ activo: false }, { cuentaCorriente: false }]) {
      await esperar(actualizarCliente(admin, { id: cliente.id, cambios }, entorno.bd))
        .rejects.toMatchObject({ estadoHttp: 422, codigo: "SALDO_PENDIENTE" });
    }
    // Saldada la deuda, la baja lógica procede y el cliente sale del listado por defecto.
    await registrarMovimiento(cliente.id, "credito", 750000);
    const dadoDeBaja = await actualizarCliente(admin, { id: cliente.id, cambios: { activo: false } }, entorno.bd);
    esperar(dadoDeBaja.activo).toBe(false);
    esperar((await listarClientes(admin, {}, entorno.bd)).total).toBe(0);
    esperar((await listarClientes(admin, { activo: "todos" }, entorno.bd)).total).toBe(1);
  });

  probar("el vendedor también puede dar de alta y editar clientes", async () => {
    const creado = await crearCliente(vendedor, datosCliente(), entorno.bd);
    const editado = await actualizarCliente(vendedor, {
      id: creado.id, cambios: { telefono: "381 455-2210", domicilio: "Las Heras 455" },
    }, entorno.bd);
    esperar(editado.telefono).toBe("381 455-2210");
    esperar(editado.domicilio).toBe("Las Heras 455");
    // Un campo opcional enviado vacío se guarda como null, no como cadena vacía.
    esperar((await actualizarCliente(vendedor, { id: creado.id, cambios: { telefono: "" } }, entorno.bd)).telefono).toBeNull();
  });

  probar("devuelve NO_ENCONTRADO cuando el cliente no existe", async () => {
    await esperar(obtenerClientePorId(admin, { id: 999 }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 404, codigo: "NO_ENCONTRADO" });
    esperar(await entorno.bd.select().from(clientes)).toHaveLength(0);
  });
});
