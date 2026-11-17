"use client";

import * as React from "react";
import { usePathname as usarRutaActual, useRouter as usarEnrutador } from "next/navigation";
import { CheckCircle2, KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { actualizarUsuarioAccion } from "@/app/(sistema)/usuarios/acciones";
import { DialogoConfirmacion } from "@/componentes/estados/dialogo-confirmacion";
import { EstadoCarga } from "@/componentes/estados/estado-carga";
import { EstadoError } from "@/componentes/estados/estado-error";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import { Alerta, AlertaDescripcion } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";
import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
} from "@/componentes/interfaz/tabla";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { ListadoUsuarios, UsuarioPublico } from "@/servicios/servicio-usuarios";
import { combinarEstilos } from "@/utilidades/clases";
import { formatearFecha } from "@/utilidades/formatos";
import { DialogoRestablecerContrasena } from "./dialogo-restablecer-contrasena";
import { DialogoUsuario } from "./dialogo-usuario";
import { FiltrosUsuarios, type FiltroEstadoUsuario } from "./filtros-usuarios";

export interface PropiedadesListadoUsuarios {
  listadoInicial: ListadoUsuarios;
  usuarioActualId: number;
  busquedaInicial: string;
  estadoInicial: FiltroEstadoUsuario;
}

function construirParametrosUrl(
  q: string,
  activo: FiltroEstadoUsuario,
  page: number,
  pageSize: number,
): URLSearchParams {
  const parametros = new URLSearchParams();
  if (q.trim().length > 0) {
    parametros.set("q", q.trim());
  }
  if (activo !== "todos") {
    parametros.set("activo", activo);
  }
  if (page > 1) {
    parametros.set("page", String(page));
  }
  if (pageSize !== 20) {
    parametros.set("pageSize", String(pageSize));
  }
  return parametros;
}

export function ListadoUsuarios({
  listadoInicial,
  usuarioActualId,
  busquedaInicial,
  estadoInicial,
}: PropiedadesListadoUsuarios) {
  const enrutador = usarEnrutador();
  const rutaActual = usarRutaActual();

  const [listado, setListado] = React.useState<ListadoUsuarios>(listadoInicial);
  const [busqueda, setBusqueda] = React.useState(busquedaInicial);
  const [estado, setEstado] = React.useState<FiltroEstadoUsuario>(estadoInicial);
  const [cargando, setCargando] = React.useState(false);
  const [errorCarga, setErrorCarga] = React.useState<string | null>(null);
  const [avisoExito, setAvisoExito] = React.useState<string | null>(null);
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null);

  const [dialogoUsuarioAbierto, setDialogoUsuarioAbierto] = React.useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = React.useState<UsuarioPublico | null>(null);
  const [usuarioParaRestablecer, setUsuarioParaRestablecer] = React.useState<UsuarioPublico | null>(null);
  const [usuarioParaCambiarEstado, setUsuarioParaCambiarEstado] = React.useState<UsuarioPublico | null>(
    null,
  );
  const [cambiandoEstado, setCambiandoEstado] = React.useState(false);

  const controladorRef = React.useRef<AbortController | null>(null);
  const esPrimerRenderRef = React.useRef(true);

  React.useEffect(() => {
    setListado(listadoInicial);
  }, [listadoInicial]);

  const consultarListado = React.useCallback(
    async (
      nuevaBusqueda: string,
      nuevoEstado: FiltroEstadoUsuario,
      nuevaPagina: number,
      actualizarUrl: boolean,
    ) => {
      controladorRef.current?.abort();
      const controlador = new AbortController();
      controladorRef.current = controlador;

      const parametros = construirParametrosUrl(
        nuevaBusqueda,
        nuevoEstado,
        nuevaPagina,
        listadoInicial.pageSize,
      );
      const cadenaConsulta = parametros.toString();
      if (actualizarUrl) {
        enrutador.replace(cadenaConsulta ? `${rutaActual}?${cadenaConsulta}` : rutaActual, {
          scroll: false,
        });
      }

      setCargando(true);
      setErrorCarga(null);
      try {
        const respuesta = await fetch(
          cadenaConsulta ? `/api/usuarios?${cadenaConsulta}` : "/api/usuarios",
          {
            method: "GET",
            cache: "no-store",
            signal: controlador.signal,
          },
        );
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(cuerpo?.error?.message ?? "No pudimos obtener el listado de usuarios.");
        }
        const datos = (await respuesta.json()) as ListadoUsuarios;
        setListado(datos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorCarga(
          error instanceof Error ? error.message : "No pudimos obtener el listado de usuarios.",
        );
      } finally {
        if (controladorRef.current === controlador) {
          setCargando(false);
        }
      }
    },
    [enrutador, rutaActual, listadoInicial.pageSize],
  );

  React.useEffect(() => {
    if (esPrimerRenderRef.current) {
      esPrimerRenderRef.current = false;
      return;
    }
    const temporizador = window.setTimeout(() => {
      void consultarListado(busqueda, estado, 1, true);
    }, 220);
    return () => window.clearTimeout(temporizador);
  }, [busqueda, estado, consultarListado]);

  async function confirmarCambioEstado() {
    if (!usuarioParaCambiarEstado || cambiandoEstado) {
      return;
    }
    setCambiandoEstado(true);
    setErrorAccion(null);
    setAvisoExito(null);
    try {
      const nuevoActivo = !usuarioParaCambiarEstado.activo;
      const resultado = await actualizarUsuarioAccion({
        id: usuarioParaCambiarEstado.id,
        cambios: { activo: nuevoActivo },
      });
      if (!resultado.ok) {
        setErrorAccion(resultado.error.message);
        setUsuarioParaCambiarEstado(null);
        return;
      }
      setAvisoExito(
        nuevoActivo
          ? `Se reactivó a ${resultado.datos.nombre}.`
          : `Se desactivó a ${resultado.datos.nombre}.`,
      );
      setUsuarioParaCambiarEstado(null);
      await consultarListado(busqueda, estado, listado.page, false);
    } finally {
      setCambiandoEstado(false);
    }
  }

  function abrirCreacion() {
    setAvisoExito(null);
    setErrorAccion(null);
    setUsuarioEnEdicion(null);
    setDialogoUsuarioAbierto(true);
  }

  function abrirEdicion(usuario: UsuarioPublico) {
    setAvisoExito(null);
    setErrorAccion(null);
    setUsuarioEnEdicion(usuario);
    setDialogoUsuarioAbierto(true);
  }

  return (
    <ContenedorPagina>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Quiénes pueden entrar al sistema y con qué rol."
        acciones={
          <Boton type="button" onClick={abrirCreacion}>
            <Plus className="size-4" />
            <span>Nuevo usuario</span>
          </Boton>
        }
      />

      <div className="space-y-4">
        {avisoExito ? (
          <Alerta variant="success" role="status">
            <CheckCircle2 className="size-4" />
            <AlertaDescripcion>{avisoExito}</AlertaDescripcion>
          </Alerta>
        ) : null}

        {errorAccion ? (
          <Alerta variant="destructive">
            <AlertaDescripcion>{errorAccion}</AlertaDescripcion>
          </Alerta>
        ) : null}

        <Tarjeta className="overflow-hidden">
          <div className="border-b">
            <FiltrosUsuarios
              busqueda={busqueda}
              estado={estado}
              alCambiarBusqueda={(valor) => setBusqueda(valor)}
              alCambiarEstado={(valor) => setEstado(valor)}
            />
          </div>

          {cargando ? (
            <div className="p-4">
              <EstadoCarga filas={4} mensaje="Cargando usuarios..." />
            </div>
          ) : errorCarga ? (
            <div className="p-4">
              <EstadoError
                mensaje={errorCarga}
                alReintentar={() => void consultarListado(busqueda, estado, listado.page, false)}
              />
            </div>
          ) : listado.data.length === 0 ? (
            <div className="p-4">
              <EstadoVacio
                titulo="No encontramos usuarios"
                descripcion="Probá cambiando la búsqueda o el filtro de estado."
                accion={
                  busqueda || estado !== "todos" ? (
                    <Boton
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBusqueda("");
                        setEstado("todos");
                      }}
                    >
                      Limpiar filtros
                    </Boton>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <Tabla>
                <TablaEncabezado>
                  <TablaFila className="hover:bg-transparent">
                    <TablaCeldaEncabezado>Nombre</TablaCeldaEncabezado>
                    <TablaCeldaEncabezado>Email</TablaCeldaEncabezado>
                    <TablaCeldaEncabezado>Rol</TablaCeldaEncabezado>
                    <TablaCeldaEncabezado>Estado</TablaCeldaEncabezado>
                    <TablaCeldaEncabezado>Alta</TablaCeldaEncabezado>
                    <TablaCeldaEncabezado className="text-right">Acciones</TablaCeldaEncabezado>
                  </TablaFila>
                </TablaEncabezado>
                <TablaCuerpo>
                  {listado.data.map((usuario) => {
                    const esPropio = usuario.id === usuarioActualId;
                    const inactivo = !usuario.activo;
                    return (
                      <TablaFila
                        key={usuario.id}
                        className={combinarEstilos(inactivo && "text-muted-foreground")}
                      >
                        <TablaCelda className="font-medium">
                          <span>{usuario.nombre}</span>
                          {esPropio ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (vos)
                            </span>
                          ) : null}
                        </TablaCelda>
                        <TablaCelda>{usuario.email}</TablaCelda>
                        <TablaCelda>
                          <InsigniaEstado tipo={usuario.rol} />
                        </TablaCelda>
                        <TablaCelda>
                          <InsigniaEstado tipo={usuario.activo ? "activo" : "inactivo"} />
                        </TablaCelda>
                        <TablaCelda className="tabular-nums">
                          {formatearFecha(usuario.fechaCreacion)}
                        </TablaCelda>
                        <TablaCelda>
                          <div className="flex items-center justify-end gap-1">
                            <Boton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirEdicion(usuario)}
                            >
                              <Pencil className="size-3.5" />
                              <span>Editar</span>
                            </Boton>
                            <Boton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUsuarioParaRestablecer(usuario)}
                            >
                              <KeyRound className="size-3.5" />
                              <span>Restablecer</span>
                            </Boton>
                            {!esPropio ? (
                              <Boton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setUsuarioParaCambiarEstado(usuario)}
                              >
                                {usuario.activo ? (
                                  <>
                                    <UserX className="size-3.5" />
                                    <span>Desactivar</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="size-3.5" />
                                    <span>Reactivar</span>
                                  </>
                                )}
                              </Boton>
                            ) : null}
                          </div>
                        </TablaCelda>
                      </TablaFila>
                    );
                  })}
                </TablaCuerpo>
              </Tabla>

              <PaginadorListado
                pagina={listado.page}
                tamanoPagina={listado.pageSize}
                total={listado.total}
                etiquetaElemento="usuarios"
                alCambiarPagina={(nuevaPagina) =>
                  void consultarListado(busqueda, estado, nuevaPagina, true)
                }
              />
            </>
          )}
        </Tarjeta>
      </div>

      <DialogoUsuario
        abierto={dialogoUsuarioAbierto}
        alCambiarAbierto={setDialogoUsuarioAbierto}
        usuarioAEditar={usuarioEnEdicion}
        esUsuarioActual={usuarioEnEdicion?.id === usuarioActualId}
        alGuardar={(usuarioGuardado, modo) => {
          setAvisoExito(
            modo === "crear"
              ? `Usuario ${usuarioGuardado.nombre} creado.`
              : `Usuario ${usuarioGuardado.nombre} actualizado.`,
          );
          void consultarListado(busqueda, estado, listado.page, false);
        }}
      />

      <DialogoRestablecerContrasena
        usuario={usuarioParaRestablecer}
        alCerrar={() => setUsuarioParaRestablecer(null)}
      />

      <DialogoConfirmacion
        abierto={Boolean(usuarioParaCambiarEstado)}
        alCambiarAbierto={(abierto) => {
          if (!abierto) {
            setUsuarioParaCambiarEstado(null);
          }
        }}
        titulo={
          usuarioParaCambiarEstado?.activo
            ? `¿Desactivar a ${usuarioParaCambiarEstado.nombre}?`
            : `¿Reactivar a ${usuarioParaCambiarEstado?.nombre ?? ""}?`
        }
        descripcion={
          usuarioParaCambiarEstado?.activo
            ? "Perderá el acceso al sistema de inmediato, conservando todo su historial de operaciones."
            : "Volverá a poder ingresar al sistema con su rol asignado."
        }
        textoConfirmar={usuarioParaCambiarEstado?.activo ? "Desactivar" : "Reactivar"}
        destructivo={Boolean(usuarioParaCambiarEstado?.activo)}
        pendiente={cambiandoEstado}
        alConfirmar={confirmarCambioEstado}
      />
    </ContenedorPagina>
  );
}
