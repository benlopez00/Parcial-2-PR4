import * as React from "react";
import * as LabelPrimitivo from "@radix-ui/react-label";
import { combinarEstilos } from "@/utilidades/clases";

export const Etiqueta = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitivo.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitivo.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitivo.Root
    ref={ref}
    className={combinarEstilos(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Etiqueta.displayName = LabelPrimitivo.Root.displayName;
