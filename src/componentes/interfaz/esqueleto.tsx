import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export function Esqueleto({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={combinarEstilos("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
