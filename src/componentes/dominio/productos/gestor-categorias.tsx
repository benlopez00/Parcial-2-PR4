"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador } from "next/navigation";
import { useRef as usarReferencia, useState as usarEstado } from "react";
import { Plus as Mas, Pencil as Lapiz } from "lucide-react";
import { actualizarCategoriaAccion, crearCategoriaAccion } from "@/app/(sistema)/productos/acciones";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { Tabla, TablaEncabezado, TablaFila, TablaCeldaEncabezado, TablaCuerpo, TablaCelda } from "@/componentes/interfaz/tabla";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { DialogoConfirmacion } from "@/componentes/estados/dialogo-confirmacion";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { asociarErroresFormularioProductos } from "@/errores/errores-formularios-productos";
import type { CategoriaAdministrable, CategoriaPublica } from "@/servicios/servicio-categorias";
import { esquemaActualizarCategoria, esquemaCrearCategoria, esquemaEditarCategoria } from "@/validaciones/validacion-categorias";

export function GestorCategorias({ categorias }: { categorias: CategoriaAdministrable[] }) {
  const enrutador = usarEnrutador();
  const [edicion, cambiarEdicion] = usarEstado<CategoriaAdministrable | "nueva" | null>(null);
  const [cambioEstado, cambiarCambioEstado] = usarEstado<CategoriaAdministrable | null>(null);
  const estado = usarFormularioAccion<unknown, CategoriaPublica>({
    esquema: esquemaActualizarCategoria, accion: actualizarCategoriaAccion,
    alCompletar: () => { cambiarCambioEstado(null); enrutador.refresh(); },
  });
  return <ContenedorPagina ancho="completo">
    <Boton comoHijo variant="link" className="mb-4 px-0"><Enlace href="/productos">← Productos</Enlace></Boton>
    <EncabezadoPagina titulo="Categorías" descripcion="Agrupan el catálogo para buscar y filtrar."
      acciones={<Boton onClick={() => cambiarEdicion("nueva")}><Mas className="size-4" />Nueva categoría</Boton>} />
    {categorias.length ? <Tarjeta className="overflow-hidden"><Tabla>
      <TablaEncabezado><TablaFila><TablaCeldaEncabezado>Nombre</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Productos activos</TablaCeldaEncabezado><TablaCeldaEncabezado>Estado</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Acciones</TablaCeldaEncabezado></TablaFila></TablaEncabezado>
      <TablaCuerpo>{categorias.map((categoria) => <TablaFila key={categoria.id}>
        <TablaCelda className="min-w-40 font-medium">{categoria.nombre}</TablaCelda><TablaCelda className="text-right tabular-nums">{categoria.cantidadProductosActivos}</TablaCelda>
        <TablaCelda><InsigniaEstado tipo={categoria.activa ? "activo" : "inactivo"} etiqueta={categoria.activa ? "Activa" : "Inactiva"} /></TablaCelda>
        <TablaCelda><div className="flex justify-end gap-2"><Boton variant="ghost" size="sm" aria-label={`Editar ${categoria.nombre}`} onClick={() => cambiarEdicion(categoria)}><Lapiz className="size-4" />Editar</Boton>
          <Boton variant="ghost" size="sm" aria-label={`${categoria.activa ? "Desactivar" : "Activar"} ${categoria.nombre}`} onClick={() => { estado.limpiarErrores(); cambiarCambioEstado(categoria); }}>{categoria.activa ? "Desactivar" : "Activar"}</Boton></div></TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla></Tarjeta> : <EstadoVacio titulo="Todavía no hay categorías" descripcion="Creá una categoría para comenzar a cargar productos." />}
    {edicion && <FormularioCategoria categoria={edicion === "nueva" ? undefined : edicion} alCerrar={() => cambiarEdicion(null)} alCompletar={() => enrutador.refresh()} />}
    <DialogoConfirmacion abierto={Boolean(cambioEstado)} alCambiarAbierto={(abierto) => !abierto && cambiarCambioEstado(null)}
      titulo={cambioEstado?.activa ? "Desactivar categoría" : "Activar categoría"} textoConfirmar={cambioEstado?.activa ? "Desactivar" : "Activar"} pendiente={estado.enviando}
      descripcion={`${cambioEstado?.nombre ?? ""}. Las categorías con productos activos no se pueden desactivar.${estado.errorGeneral ? ` ${estado.errorGeneral}` : ""}`}
      alConfirmar={async () => { if (cambioEstado) await estado.enviar({ id: cambioEstado.id, cambios: { activa: !cambioEstado.activa } }); }} />
  </ContenedorPagina>;
}

function FormularioCategoria({ categoria, alCerrar, alCompletar }: { categoria?: CategoriaPublica; alCerrar: () => void; alCompletar: () => void }) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  const [nombre, cambiarNombre] = usarEstado(categoria?.nombre ?? "");
  const formulario = usarFormularioAccion<unknown, CategoriaPublica>({
    esquema: categoria ? esquemaEditarCategoria : esquemaCrearCategoria,
    accion: async (datos) => {
      const resultado = categoria ? await actualizarCategoriaAccion({ id: categoria.id, cambios: datos }) : await crearCategoriaAccion(datos);
      return resultado.ok ? resultado : asociarErroresFormularioProductos(resultado, "categoria");
    },
    alCompletar: () => { alCerrar(); alCompletar(); },
  });
  return <Dialogo open onOpenChange={(abierto) => !abierto && !formulario.enviando && alCerrar()}>
    <DialogoContenido className="max-h-[90dvh] overflow-y-auto"
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}>
      <DialogoEncabezado><DialogoTitulo>{categoria ? "Renombrar categoría" : "Nueva categoría"}</DialogoTitulo><DialogoDescripcion>El nombre debe ser único, también entre categorías inactivas.</DialogoDescripcion></DialogoEncabezado>
      <form noValidate className="space-y-4" onSubmit={(evento) => { evento.preventDefault(); void formulario.enviar({ nombre }); }}>
        <CampoFormulario id="nombre-categoria" etiqueta="Nombre" obligatorio error={formulario.erroresPorCampo.nombre}>
          <Entrada id="nombre-categoria" value={nombre} disabled={formulario.enviando} aria-invalid={Boolean(formulario.erroresPorCampo.nombre)} aria-describedby="nombre-categoria-error"
            onChange={(evento) => { cambiarNombre(evento.target.value); formulario.validarCampos({ nombre: evento.target.value }, ["nombre"]); }} />
        </CampoFormulario>
        {formulario.errorGeneral && <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>}
        <DialogoPie><Boton type="button" variant="outline" disabled={formulario.enviando} onClick={alCerrar}>Cancelar</Boton><Boton type="submit" disabled={formulario.enviando}>{formulario.enviando ? "Guardando…" : "Guardar"}</Boton></DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
