"use client";

import * as React from "react";
import * as DialogoPrimitivo from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { combinarEstilos } from "@/utilidades/clases";

export const Dialogo = DialogoPrimitivo.Root;
export const DialogoDisparador = DialogoPrimitivo.Trigger;
export const DialogoPortal = DialogoPrimitivo.Portal;
export const DialogoCerrar = DialogoPrimitivo.Close;

export const DialogoSuperposicion = React.forwardRef<
  React.ComponentRef<typeof DialogoPrimitivo.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogoPrimitivo.Overlay>
>(({ className, ...props }, ref) => (
  <DialogoPrimitivo.Overlay
    ref={ref}
    className={combinarEstilos(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogoSuperposicion.displayName = DialogoPrimitivo.Overlay.displayName;

export const DialogoContenido = React.forwardRef<
  React.ComponentRef<typeof DialogoPrimitivo.Content>,
  React.ComponentPropsWithoutRef<typeof DialogoPrimitivo.Content>
>(({ className, children, ...props }, ref) => (
  <DialogoPortal>
    <DialogoSuperposicion />
    <DialogoPrimitivo.Content
      ref={ref}
      className={combinarEstilos(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    >
      {children}
      <DialogoPrimitivo.Close
        aria-label="Cerrar diálogo"
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      >
        <X className="size-4" />
      </DialogoPrimitivo.Close>
    </DialogoPrimitivo.Content>
  </DialogoPortal>
));
DialogoContenido.displayName = DialogoPrimitivo.Content.displayName;

export function DialogoEncabezado({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={combinarEstilos("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}

export function DialogoPie({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={combinarEstilos("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const DialogoTitulo = React.forwardRef<
  React.ComponentRef<typeof DialogoPrimitivo.Title>,
  React.ComponentPropsWithoutRef<typeof DialogoPrimitivo.Title>
>(({ className, ...props }, ref) => (
  <DialogoPrimitivo.Title
    ref={ref}
    className={combinarEstilos("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogoTitulo.displayName = DialogoPrimitivo.Title.displayName;

export const DialogoDescripcion = React.forwardRef<
  React.ComponentRef<typeof DialogoPrimitivo.Description>,
  React.ComponentPropsWithoutRef<typeof DialogoPrimitivo.Description>
>(({ className, ...props }, ref) => (
  <DialogoPrimitivo.Description
    ref={ref}
    className={combinarEstilos("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogoDescripcion.displayName = DialogoPrimitivo.Description.displayName;
