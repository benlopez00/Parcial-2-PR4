"use client";

import { useRef as usarReferencia, useState as usarEstado } from "react";
import { actualizarProductoAccion, crearProductoAccion } from "@/app/(sistema)/productos/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { CampoImporte } from "@/componentes/formularios/campo-importe";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoEncabezado, DialogoPie, DialogoTitulo } from "@/componentes/interfaz/dialogo";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import { asociarErroresFormularioProductos } from "@/errores/errores-formularios-productos";
import type { ProductoPublico } from "@/servicios/servicio-productos";
import type { CategoriaPublica } from "@/servicios/servicio-categorias";
import { esquemaCrearProducto, esquemaEditarProducto } from "@/validaciones/validacion-productos";

interface PropiedadesModalFormularioProducto {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  producto?: ProductoPublico;
  categorias: CategoriaPublica[];
  alCompletar: () => void;
}
interface ValoresFormularioProducto {
  codigo: string; descripcion: string; categoriaId: string; precio: number | null; stockMinimo: string; stockInicial: string;
}

export function ModalFormularioProducto({ abierto, alCambiarAbierto, producto, categorias, alCompletar }: PropiedadesModalFormularioProducto) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  const [valores, cambiarValores] = usarEstado<ValoresFormularioProducto>({
    codigo: producto?.codigo ?? "", descripcion: producto?.descripcion ?? "", categoriaId: producto ? String(producto.categoria.id) : "",
    precio: producto?.precio ?? null, stockMinimo: String(producto?.stockMinimo ?? 0), stockInicial: "0",
  });
  const formulario = usarFormularioAccion<unknown, ProductoPublico>({
    esquema: producto ? esquemaEditarProducto : esquemaCrearProducto,
    accion: async (datos) => {
      const resultado = producto ? await actualizarProductoAccion({ id: producto.id, cambios: datos }) : await crearProductoAccion(datos);
      return resultado.ok ? resultado : asociarErroresFormularioProductos(resultado, "producto");
    },
    alCompletar: () => { alCambiarAbierto(false); alCompletar(); },
  });

  function prepararEntrada(entrada: ValoresFormularioProducto): unknown {
    return { codigo: entrada.codigo, descripcion: entrada.descripcion, categoriaId: entrada.categoriaId ? Number(entrada.categoriaId) : 0,
      precio: entrada.precio, stockMinimo: entrada.stockMinimo === "" ? null : Number(entrada.stockMinimo),
      ...(!producto ? { stockInicial: entrada.stockInicial === "" ? 0 : Number(entrada.stockInicial) } : {}) };
  }

  function actualizarCampo<Campo extends keyof ValoresFormularioProducto>(campo: Campo, valor: ValoresFormularioProducto[Campo]): void {
    const siguientes = { ...valores, [campo]: valor };
    cambiarValores(siguientes);
    formulario.validarCampos(prepararEntrada(siguientes), [campo]);
  }

  const categoriasDisponibles = categorias.filter((categoria) => categoria.activa || categoria.id === producto?.categoria.id);
  return <Dialogo open={abierto} onOpenChange={(estado) => !formulario.enviando && alCambiarAbierto(estado)}>
    <DialogoContenido className="max-h-[90dvh] max-w-2xl overflow-y-auto"
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}>
      <DialogoEncabezado><DialogoTitulo>{producto ? "Editar producto" : "Nuevo producto"}</DialogoTitulo>
        <DialogoDescripcion>{producto ? "La existencia se modifica mediante ingresos o egresos de stock." : "El stock inicial se registra como un movimiento de ingreso."}</DialogoDescripcion></DialogoEncabezado>
      <form noValidate className="space-y-5" onSubmit={(evento) => { evento.preventDefault(); void formulario.enviar(prepararEntrada(valores)); }}>
        <fieldset disabled={formulario.enviando} className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario id="codigo-producto" etiqueta="Código" obligatorio error={formulario.erroresPorCampo.codigo}>
            <Entrada id="codigo-producto" autoComplete="off" value={valores.codigo} aria-invalid={Boolean(formulario.erroresPorCampo.codigo)} aria-describedby="codigo-producto-error" onChange={(evento) => actualizarCampo("codigo", evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="categoria-producto" etiqueta="Categoría" obligatorio error={formulario.erroresPorCampo.categoriaId}>
            <Selector value={valores.categoriaId} onValueChange={(valor) => actualizarCampo("categoriaId", valor)}>
              <SelectorDisparador id="categoria-producto" aria-invalid={Boolean(formulario.erroresPorCampo.categoriaId)} aria-describedby="categoria-producto-error"><SelectorValor placeholder="Elegí una categoría" /></SelectorDisparador>
              <SelectorContenido>{categoriasDisponibles.map((categoria) => <SelectorOpcion key={categoria.id} value={String(categoria.id)}>{categoria.nombre}{!categoria.activa && " (inactiva)"}</SelectorOpcion>)}</SelectorContenido>
            </Selector>
          </CampoFormulario>
          <CampoFormulario id="descripcion-producto" etiqueta="Descripción" obligatorio error={formulario.erroresPorCampo.descripcion} className="sm:col-span-2">
            <Entrada id="descripcion-producto" value={valores.descripcion} aria-invalid={Boolean(formulario.erroresPorCampo.descripcion)} aria-describedby="descripcion-producto-error" onChange={(evento) => actualizarCampo("descripcion", evento.target.value)} />
          </CampoFormulario>
          <CampoImporte id="precio-producto" etiqueta="Precio de venta ($)" obligatorio valorCentavos={valores.precio} alCambiarCentavos={(valor) => actualizarCampo("precio", valor)} error={formulario.erroresPorCampo.precio} ayuda="Precio final, con impuestos incluidos." />
          <CampoFormulario id="minimo-producto" etiqueta="Stock mínimo" obligatorio error={formulario.erroresPorCampo.stockMinimo}>
            <Entrada id="minimo-producto" type="number" min="0" step="1" value={valores.stockMinimo} aria-invalid={Boolean(formulario.erroresPorCampo.stockMinimo)} aria-describedby="minimo-producto-error" onChange={(evento) => actualizarCampo("stockMinimo", evento.target.value)} />
          </CampoFormulario>
          {!producto && <CampoFormulario id="inicial-producto" etiqueta="Stock inicial (opcional)" error={formulario.erroresPorCampo.stockInicial} className="sm:col-span-2">
            <Entrada id="inicial-producto" type="number" min="0" step="1" value={valores.stockInicial} aria-invalid={Boolean(formulario.erroresPorCampo.stockInicial)} aria-describedby="inicial-producto-error" onChange={(evento) => actualizarCampo("stockInicial", evento.target.value)} />
          </CampoFormulario>}
        </fieldset>
        {categoriasDisponibles.length === 0 && <p className="text-sm text-muted-foreground">Creá una categoría activa antes de guardar el producto.</p>}
        {formulario.errorGeneral && <p role="alert" className="text-sm text-destructive">{formulario.errorGeneral}</p>}
        <DialogoPie><Boton type="button" variant="outline" disabled={formulario.enviando} onClick={() => alCambiarAbierto(false)}>Cancelar</Boton>
          <Boton type="submit" disabled={formulario.enviando || categoriasDisponibles.length === 0}>{formulario.enviando ? "Guardando…" : "Guardar"}</Boton></DialogoPie>
      </form>
    </DialogoContenido>
  </Dialogo>;
}
