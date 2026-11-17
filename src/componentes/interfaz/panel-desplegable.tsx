"use client";

import * as React from "react";
import * as PanelPrimitivo from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { combinarEstilos } from "@/utilidades/clases";

export const PanelDesplegable = PanelPrimitivo.Root;
export const PanelDesplegableDisparador = PanelPrimitivo.Trigger;
export const PanelDesplegableCerrar = PanelPrimitivo.Close;

export const PanelDesplegableContenido = React.forwardRef<
  React.ComponentRef<typeof PanelPrimitivo.Content>,
  React.ComponentPropsWithoutRef<typeof PanelPrimitivo.Content> & {
    lado?: "left" | "right";
  }
>(({ lado = "left", className, children, ...props }, ref) => (
  <PanelPrimitivo.Portal>
    <PanelPrimitivo.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <PanelPrimitivo.Content
      ref={ref}
      className={combinarEstilos(
        "fixed inset-y-0 z-50 flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl transition ease-in-out",
        lado === "left" ? "left-0 border-r border-white/10" : "right-0 border-l",
        className,
      )}
      {...props}
    >
      {children}
      <PanelPrimitivo.Close
        aria-label="Cerrar menú"
        className="absolute right-3 top-3 rounded-sm p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      >
        <X className="size-4" />
      </PanelPrimitivo.Close>
    </PanelPrimitivo.Content>
  </PanelPrimitivo.Portal>
));
PanelDesplegableContenido.displayName = PanelPrimitivo.Content.displayName;

export function PanelDesplegableEncabezado({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={combinarEstilos("flex flex-col space-y-1.5", className)} {...props} />;
}

export function PanelDesplegablePie({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={combinarEstilos("mt-auto flex flex-col gap-2", className)} {...props} />;
}

export const PanelDesplegableTitulo = React.forwardRef<
  React.ComponentRef<typeof PanelPrimitivo.Title>,
  React.ComponentPropsWithoutRef<typeof PanelPrimitivo.Title>
>(({ className, ...props }, ref) => (
  <PanelPrimitivo.Title ref={ref} className={combinarEstilos("text-base font-semibold", className)} {...props} />
));
PanelDesplegableTitulo.displayName = PanelPrimitivo.Title.displayName;

export const PanelDesplegableDescripcion = React.forwardRef<
  React.ComponentRef<typeof PanelPrimitivo.Description>,
  React.ComponentPropsWithoutRef<typeof PanelPrimitivo.Description>
>(({ className, ...props }, ref) => (
  <PanelPrimitivo.Description ref={ref} className={combinarEstilos("text-xs opacity-70", className)} {...props} />
));
PanelDesplegableDescripcion.displayName = PanelPrimitivo.Description.displayName;
