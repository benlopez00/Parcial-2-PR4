"use client";

import * as React from "react";
import * as AvatarPrimitivo from "@radix-ui/react-avatar";
import { combinarEstilos } from "@/utilidades/clases";

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitivo.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitivo.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitivo.Root
    ref={ref}
    className={combinarEstilos("relative flex size-9 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitivo.Root.displayName;

export const AvatarImagen = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitivo.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitivo.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitivo.Image ref={ref} className={combinarEstilos("aspect-square size-full", className)} {...props} />
));
AvatarImagen.displayName = AvatarPrimitivo.Image.displayName;

export const AvatarRespaldo = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitivo.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitivo.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitivo.Fallback
    ref={ref}
    className={combinarEstilos(
      "flex size-full items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800",
      className,
    )}
    {...props}
  />
));
AvatarRespaldo.displayName = AvatarPrimitivo.Fallback.displayName;
