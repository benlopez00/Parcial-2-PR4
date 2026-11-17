import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { convertirErrorARespuestaHttp } from "@/errores/manejador-errores";
import { obtenerUsuarioActual } from "./sesion";

export interface ContextoNextRuta {
  params: Promise<Record<string, string | string[] | undefined>>;
}

export interface SolicitudRutaProtegida {
  usuarioActual: UsuarioAutenticado;
  cuerpo: unknown;
  parametros: Record<string, string>;
  consulta: Record<string, string>;
  peticion: Request;
}

export interface SolicitudRutaPublica {
  cuerpo: unknown;
  parametros: Record<string, string>;
  consulta: Record<string, string>;
  peticion: Request;
}

export interface OpcionesRuta {
  requiereSesion?: boolean;
  estadoExito?: number;
  leeCuerpo?: boolean;
}

export type OperacionRutaProtegida<Datos> = (solicitud: SolicitudRutaProtegida) => Promise<Datos>;
export type OperacionRutaPublica<Datos> = (solicitud: SolicitudRutaPublica) => Promise<Datos>;
export type ManejadorRuta = (peticion: Request, contexto: ContextoNextRuta) => Promise<Response>;

function normalizarParametros(
  crudos: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  if (!crudos) {
    return resultado;
  }
  for (const [clave, valor] of Object.entries(crudos)) {
    if (typeof valor === "string") {
      resultado[clave] = valor;
    } else if (Array.isArray(valor) && valor.length > 0) {
      resultado[clave] = valor[0];
    }
  }
  return resultado;
}

function extraerConsulta(urlTexto: string): Record<string, string> {
  const url = new URL(urlTexto);
  const consulta: Record<string, string> = {};
  for (const [clave, valor] of url.searchParams.entries()) {
    consulta[clave] = valor;
  }
  return consulta;
}

export function envoltorioRuta<Datos>(
  operacion: OperacionRutaPublica<Datos>,
  opciones: OpcionesRuta & { requiereSesion: false },
): ManejadorRuta;
export function envoltorioRuta<Datos>(
  operacion: OperacionRutaProtegida<Datos>,
  opciones?: OpcionesRuta & { requiereSesion?: true },
): ManejadorRuta;
export function envoltorioRuta<Datos>(
  operacion: OperacionRutaProtegida<Datos> | OperacionRutaPublica<Datos>,
  opciones: OpcionesRuta = {},
): ManejadorRuta {
  const { requiereSesion = true, estadoExito = 200, leeCuerpo = false } = opciones;

  return async (peticion: Request, contexto: ContextoNextRuta): Promise<Response> => {
    try {
      const usuarioActual = requiereSesion ? await obtenerUsuarioActual() : undefined;
      const parametros = normalizarParametros(await contexto.params);
      const consulta = extraerConsulta(peticion.url);
      const cuerpo: unknown = leeCuerpo ? await peticion.json() : {};

      let datos: Datos;
      if (usuarioActual !== undefined) {
        datos = await (operacion as OperacionRutaProtegida<Datos>)({
          usuarioActual,
          cuerpo,
          parametros,
          consulta,
          peticion,
        });
      } else {
        datos = await (operacion as OperacionRutaPublica<Datos>)({
          cuerpo,
          parametros,
          consulta,
          peticion,
        });
      }

      if (estadoExito === 204) {
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      }

      return Response.json(datos, {
        status: estadoExito,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      return convertirErrorARespuestaHttp(error);
    }
  };
}
