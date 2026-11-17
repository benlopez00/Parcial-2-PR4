import { NextResponse as RespuestaNext, type NextRequest as PeticionNext } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/utilidades/sesion";

// En Next.js 16 la convención `src/proxy.ts` reemplaza a `src/middleware.ts` (deprecado en esta versión).
// Implementa la primera barrera de RF-U2: redirige a `/login` si falta la cookie; no consulta la BD ni sustituye el control por pedido.
export function proxy(peticion: PeticionNext) {
  const { pathname: ruta } = peticion.nextUrl;

  if (ruta.startsWith("/api/") || ruta === "/login") {
    return RespuestaNext.next();
  }

  const tieneCookieSesion = Boolean(peticion.cookies.get(NOMBRE_COOKIE_SESION)?.value);
  if (!tieneCookieSesion) {
    return RespuestaNext.redirect(new URL("/login", peticion.url));
  }

  return RespuestaNext.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
