import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { combinarEstilos } from "@/utilidades/clases";

const variantesAlerta = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border",
        destructive: "border-destructive/40 bg-red-50/70 text-destructive [&>svg]:text-destructive",
        success: "border-emerald-300 bg-emerald-50/80 text-emerald-900 [&>svg]:text-emerald-700",
        warning: "border-amber-300 bg-amber-50/80 text-amber-900 [&>svg]:text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const Alerta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof variantesAlerta>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={combinarEstilos(variantesAlerta({ variant }), className)} {...props} />
));
Alerta.displayName = "Alerta";

export const AlertaTitulo = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={combinarEstilos("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertaTitulo.displayName = "AlertaTitulo";

export const AlertaDescripcion = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={combinarEstilos("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertaDescripcion.displayName = "AlertaDescripcion";
