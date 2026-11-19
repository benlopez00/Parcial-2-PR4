import { obtenerDatosTablero } from "@/servicios/servicio-tablero";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

export const dynamic = "force-dynamic";

// Implementa RF-T1 a RF-T3: mismo contrato y servicio para ambos roles, con sesión vigente.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => obtenerDatosTablero(usuarioActual, consulta));
