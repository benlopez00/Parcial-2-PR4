import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { combinarEstilos } from "@/utilidades/clases";

export const variantesBoton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline: "border border-input bg-card shadow-xs hover:bg-secondary hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        acento: "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90 font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface PropiedadesBoton
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantesBoton> {
  comoHijo?: boolean;
}

export const Boton = React.forwardRef<HTMLButtonElement, PropiedadesBoton>(
  ({ className, variant, size, comoHijo = false, type = "button", ...props }, ref) => {
    const Componente = comoHijo ? Slot : "button";
    return (
      <Componente
        ref={ref}
        type={comoHijo ? undefined : type}
        className={combinarEstilos(variantesBoton({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Boton.displayName = "Boton";
