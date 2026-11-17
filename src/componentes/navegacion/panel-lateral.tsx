"use client";

import Link from "next/link";
import { usePathname as usarRutaActual } from "next/navigation";
import { Home, Package, Plus, Receipt, ShieldCheck, Users } from "lucide-react";
import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { Boton } from "@/componentes/interfaz/boton";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesPanelLateral {
  usuario: UsuarioAutenticado;
  cantidadProductosBajoMinimo: number;
}

interface ElementoNavegacion {
  ruta: string;
  etiqueta: string;
  icono: typeof Home;
  soloAdmin?: boolean;
  insignia?: number;
}

function esRutaActiva(rutaActual: string, rutaElemento: string): boolean {
  if (rutaElemento === "/") {
    return rutaActual === "/";
  }
  return rutaActual === rutaElemento || rutaActual.startsWith(`${rutaElemento}/`);
}

export function ContenidoPanelLateral({
  usuario,
  cantidadProductosBajoMinimo,
  alNavegar,
}: PropiedadesPanelLateral & { alNavegar?: () => void }) {
  const rutaActual = usarRutaActual();

  const elementos: ElementoNavegacion[] = [
    { ruta: "/", etiqueta: "Inicio", icono: Home },
    { ruta: "/ventas", etiqueta: "Ventas", icono: Receipt },
    {
      ruta: "/productos",
      etiqueta: "Productos",
      icono: Package,
      insignia: cantidadProductosBajoMinimo > 0 ? cantidadProductosBajoMinimo : undefined,
    },
    { ruta: "/clientes", etiqueta: "Clientes", icono: Users },
    { ruta: "/usuarios", etiqueta: "Usuarios", icono: ShieldCheck, soloAdmin: true },
  ];

  const elementosVisibles = elementos.filter(
    (elemento) => !elemento.soloAdmin || usuario.rol === "admin",
  );

  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground"
        >
          M
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">Mostrador</p>
          <p className="truncate text-xs text-sidebar-foreground/65">Ferretería del Centro</p>
        </div>
      </div>

      <Boton variant="acento" comoHijo className="mb-6 w-full justify-start">
        <Link href="/ventas/nueva" onClick={alNavegar}>
          <Plus className="size-4" />
          <span>Nueva venta</span>
        </Link>
      </Boton>

      <nav aria-label="Módulos del sistema" className="flex-1 space-y-1">
        {elementosVisibles.map((elemento) => {
          const Icono = elemento.icono;
          const activo = esRutaActiva(rutaActual, elemento.ruta);
          return (
            <Link
              key={elemento.ruta}
              href={elemento.ruta}
              onClick={alNavegar}
              aria-current={activo ? "page" : undefined}
              className={combinarEstilos(
                "relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activo
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              {activo ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent"
                />
              ) : null}
              <span className="flex items-center gap-3">
                <Icono className={combinarEstilos("size-4", activo && "text-accent")} />
                <span>{elemento.etiqueta}</span>
              </span>
              {elemento.insignia !== undefined ? (
                <span
                  aria-label={`${elemento.insignia} productos bajo mínimo`}
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-300"
                >
                  {elemento.insignia}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-xs leading-relaxed text-sidebar-foreground/55">
          Comprobantes internos sin validez fiscal
        </p>
      </div>
    </div>
  );
}

export function PanelLateral({ usuario, cantidadProductosBajoMinimo }: PropiedadesPanelLateral) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 md:block">
      <div className="sticky top-0 h-dvh">
        <ContenidoPanelLateral
          usuario={usuario}
          cantidadProductosBajoMinimo={cantidadProductosBajoMinimo}
        />
      </div>
    </aside>
  );
}
