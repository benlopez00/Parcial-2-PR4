import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { combinarEstilos } from "@/utilidades/clases";

export const variantesInsignia = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-foreground",
        info: "border-transparent bg-teal-50 text-teal-800",
        success: "border-transparent bg-emerald-50 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-800",
        destructive: "border-transparent bg-red-50 text-red-700",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface PropiedadesInsignia
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof variantesInsignia> {}

export function Insignia({ className, variant, ...props }: PropiedadesInsignia) {
  return <span className={combinarEstilos(variantesInsignia({ variant }), className)} {...props} />;
}
