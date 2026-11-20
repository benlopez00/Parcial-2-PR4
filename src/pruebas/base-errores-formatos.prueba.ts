import {
  describe as describir, it as probar, expect as esperar,
  beforeEach as antesDeCadaPrueba, afterEach as despuesDeCadaPrueba, vi as simulaciones,
} from "vitest";
import { z as esquemaZod } from "zod";
import {
  categorias, clientes, facturaItems, facturas, movimientosCuenta, movimientosStock,
  pagos, productos, usuarios, type UsuarioAutenticado,
} from "@/base-de-datos/esquema";
import { CODIGOS_ERROR } from "@/errores/codigos-error";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorARespuestaHttp, convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { asegurarRecursoExiste, asegurarRolAdmin, asegurarValorStockDentroDeRango } from "@/errores/verificadores-negocio";
import {
  formatearMoneda, pesosACentavos, formatearFecha, formatearHora, formatearFechaHora,
  formatearNumeroComprobante, formatearNumeroFactura, formatearNumeroRecibo, formatearCantidadConSigno, formatearImporteEditable,
} from "@/utilidades/formatos";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Formatos argentinos y conversión exacta de importes", () => {
  probar("cantidades con signo e importes editables conservan formato argentino y precisión", () => {
    esperar(formatearCantidadConSigno(1200)).toBe("+1.200");
    esperar(formatearCantidadConSigno(-2)).toBe("-2");
    esperar(formatearCantidadConSigno(0)).toBe("0");
    esperar(formatearImporteEditable(null)).toBe("");
    esperar(formatearImporteEditable(-1)).toBe("-0,01");
    esperar(formatearImporteEditable(1250000)).toBe("12500,00");
    esperar(pesosACentavos(formatearImporteEditable(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    esperar(() => formatearCantidadConSigno(1.2)).toThrow(RangeError);
    esperar(() => formatearImporteEditable(Infinity)).toThrow(RangeError);
    esperar(() => asegurarValorStockDentroDeRango(BigInt(Number.MAX_SAFE_INTEGER))).not.toThrow();
    esperar(() => asegurarValorStockDentroDeRango(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(ErrorApi);
  });
  probar.each([
    [1250000, "$ 12.500,00"], [0, "$ 0,00"], [1234550, "$ 12.345,50"],
    [1, "$ 0,01"], [-12345, "-$ 123,45"],
    [Number.MAX_SAFE_INTEGER, "$ 90.071.992.547.409,91"],
  ])("formatea %s centavos como %s", (centavos, resultado) => {
    esperar(formatearMoneda(centavos)).toBe(resultado);
  });

  probar.each([1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rechaza centavos inválidos: %s", (centavos) => {
    esperar(() => formatearMoneda(centavos)).toThrow(RangeError);
  });

  probar.each([
    [12500, 1250000], [0.29, 29], [1.01, 101], [0, 0], [-12.5, -1250],
    ["12.345,50", 1234550], ["12345.50", 1234550], ["12.500", 1250000],
    [" 0,01 ", 1], ["-0,00", 0], ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ])("convierte %s pesos a %s centavos sin redondeo binario", (pesos, resultado) => {
    esperar(pesosACentavos(pesos)).toBe(resultado);
  });

  probar.each(["", "1,234", "1.23,45", "abc", "$ 12,50", "90071992547409.92", 1.005, NaN, Infinity, 0.1 + 0.2])(
    "rechaza importes ambiguos, imprecisos o fuera de rango: %s", (pesos) => {
      esperar(() => pesosACentavos(pesos)).toThrow(RangeError);
    },
  );

  probar("convierte UTC a Argentina incluso cuando cambia el día y el año", () => {
    const fecha = "2026-01-01T01:05:00Z";
    esperar(formatearFecha(fecha)).toBe("31/12/2025");
    esperar(formatearHora(fecha)).toBe("22:05");
    esperar(formatearFechaHora(new Date(fecha))).toBe("31/12/2025 22:05");
  });

  probar("mantiene fechas calendario y muestra medianoche como 00:00", () => {
    esperar(formatearFecha("2026-11-16")).toBe("16/11/2026");
    esperar(formatearHora("2026-11-16T03:00:00Z")).toBe("00:00");
    esperar(() => formatearFecha("fecha inválida")).toThrow(RangeError);
  });

  probar("comparte numeración entre facturas, comprobantes y recibos", () => {
    esperar(formatearNumeroComprobante(1, 1)).toBe("0001-00000001");
    esperar(formatearNumeroFactura(1, 1233)).toBe("0001-00001233");
    esperar(formatearNumeroRecibo(1, 341)).toBe("R 0001-00000341");
    esperar(formatearNumeroFactura(9999, 99999999)).toBe("9999-99999999");
  });

  probar.each([[0, 1], [10000, 1], [1, 0], [1, 100000000], [1.5, 1], [1, NaN]])(
    "rechaza numeración inválida: %s / %s", (puntoVenta, numero) => {
      esperar(() => formatearNumeroComprobante(puntoVenta, numero)).toThrow(RangeError);
    },
  );
});

describir("Errores públicos y verificadores separados", () => {
  const administrador: UsuarioAutenticado = { id: 1, nombre: "Ana", email: "ana@prueba.test", rol: "admin" };

  probar("define exactamente los 22 códigos oficiales, sin duplicados", () => {
    esperar(Object.keys(CODIGOS_ERROR)).toHaveLength(22);
    esperar(new Set(Object.values(CODIGOS_ERROR)).size).toBe(22);
    for (const [clave, codigo] of Object.entries(CODIGOS_ERROR)) esperar(codigo).toBe(clave);
  });

  probar("ErrorApi conserva sus propiedades y se serializa igual para HTTP y acciones", async () => {
    const detalles = [{ productoId: 4, solicitado: 2, disponible: 1 }];
    const error = new ErrorApi(409, CODIGOS_ERROR.STOCK_INSUFICIENTE, "No hay existencia suficiente.", detalles);
    esperar(error).toBeInstanceOf(Error);
    esperar(error.name).toBe("ErrorApi");
    esperar(error.message).toBe(error.mensaje);
    esperar(error.detalles).toEqual(detalles);
    const respuesta = convertirErrorARespuestaHttp(error);
    esperar(respuesta.status).toBe(409);
    esperar(respuesta.headers.get("Content-Type")).toContain("application/json");
    const cuerpo = await respuesta.json();
    esperar(cuerpo).toEqual({ error: { code: "STOCK_INSUFICIENTE", message: error.mensaje, details: detalles } });
    esperar(convertirErrorAResultadoAccion(error)).toEqual({ ok: false, error: cuerpo.error });
  });

  probar("omite details cuando no hay detalles", async () => {
    const respuesta = convertirErrorARespuestaHttp(new ErrorApi(401, CODIGOS_ERROR.NO_AUTENTICADO, "Iniciá sesión."));
    esperar(respuesta.status).toBe(401);
    esperar(await respuesta.json()).toEqual({ error: { code: "NO_AUTENTICADO", message: "Iniciá sesión." } });
  });

  probar("convierte ZodError en 422 con rutas de campos anidados", async () => {
    const esquema = esquemaZod.object({
      items: esquemaZod.array(esquemaZod.object({ cantidad: esquemaZod.number().int().positive("Debe ser positiva.") }).strict()),
    }).strict();
    const resultado = esquema.safeParse({ items: [{ cantidad: 0 }] });
    esperar(resultado.success).toBe(false);
    if (resultado.success) throw new Error("Se esperaba un error de validación.");
    const respuesta = convertirErrorARespuestaHttp(resultado.error);
    esperar(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    esperar(cuerpo).toEqual({ error: {
      code: "VALIDACION", message: "Hay campos con errores.",
      details: [{ campo: "items.0.cantidad", mensaje: "Debe ser positiva." }],
    } });
    esperar(convertirErrorAResultadoAccion(resultado.error)).toEqual({ ok: false, error: cuerpo.error });
  });

  probar("identifica cada campo no previsto rechazado por strict", async () => {
    const resultado = esquemaZod.object({ codigo: esquemaZod.string() }).strict().safeParse({ codigo: "P1", existencia: 4 });
    if (resultado.success) throw new Error("Se esperaba el rechazo del campo existencia.");
    const respuesta = convertirErrorARespuestaHttp(resultado.error);
    esperar(respuesta.status).toBe(422);
    esperar((await respuesta.json()).error.details).toEqual([{ campo: "existencia", mensaje: esperar.any(String) }]);
  });

  probar("convierte JSON mal formado sin revelar el contenido recibido", async () => {
    let errorJson: unknown;
    try { JSON.parse('{"secreto":'); } catch (error) { errorJson = error; }
    const respuesta = convertirErrorARespuestaHttp(errorJson);
    esperar(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    esperar(cuerpo).toEqual({ error: { code: "JSON_INVALIDO", message: "El cuerpo no es JSON válido." } });
    esperar(convertirErrorAResultadoAccion(errorJson)).toEqual({ ok: false, error: cuerpo.error });
  });

  probar.each([new Error("token secreto y consulta SQL"), "fallo no tipado", null])(
    "registra fallos inesperados y responde 500 sin detalles internos", async (error) => {
      const registro = simulaciones.spyOn(console, "error").mockImplementation(() => {});
      const respuesta = convertirErrorARespuestaHttp(error);
      esperar(respuesta.status).toBe(500);
      const cuerpo = await respuesta.json();
      esperar(cuerpo).toEqual({ error: { code: "ERROR_INTERNO", message: "Ocurrió un error interno." } });
      esperar(registro).toHaveBeenCalledWith("Error inesperado en el servidor:", error);
      esperar(convertirErrorAResultadoAccion(error)).toEqual({ ok: false, error: cuerpo.error });
    },
  );

  probar("acepta administrador y rechaza vendedor con 403 SIN_PERMISO", () => {
    esperar(() => asegurarRolAdmin(administrador)).not.toThrow();
    esperar(() => asegurarRolAdmin({ ...administrador, rol: "vendedor" })).toThrowError(
      esperar.objectContaining({ estadoHttp: 403, codigo: "SIN_PERMISO" }),
    );
  });

  probar("distingue recursos ausentes de valores existentes", () => {
    for (const recurso of [null, undefined]) {
      esperar(() => asegurarRecursoExiste(recurso, "el producto")).toThrowError(
        esperar.objectContaining({ estadoHttp: 404, codigo: "NO_ENCONTRADO" }),
      );
    }
    for (const recurso of [0, false, "", { id: 1 }]) esperar(() => asegurarRecursoExiste(recurso, "el recurso")).not.toThrow();
  });
});

describir("Migraciones y restricciones de las nueve tablas", () => {
  let base: BaseDatosPrueba;

  antesDeCadaPrueba(async () => { base = await crearBaseDatosPrueba(); });
  despuesDeCadaPrueba(() => { base?.cerrar(); });

  async function prepararReferencias() {
    const [usuario] = await base.bd.insert(usuarios).values({ nombre: "Ana", email: "ana@prueba.test", contrasenaHash: "hash-de-prueba", rol: "admin" }).returning();
    const [categoria] = await base.bd.insert(categorias).values({ nombre: "Herramientas" }).returning();
    const [producto] = await base.bd.insert(productos).values({ codigo: "HE-001", descripcion: "Martillo", categoriaId: categoria.id, precio: 1250000 }).returning();
    const [cliente] = await base.bd.insert(clientes).values({ tipoDoc: "DNI", nroDoc: "28456123", nombre: "Mariana", cuentaCorriente: true }).returning();
    return { usuario, categoria, producto, cliente };
  }

  probar("aplica la migración real y crea las nueve tablas con id y fecha_creacion", async () => {
    const resultado = await base.cliente.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name");
    esperar(resultado.rows.map((fila) => fila.name)).toEqual([
      "categorias", "clientes", "factura_items", "facturas", "movimientos_cuenta", "movimientos_stock", "pagos", "productos", "usuarios",
    ]);
    for (const fila of resultado.rows) {
      const columnas = await base.cliente.execute(`PRAGMA table_info('${fila.name}')`);
      esperar(columnas.rows.map((columna) => columna.name)).toEqual(esperar.arrayContaining(["id", "fecha_creacion"]));
    }
    esperar((await base.cliente.execute("PRAGMA foreign_keys")).rows[0].foreign_keys).toBe(1);
    const { usuario, producto, cliente } = await prepararReferencias();
    esperar(usuario.fechaCreacion).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    esperar(usuario.activo).toBe(true);
    esperar(producto.existencia).toBe(0);
    esperar(cliente.limiteCredito).toBeNull();
    esperar(await base.cliente.execute("PRAGMA foreign_key_check")).toMatchObject({ rows: [] });
  });

  probar("declara todos los importes como INTEGER y no persiste el saldo calculado", async () => {
    const importesPorTabla: Record<string, string[]> = {
      productos: ["precio"], clientes: ["limite_credito"], facturas: ["total", "monto_recibido"],
      factura_items: ["precio_unitario", "subtotal"], pagos: ["importe"], movimientos_cuenta: ["importe"],
    };
    for (const [tabla, importes] of Object.entries(importesPorTabla)) {
      const columnas = (await base.cliente.execute(`PRAGMA table_info('${tabla}')`)).rows;
      for (const importe of importes) esperar(columnas.find((columna) => columna.name === importe)?.type).toBe("INTEGER");
      esperar(columnas.some((columna) => ["REAL", "FLOAT"].includes(String(columna.type)))).toBe(false);
      if (tabla === "clientes") esperar(columnas.some((columna) => columna.name === "saldo")).toBe(false);
    }
  });

  probar.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rechaza precios inválidos incluso sin Zod: %s", async (precio) => {
    const { categoria } = await prepararReferencias();
    await esperar(base.bd.insert(productos).values({ codigo: "OTRO", descripcion: "Inválido", categoriaId: categoria.id, precio })).rejects.toThrow();
  });

  probar("impide referencias huérfanas", async () => {
    await esperar(base.bd.insert(productos).values({ codigo: "P1", descripcion: "Sin categoría", categoriaId: 999, precio: 100 })).rejects.toThrow();
  });

  probar("impide duplicar email, categoría, código y documento", async () => {
    const { usuario, categoria, producto, cliente } = await prepararReferencias();
    await esperar(base.bd.insert(usuarios).values({ nombre: "Otro", email: usuario.email, contrasenaHash: "otro-hash", rol: "vendedor" })).rejects.toThrow();
    await esperar(base.bd.insert(categorias).values({ nombre: categoria.nombre })).rejects.toThrow();
    await esperar(base.bd.insert(productos).values({ codigo: producto.codigo, descripcion: "Otro", categoriaId: categoria.id, precio: 1 })).rejects.toThrow();
    await esperar(base.bd.insert(clientes).values({ tipoDoc: cliente.tipoDoc, nroDoc: cliente.nroDoc, nombre: "Otro" })).rejects.toThrow();
  });

  probar("mantiene numeraciones únicas e independientes para facturas y recibos", async () => {
    const { usuario, cliente } = await prepararReferencias();
    const factura = { usuarioId: usuario.id, clienteId: cliente.id, puntoVenta: 1, numero: 1, total: 100, formaPago: "contado" as const };
    const pago = { usuarioId: usuario.id, clienteId: cliente.id, puntoVenta: 1, numeroRecibo: 1, importe: 100, medio: "efectivo" as const };
    await base.bd.insert(facturas).values(factura);
    await base.bd.insert(pagos).values(pago);
    await esperar(base.bd.insert(facturas).values(factura)).rejects.toThrow();
    await esperar(base.bd.insert(pagos).values(pago)).rejects.toThrow();
    await esperar(base.bd.insert(facturas).values({ ...factura, puntoVenta: 2 })).resolves.toBeDefined();
  });

  probar("guarda solo cuatro dígitos de tarjeta y rechaza roles desconocidos", async () => {
    const { usuario } = await prepararReferencias();
    const factura = { usuarioId: usuario.id, numero: 1, total: 100, formaPago: "tarjeta" as const, tarjetaTipo: "debito" as const, tarjetaMarca: "Visa" };
    for (const tarjetaUltimos4 of ["1234567890123456", "123a"]) {
      await esperar(base.bd.insert(facturas).values({ ...factura, tarjetaUltimos4 })).rejects.toThrow();
    }
    await esperar(base.bd.insert(facturas).values({ ...factura, tarjetaUltimos4: "0001" })).resolves.toBeDefined();
    await esperar(base.cliente.execute("INSERT INTO usuarios (nombre, email, contrasena_hash, rol) VALUES ('Otro', 'otro@prueba.test', 'hash', 'superadmin')")).rejects.toThrow();
  });

  probar("rechaza movimientos de stock con signo incoherente y créditos sin origen o importe cero", async () => {
    const { usuario, producto, cliente } = await prepararReferencias();
    const [factura] = await base.bd.insert(facturas).values({ usuarioId: usuario.id, clienteId: cliente.id, numero: 1, total: 100, formaPago: "cuenta_corriente" }).returning();
    await esperar(base.bd.insert(movimientosStock).values({ productoId: producto.id, usuarioId: usuario.id, tipo: "egreso", cantidad: 1, existenciaResultante: 0, motivo: "Rotura" })).rejects.toThrow();
    await esperar(base.bd.insert(movimientosCuenta).values({ clienteId: cliente.id, tipo: "credito", importe: 100, descripcion: "Sin origen" })).rejects.toThrow();
    await esperar(base.bd.insert(movimientosCuenta).values({ clienteId: cliente.id, facturaId: factura.id, tipo: "debito", importe: 0, descripcion: "Importe cero" })).rejects.toThrow();
  });

  probar("revierte una operación compuesta cuando falla la segunda tabla", async () => {
    await esperar(base.bd.transaction(async (transaccion) => {
      const [categoria] = await transaccion.insert(categorias).values({ nombre: "Transitoria" }).returning();
      await transaccion.insert(productos).values({ codigo: "P1", descripcion: "Inválido", categoriaId: categoria.id, precio: -1 });
    })).rejects.toThrow();
    esperar(await base.bd.select().from(categorias)).toEqual([]);
    esperar(await base.bd.select().from(productos)).toEqual([]);
  });

  probar("permite insertar renglones con descripciones y precios históricos", async () => {
    const { usuario, producto } = await prepararReferencias();
    const [factura] = await base.bd.insert(facturas).values({ usuarioId: usuario.id, numero: 1, total: 1250000, formaPago: "contado" }).returning();
    const [renglon] = await base.bd.insert(facturaItems).values({ facturaId: factura.id, productoId: producto.id, codigo: producto.codigo, descripcion: producto.descripcion, cantidad: 1, precioUnitario: producto.precio, subtotal: producto.precio }).returning();
    esperar(renglon.descripcion).toBe("Martillo");
    esperar(renglon.precioUnitario).toBe(1250000);
  });

  probar("cada ayudante crea una base en memoria aislada", async () => {
    await prepararReferencias();
    const otraBase = await crearBaseDatosPrueba();
    try { esperar(await otraBase.bd.select().from(usuarios)).toEqual([]); }
    finally { otraBase.cerrar(); }
  });

  probar("la conexión de aplicación respeta DATABASE_URL y habilita claves foráneas", async () => {
    simulaciones.stubEnv("DATABASE_URL", ":memory:");
    const { clienteBaseDatos, bd } = await import("@/base-de-datos/conexion");
    try {
      esperar(bd.$client).toBe(clienteBaseDatos);
      esperar((await clienteBaseDatos.execute("PRAGMA foreign_keys")).rows[0].foreign_keys).toBe(1);
      esperar((await clienteBaseDatos.execute("SELECT name FROM sqlite_master WHERE name = 'usuarios'")).rows).toEqual([]);
    } finally { clienteBaseDatos.close(); }
  });
});
