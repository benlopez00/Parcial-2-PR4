import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export const Tabla = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={combinarEstilos("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Tabla.displayName = "Tabla";

export const TablaEncabezado = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={combinarEstilos("[&_tr]:border-b", className)} {...props} />
));
TablaEncabezado.displayName = "TablaEncabezado";

export const TablaCuerpo = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={combinarEstilos("[&_tr:last-child]:border-0", className)} {...props} />
));
TablaCuerpo.displayName = "TablaCuerpo";

export const TablaPie = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={combinarEstilos("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TablaPie.displayName = "TablaPie";

export const TablaFila = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={combinarEstilos("border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  ),
);
TablaFila.displayName = "TablaFila";

export const TablaCeldaEncabezado = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={combinarEstilos(
      "h-11 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TablaCeldaEncabezado.displayName = "TablaCeldaEncabezado";

export const TablaCelda = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={combinarEstilos("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TablaCelda.displayName = "TablaCelda";

export const TablaLeyenda = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={combinarEstilos("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TablaLeyenda.displayName = "TablaLeyenda";
