"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter as usarEnrutador } from "next/navigation";
import { LogOut } from "lucide-react";
import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { cerrarSesionAccion } from "@/app/(sistema)/acciones";
import { Avatar, AvatarRespaldo } from "@/componentes/interfaz/avatar";
import { Boton } from "@/componentes/interfaz/boton";
import { MenuMovil } from "./menu-movil";

export interface PropiedadesBarraSuperior {
  usuario: UsuarioAutenticado;
  cantidadProductosBajoMinimo: number;
}

function obtenerIniciales(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0);
  if (partes.length === 0) {
    return "U";
  }
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function BarraSuperior({ usuario, cantidadProductosBajoMinimo }: PropiedadesBarraSuperior) {
  const enrutador = usarEnrutador();
  const [saliendo, setSaliendo] = React.useState(false);

  async function manejarSalida() {
    if (saliendo) {
      return;
    }
    setSaliendo(true);
    try {
      const resultado = await cerrarSesionAccion({});
      if (resultado.ok) {
        enrutador.push("/login");
        enrutador.refresh();
      }
    } finally {
      setSaliendo(false);
    }
  }

  const etiquetaRol = usuario.rol === "admin" ? "Administrador" : "Vendedor";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur-xs sm:px-6 print:hidden">
      <div className="flex items-center gap-3">
        <MenuMovil
          usuario={usuario}
          cantidadProductosBajoMinimo={cantidadProductosBajoMinimo}
        />
        <span className="text-sm font-semibold text-foreground md:hidden">Mostrador</span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8">
            <AvatarRespaldo>{obtenerIniciales(usuario.nombre)}</AvatarRespaldo>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">{usuario.nombre}</p>
            <p className="text-xs leading-tight text-muted-foreground">{etiquetaRol}</p>
          </div>
        </Link>

        <Boton
          type="button"
          variant="outline"
          size="sm"
          disabled={saliendo}
          onClick={() => void manejarSalida()}
        >
          <LogOut className="size-4" />
          <span>{saliendo ? "Saliendo..." : "Salir"}</span>
        </Boton>
      </div>
    </header>
  );
}
