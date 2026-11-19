import { afterEach as despuesDeCadaPrueba, describe as describir, expect as esperar, it as probar } from "vitest";
import { eq as igual } from "drizzle-orm";
import { clientes, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { crearCliente } from "@/servicios/servicio-clientes";
import { confirmarFactura, obtenerOpcionesListadoFacturas } from "@/servicios/servicio-facturas";
import { crearProducto } from "@/servicios/servicio-productos";
import { construirUrlFacturas, leerConsultaFacturas } from "@/utilidades/consultas-facturas";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Filtros URL de facturas", () => {
  probar("vacíos y todos conservan los valores por defecto", () => {
    esperar(leerConsultaFacturas({ q: "", desde: "", hasta: "", clienteId: "todos", vendedorId: "", forma: "todos", estado: "todos" }))
      .toEqual({ q: "", page: 1, pageSize: 20 });
  });
  probar("recargar una URL conserva los siete filtros y la página", () => {
    esperar(leerConsultaFacturas({ q: "  Mariana  ", desde: "2026-11-01", hasta: "2026-11-18", clienteId: "2", vendedorId: "4", forma: "cuenta_corriente", estado: "anulada", page: "3", pageSize: "10" }))
      .toEqual({ q: "Mariana", desde: "2026-11-01", hasta: "2026-11-18", clienteId: 2, vendedorId: 4, forma: "cuenta_corriente", estado: "anulada", page: 3, pageSize: 10 });
  });
  probar("parámetros repetidos toman el primer valor", () => {
    esperar(leerConsultaFacturas({ q: ["0001-00000001", "otra"], page: ["2", "9"] })).toMatchObject({ q: "0001-00000001", page: 2 });
  });
  probar.each([
    { desde: "2026-11-19", hasta: "2026-11-18" }, { desde: "2026-02-30" },
    { clienteId: "0" }, { vendedorId: "abc" }, { forma: "transferencia" }, { estado: "borrador" },
    { page: "-1" }, { pageSize: "101" }, { inesperado: "dato" },
  ])("rechaza filtros inválidos: %j", (datos) => {
    esperar(() => leerConsultaFacturas(datos)).toThrow();
  });
  probar("paginar conserva todos los filtros", () => {
    const actual = new URLSearchParams("q=Mariana&desde=2026-11-01&hasta=2026-11-18&clienteId=2&vendedorId=4&forma=contado&estado=emitida&pageSize=10&page=1");
    const destino = new URL(construirUrlFacturas(actual, { page: 2 }), "http://localhost");
    esperar(leerConsultaFacturas(Object.fromEntries(destino.searchParams))).toMatchObject({ q: "Mariana", clienteId: 2, vendedorId: 4, forma: "contado", estado: "emitida", page: 2, pageSize: 10 });
    esperar(actual.get("page")).toBe("1");
  });
  probar.each(["q", "desde", "hasta", "clienteId", "vendedorId", "forma", "estado", "pageSize"])("cambiar %s reinicia página", (campo) => {
    const destino = new URL(construirUrlFacturas(new URLSearchParams("page=8&estado=emitida"), { [campo]: "nuevo" }), "http://localhost");
    esperar(destino.searchParams.has("page")).toBe(false);
  });
  probar("limpiar elimina selectores y conserva una búsqueda con caracteres especiales", () => {
    const url = construirUrlFacturas(new URLSearchParams("page=3&forma=tarjeta&clienteId=2"), { forma: "todos", clienteId: null, q: "Peña & hijos #2" });
    esperar(Object.fromEntries(new URL(url, "http://localhost").searchParams)).toEqual({ q: "Peña & hijos #2" });
    esperar(construirUrlFacturas(new URLSearchParams(), { q: "", estado: "todos" })).toBe("/ventas");
  });
});

describir("Opciones históricas del listado para ambos roles", () => {
  let entorno: BaseDatosPrueba | undefined;
  despuesDeCadaPrueba(() => entorno?.cerrar());
  probar("incluye inactivos con facturas, sin duplicados ni datos privados", async () => {
    entorno = await crearBaseDatosPrueba();
    const [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Laura", email: "admin@prueba.test", rol: "admin", contrasenaHash: "privado" },
      { nombre: "Pablo", email: "vendedor@prueba.test", rol: "vendedor", contrasenaHash: "privado" },
      { nombre: "Sin ventas", email: "nuevo@prueba.test", rol: "vendedor", contrasenaHash: "privado" },
    ]).returning();
    const categoria = await crearCategoria(admin, { nombre: "Herramientas" }, entorno.bd);
    const producto = await crearProducto(admin, { codigo: "T10-01", descripcion: "Martillo", categoriaId: categoria.id, precio: 101, stockMinimo: 0, stockInicial: 4 }, entorno.bd);
    const cliente = await crearCliente(admin, { nombre: "Mariana", tipoDoc: "DNI", nroDoc: "28000101" }, entorno.bd);
    const emitir = (usuario: UsuarioAutenticado) => confirmarFactura(usuario, { clienteId: cliente.id, items: [{ productoId: producto.id, cantidad: 1 }], pago: { forma: "contado" } }, entorno!.bd);
    await emitir(admin); await emitir(vendedor); await emitir(vendedor);
    await entorno.bd.update(usuarios).set({ activo: false }).where(igual(usuarios.id, admin.id));
    await entorno.bd.update(clientes).set({ activo: false }).where(igual(clientes.id, cliente.id));
    esperar(await obtenerOpcionesListadoFacturas(vendedor, {}, entorno.bd)).toEqual({
      clientes: [{ id: cliente.id, nombre: "Mariana" }],
      vendedores: [{ id: admin.id, nombre: "Laura" }, { id: vendedor.id, nombre: "Pablo" }],
    });
    await esperar(obtenerOpcionesListadoFacturas(null as unknown as UsuarioAutenticado, {}, entorno.bd)).rejects.toMatchObject({ codigo: "NO_AUTENTICADO" });
    await esperar(obtenerOpcionesListadoFacturas(vendedor, { inesperado: true }, entorno.bd)).rejects.toThrow();
  });
});
