"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { Boton } from "@/componentes/interfaz/boton";
import {
  PanelDesplegable,
  PanelDesplegableContenido,
  PanelDesplegableDescripcion,
  PanelDesplegableEncabezado,
  PanelDesplegableTitulo,
  PanelDesplegableDisparador,
} from "@/componentes/interfaz/panel-desplegable";
import { ContenidoPanelLateral } from "./panel-lateral";

export interface PropiedadesMenuMovil {
  usuario: UsuarioAutenticado;
  cantidadProductosBajoMinimo: number;
}

export function MenuMovil({ usuario, cantidadProductosBajoMinimo }: PropiedadesMenuMovil) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <div className="md:hidden">
      <PanelDesplegable open={abierto} onOpenChange={setAbierto}>
        <PanelDesplegableDisparador asChild>
          <Boton variant="outline" size="icon" aria-label="Abrir menú de navegación">
            <Menu className="size-5" />
          </Boton>
        </PanelDesplegableDisparador>
        <PanelDesplegableContenido lado="left" className="p-0">
          <PanelDesplegableEncabezado className="sr-only">
            <PanelDesplegableTitulo>Navegación principal</PanelDesplegableTitulo>
            <PanelDesplegableDescripcion>
              Elegí un módulo del sistema para continuar.
            </PanelDesplegableDescripcion>
          </PanelDesplegableEncabezado>
          <ContenidoPanelLateral
            usuario={usuario}
            cantidadProductosBajoMinimo={cantidadProductosBajoMinimo}
            alNavegar={() => setAbierto(false)}
          />
        </PanelDesplegableContenido>
      </PanelDesplegable>
    </div>
  );
}
