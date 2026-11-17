"use client";

import * as React from "react";
import * as DialogoAlertaPrimitivo from "@radix-ui/react-alert-dialog";
import { combinarEstilos } from "@/utilidades/clases";
import { variantesBoton } from "./boton";

export const DialogoAlerta = DialogoAlertaPrimitivo.Root;
export const DialogoAlertaDisparador = DialogoAlertaPrimitivo.Trigger;
export const DialogoAlertaPortal = DialogoAlertaPrimitivo.Portal;

export const DialogoAlertaSuperposicion = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Overlay>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPrimitivo.Overlay
    ref={ref}
    className={combinarEstilos(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogoAlertaSuperposicion.displayName = DialogoAlertaPrimitivo.Overlay.displayName;

export const DialogoAlertaContenido = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Content>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Content>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPortal>
    <DialogoAlertaSuperposicion />
    <DialogoAlertaPrimitivo.Content
      ref={ref}
      className={combinarEstilos(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg duration-200",
        className,
      )}
      {...props}
    />
  </DialogoAlertaPortal>
));
DialogoAlertaContenido.displayName = DialogoAlertaPrimitivo.Content.displayName;

export function DialogoAlertaEncabezado({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={combinarEstilos("flex flex-col space-y-2 text-left", className)} {...props} />;
}

export function DialogoAlertaPie({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={combinarEstilos("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const DialogoAlertaTitulo = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Title>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Title>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPrimitivo.Title ref={ref} className={combinarEstilos("text-lg font-semibold", className)} {...props} />
));
DialogoAlertaTitulo.displayName = DialogoAlertaPrimitivo.Title.displayName;

export const DialogoAlertaDescripcion = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Description>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Description>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPrimitivo.Description
    ref={ref}
    className={combinarEstilos("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogoAlertaDescripcion.displayName = DialogoAlertaPrimitivo.Description.displayName;

export const DialogoAlertaAccion = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Action>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Action>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPrimitivo.Action ref={ref} className={combinarEstilos(variantesBoton(), className)} {...props} />
));
DialogoAlertaAccion.displayName = DialogoAlertaPrimitivo.Action.displayName;

export const DialogoAlertaCancelar = React.forwardRef<
  React.ComponentRef<typeof DialogoAlertaPrimitivo.Cancel>,
  React.ComponentPropsWithoutRef<typeof DialogoAlertaPrimitivo.Cancel>
>(({ className, ...props }, ref) => (
  <DialogoAlertaPrimitivo.Cancel
    ref={ref}
    className={combinarEstilos(variantesBoton({ variant: "outline" }), className)}
    {...props}
  />
));
DialogoAlertaCancelar.displayName = DialogoAlertaPrimitivo.Cancel.displayName;
