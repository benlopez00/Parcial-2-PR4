import { bd, clienteBaseDatos } from "./conexion";
import { cargarDatosDemostracion } from "./cargar-datos-demostracion";
import { CONTRASENA_DEMOSTRACION } from "./datos-demostracion";
import { prepararSesionLocal } from "@/utilidades/preparacion-local";

try {
  await prepararSesionLocal();
  const resultado = await cargarDatosDemostracion(bd, process.env.SEMILLA_PASSWORD || CONTRASENA_DEMOSTRACION);
  console.log(resultado.creada ? "Demostración creada mediante los servicios." : "La demostración ya existe; se conservaron todos sus datos.");
  console.log(JSON.stringify(resultado.conteos));
  console.log("Usuarios: laura@ferreteria.test (admin), pablo@ferreteria.test y ana@ferreteria.test (vendedores). Contraseña: SEMILLA_PASSWORD o la demo documentada en README.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo cargar la demostración.");
  process.exitCode = 1;
} finally { clienteBaseDatos.close(); }
