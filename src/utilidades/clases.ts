import { clsx as combinarClases, type ClassValue as ValorClase } from "clsx";
import { twMerge as unirClasesTailwind } from "tailwind-merge";

export function combinarEstilos(...clases: ValorClase[]): string {
  return unirClasesTailwind(combinarClases(clases));
}

// Nombre requerido por los componentes que genera el CLI de shadcn/ui.
export { combinarEstilos as cn };
