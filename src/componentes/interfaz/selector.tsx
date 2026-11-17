"use client";

import * as React from "react";
import * as SelectPrimitivo from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { combinarEstilos } from "@/utilidades/clases";

export const Selector = SelectPrimitivo.Root;
export const SelectorGrupo = SelectPrimitivo.Group;
export const SelectorValor = SelectPrimitivo.Value;

export const SelectorDisparador = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitivo.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitivo.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitivo.Trigger
    ref={ref}
    className={combinarEstilos(
      "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitivo.Icon asChild>
      <ChevronDown className="size-4 opacity-60" />
    </SelectPrimitivo.Icon>
  </SelectPrimitivo.Trigger>
));
SelectorDisparador.displayName = SelectPrimitivo.Trigger.displayName;

export const SelectorContenido = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitivo.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitivo.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitivo.Portal>
    <SelectPrimitivo.Content
      ref={ref}
      position={position}
      className={combinarEstilos(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitivo.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
        <ChevronUp className="size-4" />
      </SelectPrimitivo.ScrollUpButton>
      <SelectPrimitivo.Viewport
        className={combinarEstilos(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitivo.Viewport>
      <SelectPrimitivo.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
        <ChevronDown className="size-4" />
      </SelectPrimitivo.ScrollDownButton>
    </SelectPrimitivo.Content>
  </SelectPrimitivo.Portal>
));
SelectorContenido.displayName = SelectPrimitivo.Content.displayName;

export const SelectorOpcion = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitivo.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitivo.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitivo.Item
    ref={ref}
    className={combinarEstilos(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-secondary focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <SelectPrimitivo.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitivo.ItemIndicator>
    </span>
    <SelectPrimitivo.ItemText>{children}</SelectPrimitivo.ItemText>
  </SelectPrimitivo.Item>
));
SelectorOpcion.displayName = SelectPrimitivo.Item.displayName;

export const SelectorSeparador = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitivo.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitivo.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitivo.Separator
    ref={ref}
    className={combinarEstilos("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectorSeparador.displayName = SelectPrimitivo.Separator.displayName;
