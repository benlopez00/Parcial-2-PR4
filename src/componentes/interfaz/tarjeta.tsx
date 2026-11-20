import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export const Tarjeta = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={combinarEstilos("rounded-xl border bg-card text-card-foreground shadow-xs", className)}
      {...props}
    />
  ),
);
Tarjeta.displayName = "Tarjeta";

export const TarjetaEncabezado = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={combinarEstilos("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
TarjetaEncabezado.displayName = "TarjetaEncabezado";

export const TarjetaTitulo = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={combinarEstilos("font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
TarjetaTitulo.displayName = "TarjetaTitulo";

export const TarjetaDescripcion = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={combinarEstilos("text-sm text-muted-foreground", className)} {...props} />
));
TarjetaDescripcion.displayName = "TarjetaDescripcion";

export const TarjetaContenido = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={combinarEstilos("p-6 pt-0", className)} {...props} />
  ),
);
TarjetaContenido.displayName = "TarjetaContenido";

export const TarjetaPie = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={combinarEstilos("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
TarjetaPie.displayName = "TarjetaPie";
