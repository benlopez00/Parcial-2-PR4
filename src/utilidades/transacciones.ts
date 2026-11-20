import { setTimeout as esperar } from "node:timers/promises";
import type { BaseDatos, TransaccionBaseDatos } from "@/base-de-datos/conexion";
import { esBloqueoTransitorioSqlite } from "@/errores/verificadores-negocio";

// Implementa Reglas 1 y 2: reintenta únicamente transacciones rechazadas por contención de escritura.
export async function ejecutarTransaccionEscritura<Resultado>(
  baseDatos: BaseDatos,
  operacion: (transaccion: TransaccionBaseDatos) => Promise<Resultado>,
): Promise<Resultado> {
  for (let intento = 0; ; intento += 1) {
    try {
      return await baseDatos.transaction(operacion);
    } catch (error) {
      if (!esBloqueoTransitorioSqlite(error) || intento >= 6) throw error;
      // Ceder el hilo permite que la transacción competidora confirme antes de volver a leer.
      await esperar(10 * 2 ** intento);
    }
  }
}
