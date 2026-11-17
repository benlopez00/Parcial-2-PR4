import { and as yLogico, asc as ascendente, count as contar, desc as descendente, eq as igual, ne as distinto, or as oLogico, sql as expresionSql, type SQL as ExpresionSql } from "drizzle-orm";
import { bd, type BaseDatos, type TransaccionBaseDatos } from "@/base-de-datos/conexion";
import { clientes, facturas, movimientosCuenta, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarClienteSinSaldoPendiente, asegurarDocumentoClienteUnico, asegurarRecursoExiste,
  asegurarUsuarioAutenticado, traducirErrorEscrituraCliente,
} from "@/errores/verificadores-negocio";
import {
  esquemaActualizarCliente, esquemaCrearCliente, esquemaListadoClientes, esquemaObtenerCliente,
} from "@/validaciones/validacion-clientes";
import { normalizarDocumento } from "@/utilidades/documentos";
import { formatearNumeroFactura } from "@/utilidades/formatos";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";

export interface ClientePublico {
  id: number; tipoDoc: "DNI" | "CUIT"; nroDoc: string; nombre: string;
  domicilio: string | null; telefono: string | null; email: string | null;
  cuentaCorriente: boolean; limiteCredito: number | null;
  saldo: number; disponible: number | null; activo: boolean;
}
export interface ListadoClientes {
  data: ClientePublico[]; page: number; pageSize: number; total: number; totalAdeudado?: number;
}
export interface ResumenFactura {
  id: number; numeroFormateado: string; fecha: string; total: number;
  estado: "emitida" | "anulada"; formaPago: "contado" | "tarjeta" | "cuenta_corriente";
}
export interface FichaCliente extends ClientePublico { ultimasFacturas: ResumenFactura[] }

// Regla 7: el saldo es débitos menos créditos. La tabla clientes NO guarda el saldo.
// Las columnas van calificadas a mano: en una subconsulta correlacionada, un nombre
// suelto como "id" lo resolvería SQLite contra movimientos_cuenta y no contra clientes.
const saldoSql = expresionSql<number>`(
  select coalesce(sum(case when mc.tipo = 'debito' then mc.importe else -mc.importe end), 0)
  from movimientos_cuenta as mc where mc.cliente_id = clientes.id
)`.mapWith(Number);

// Implementa RF-C1: compara documentos ignorando puntos, guiones y espacios.
const documentoNormalizadoSql = expresionSql`replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '')`;

const columnasCliente = {
  id: clientes.id, tipoDoc: clientes.tipoDoc, nroDoc: clientes.nroDoc, nombre: clientes.nombre,
  domicilio: clientes.domicilio, telefono: clientes.telefono, email: clientes.email,
  cuentaCorriente: clientes.cuentaCorriente, limiteCredito: clientes.limiteCredito,
  activo: clientes.activo, saldo: saldoSql,
};

// Implementa RF-C3: el crédito disponible se deriva del límite; sin límite no hay tope.
function agregarDisponible(fila: Omit<ClientePublico, "disponible">): ClientePublico {
  return { ...fila, disponible: fila.limiteCredito === null ? null : fila.limiteCredito - fila.saldo };
}

// Implementa RF-C1: la búsqueda contempla mayúsculas y caracteres castellanos.
function minusculasSql(columna: typeof clientes.nombre): ExpresionSql {
  return expresionSql`replace(replace(replace(replace(replace(replace(replace(lower(${columna}), 'Á', 'á'), 'É', 'é'), 'Í', 'í'), 'Ó', 'ó'), 'Ú', 'ú'), 'Ü', 'ü'), 'Ñ', 'ñ')`;
}

// Implementa RF-C1: una sola caja busca por nombre o por documento, con o sin puntos.
function construirFiltroBusquedaClientes(busqueda: string): ExpresionSql | undefined {
  if (!busqueda) return undefined;
  const escapar = (texto: string) => texto.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
  const patronNombre = `%${escapar(busqueda.toLowerCase())}%`;
  const condiciones: ExpresionSql[] = [
    expresionSql`${minusculasSql(clientes.nombre)} LIKE ${patronNombre} ESCAPE '\\'`,
  ];
  const documento = normalizarDocumento(busqueda);
  if (documento !== "") {
    condiciones.push(expresionSql`${documentoNormalizadoSql} LIKE ${`%${documento}%`}`);
  }
  return oLogico(...condiciones);
}

// Regla 7: única fuente de verdad del saldo, compartida con T06 (pagos) y T08 (facturación).
export async function calcularSaldoCliente(
  baseDatos: BaseDatos | TransaccionBaseDatos,
  clienteId: number,
): Promise<number> {
  const [fila] = await baseDatos.select({
    saldo: expresionSql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`.mapWith(Number),
  }).from(movimientosCuenta).where(igual(movimientosCuenta.clienteId, clienteId));
  return fila?.saldo ?? 0;
}

// Implementa RF-C1 y RF-C6: listado con saldo, búsqueda, deuda, orden y paginación. Ambos roles.
export async function listarClientes(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ListadoClientes> {
  const consulta = esquemaListadoClientes.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const filtro = yLogico(
    construirFiltroBusquedaClientes(consulta.q),
    consulta.activo === "todos" ? undefined : igual(clientes.activo, consulta.activo === "true"),
    consulta.conDeuda === "true" ? expresionSql`${saldoSql} > 0` : undefined,
  );

  const [{ total }] = await baseDatos.select({ total: contar() }).from(clientes).where(filtro);
  const filas = await baseDatos.select(columnasCliente).from(clientes).where(filtro)
    .orderBy(consulta.orden === "saldo" ? descendente(saldoSql) : ascendente(clientes.nombre), ascendente(clientes.id))
    .limit(consulta.pageSize).offset((consulta.page - 1) * consulta.pageSize);

  const listado: ListadoClientes = {
    data: filas.map(agregarDisponible), page: consulta.page, pageSize: consulta.pageSize, total,
  };
  if (consulta.conDeuda === "true") {
    const [{ totalAdeudado }] = await baseDatos
      .select({ totalAdeudado: expresionSql<number>`coalesce(sum(${saldoSql}), 0)`.mapWith(Number) })
      .from(clientes).where(filtro);
    listado.totalAdeudado = totalAdeudado;
  }
  return listado;
}

// Implementa RF-C3: ficha con saldo, disponible y las 6 últimas facturas del cliente.
export async function obtenerClientePorId(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<FichaCliente> {
  const { id } = esquemaObtenerCliente.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const [fila] = await baseDatos.select(columnasCliente).from(clientes).where(igual(clientes.id, id)).limit(1);
  asegurarRecursoExiste(fila, "el cliente");

  const ultimas = await baseDatos.select({
    id: facturas.id, puntoVenta: facturas.puntoVenta, numero: facturas.numero, fecha: facturas.fecha,
    total: facturas.total, estado: facturas.estado, formaPago: facturas.formaPago,
  }).from(facturas).where(igual(facturas.clienteId, id))
    .orderBy(descendente(facturas.fecha), descendente(facturas.id)).limit(6);

  return {
    ...agregarDisponible(fila),
    ultimasFacturas: ultimas.map(({ puntoVenta, numero, ...resto }) => ({
      ...resto, numeroFormateado: formatearNumeroFactura(puntoVenta, numero),
    })),
  };
}

// Implementa RF-C2 y RF-V2: alta de cliente, también desde el modal de Nueva venta. Ambos roles.
export async function crearCliente(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ClientePublico> {
  const entrada = esquemaCrearCliente.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [existente] = await transaccion.select({ id: clientes.id }).from(clientes)
        .where(yLogico(
          igual(clientes.tipoDoc, entrada.tipoDoc),
          igual(documentoNormalizadoSql, normalizarDocumento(entrada.nroDoc)),
        )).limit(1);
      asegurarDocumentoClienteUnico(Boolean(existente));
      const [creado] = await transaccion.insert(clientes).values(entrada).returning({ id: clientes.id });
      const [fila] = await transaccion.select(columnasCliente).from(clientes).where(igual(clientes.id, creado.id));
      return agregarDisponible(fila);
    });
  } catch (error) { traducirErrorEscrituraCliente(error); }
}

// Implementa RF-C2 y RF-C7: edición y baja lógica, bloqueadas si el cliente tiene saldo.
export async function actualizarCliente(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ClientePublico> {
  const { id, cambios } = esquemaActualizarCliente.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  try {
    return await ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
      const [actual] = await transaccion.select().from(clientes).where(igual(clientes.id, id)).limit(1);
      asegurarRecursoExiste(actual, "el cliente");

      if (cambios.activo === false || cambios.cuentaCorriente === false) {
        asegurarClienteSinSaldoPendiente(await calcularSaldoCliente(transaccion, id));
      }
      if (cambios.nroDoc !== undefined || cambios.tipoDoc !== undefined) {
        const [otro] = await transaccion.select({ id: clientes.id }).from(clientes)
          .where(yLogico(
            igual(clientes.tipoDoc, cambios.tipoDoc ?? actual.tipoDoc),
            igual(documentoNormalizadoSql, normalizarDocumento(cambios.nroDoc ?? actual.nroDoc)),
            distinto(clientes.id, id),
          )).limit(1);
        asegurarDocumentoClienteUnico(Boolean(otro));
      }
      await transaccion.update(clientes).set(cambios).where(igual(clientes.id, id));
      const [fila] = await transaccion.select(columnasCliente).from(clientes).where(igual(clientes.id, id));
      return agregarDisponible(fila);
    });
  } catch (error) { traducirErrorEscrituraCliente(error); }
}
