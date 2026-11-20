import { listarMovimientosStockGeneral } from "@/servicios/servicio-stock";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P6: historial general con filtros y paginación.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => listarMovimientosStockGeneral(usuarioActual, consulta));
