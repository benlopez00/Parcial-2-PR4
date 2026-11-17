import {
  afterEach as despuesDeCadaPrueba,
  beforeEach as antesDeCadaPrueba,
  describe as describir,
  expect as esperar,
  it as probar,
} from "vitest";
import { eq as igual } from "drizzle-orm";
import { categorias, productos, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { CODIGOS_ERROR } from "@/errores/codigos-error";
import { ErrorApi } from "@/errores/error-api";
import {
  asegurarNoEsOperacionSobreSiMismo,
  asegurarRolAdmin,
  traducirErrorEscrituraUsuario,
} from "@/errores/verificadores-negocio";
import {
  cambiarContrasenaPropia,
  iniciarSesion,
  obtenerPerfilActual,
} from "@/servicios/servicio-autenticacion";
import { obtenerResumenNavegacion } from "@/servicios/servicio-navegacion";
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  restablecerContrasenaUsuario,
} from "@/servicios/servicio-usuarios";
import { verificarContrasena } from "@/utilidades/sesion";
import { esquemaFormularioCambioContrasena } from "@/validaciones/validacion-autenticacion";
import {
  esquemaActualizarUsuario,
  esquemaCrearUsuario,
  esquemaListadoUsuarios,
} from "@/validaciones/validacion-usuarios";
import {
  crearBaseDatosPrueba,
  crearUsuarioPrueba,
  type BaseDatosPrueba,
} from "./ayudantes-prueba";

const administradorFijo: UsuarioAutenticado = {
  id: 1,
  nombre: "Ana",
  email: "ana@ejemplo.test",
  rol: "admin",
};

describir("Contratos de validación y verificadores de acceso/usuarios", () => {
  probar("rechaza propiedades sensibles no previstas", () => {
    esperar(
      esquemaCrearUsuario.safeParse({
        nombre: "Ana",
        email: administradorFijo.email,
        rol: "admin",
        password: "temporal123",
        activo: false,
      }).success,
    ).toBe(false);
    esperar(
      esquemaActualizarUsuario.safeParse({ id: 1, cambios: { password: "oculta123" } }).success,
    ).toBe(false);
  });

  probar("mantiene explícito el filtro de inactivos y normaliza el email", () => {
    esperar(esquemaListadoUsuarios.parse({ activo: "false" })).toEqual({
      q: "",
      activo: "false",
      page: 1,
      pageSize: 20,
    });
    const creado = esquemaCrearUsuario.parse({
      nombre: "  Ana  ",
      email: "  ANA@Ejemplo.TEST  ",
      rol: "admin",
      password: "temporal123",
    });
    esperar(creado.email).toBe("ana@ejemplo.test");
    esperar(creado.nombre).toBe("Ana");
  });

  probar("rechaza confirmaciones distintas y contraseñas mayores a 72 bytes UTF-8", () => {
    esperar(
      esquemaFormularioCambioContrasena.safeParse({
        actual: "anterior",
        nueva: "nueva1234",
        confirmacion: "distinta",
      }).success,
    ).toBe(false);
    esperar(
      esquemaFormularioCambioContrasena.safeParse({
        actual: "anterior",
        nueva: "á".repeat(40),
        confirmacion: "á".repeat(40),
      }).success,
    ).toBe(false);
  });

  probar("impide autodesactivación y autodegradación pero permite editar otros campos", () => {
    esperar(() => asegurarNoEsOperacionSobreSiMismo(administradorFijo, 1, { activo: false })).toThrow();
    esperar(() =>
      asegurarNoEsOperacionSobreSiMismo(administradorFijo, 1, { rol: "vendedor" }),
    ).toThrow();
    esperar(() => asegurarNoEsOperacionSobreSiMismo(administradorFijo, 1, {})).not.toThrow();
  });

  probar("deniega la gestión al vendedor", () => {
    esperar(() => asegurarRolAdmin({ ...administradorFijo, rol: "vendedor" })).toThrow();
  });
});

describir("Servicios de autenticación, usuarios y navegación con BD en memoria", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;

  antesDeCadaPrueba(async () => {
    entorno = await crearBaseDatosPrueba();
    const filaAdmin = await crearUsuarioPrueba(entorno.bd, {
      nombre: "Laura Méndez",
      email: "laura@ferreteria.test",
      password: "ClaveAdmin123!",
      rol: "admin",
    });
    const filaVendedor = await crearUsuarioPrueba(entorno.bd, {
      nombre: "Pablo Ruiz",
      email: "pablo@ferreteria.test",
      password: "ClaveVendedor123!",
      rol: "vendedor",
    });
    admin = {
      id: filaAdmin.id,
      nombre: filaAdmin.nombre,
      email: filaAdmin.email,
      rol: filaAdmin.rol,
    };
    vendedor = {
      id: filaVendedor.id,
      nombre: filaVendedor.nombre,
      email: filaVendedor.email,
      rol: filaVendedor.rol,
    };
  });

  despuesDeCadaPrueba(() => {
    entorno.cerrar();
  });

  probar("permite acceso válido normalizando email y rechaza uniformemente fallos", async () => {
    const autenticado = await iniciarSesion(
      { email: "  LAURA@ferreteria.test ", password: "ClaveAdmin123!" },
      entorno.bd,
    );
    esperar(autenticado).toEqual(admin);
    esperar("contrasenaHash" in autenticado).toBe(false);

    await crearUsuarioPrueba(entorno.bd, {
      nombre: "Diego Sosa",
      email: "diego@ferreteria.test",
      password: "ClaveDiego123!",
      rol: "vendedor",
      activo: false,
    });

    const intentosFallidos = [
      { email: "inexistente@ferreteria.test", password: "ClaveAdmin123!" },
      { email: "laura@ferreteria.test", password: "incorrecta" },
      { email: "diego@ferreteria.test", password: "ClaveDiego123!" },
    ];

    const errores: ErrorApi[] = [];
    for (const intento of intentosFallidos) {
      try {
        await iniciarSesion(intento, entorno.bd);
      } catch (error) {
        errores.push(error as ErrorApi);
      }
    }

    esperar(errores).toHaveLength(3);
    for (const error of errores) {
      esperar(error).toBeInstanceOf(ErrorApi);
      esperar(error.estadoHttp).toBe(401);
      esperar(error.codigo).toBe(CODIGOS_ERROR.CREDENCIALES_INVALIDAS);
      esperar(error.mensaje).toBe(errores[0].mensaje);
    }
  });

  probar("bloquea al vendedor en gestión de usuarios pero le permite perfil y contraseña propia", async () => {
    await esperar(listarUsuarios(vendedor, {}, entorno.bd)).rejects.toMatchObject({
      estadoHttp: 403,
      codigo: CODIGOS_ERROR.SIN_PERMISO,
    });
    await esperar(
      crearUsuario(
        vendedor,
        { nombre: "Nuevo", email: "nuevo@ferreteria.test", rol: "vendedor", password: "temporal123" },
        entorno.bd,
      ),
    ).rejects.toMatchObject({ estadoHttp: 403, codigo: CODIGOS_ERROR.SIN_PERMISO });
    await esperar(
      actualizarUsuario(vendedor, { id: admin.id, cambios: { nombre: "Otro" } }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 403, codigo: CODIGOS_ERROR.SIN_PERMISO });
    await esperar(
      restablecerContrasenaUsuario(vendedor, { id: admin.id }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 403, codigo: CODIGOS_ERROR.SIN_PERMISO });

    const perfilVendedor = await obtenerPerfilActual(vendedor, {});
    esperar(perfilVendedor).toEqual(vendedor);

    await cambiarContrasenaPropia(
      vendedor,
      { actual: "ClaveVendedor123!", nueva: "NuevaClaveVendedor1!" },
      entorno.bd,
    );
    await esperar(
      iniciarSesion({ email: vendedor.email, password: "ClaveVendedor123!" }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 401 });
    await esperar(
      iniciarSesion({ email: vendedor.email, password: "NuevaClaveVendedor1!" }, entorno.bd),
    ).resolves.toEqual(vendedor);
  });

  probar("crea usuarios con hash verificable, bloquea email duplicado incluso inactivo y traduce colisión única", async () => {
    const creado = await crearUsuario(
      admin,
      {
        nombre: "Ana Gómez",
        email: "ANA@ferreteria.test",
        rol: "vendedor",
        password: "TemporalAna123!",
      },
      entorno.bd,
    );
    esperar(creado).toMatchObject({
      nombre: "Ana Gómez",
      email: "ana@ferreteria.test",
      rol: "vendedor",
      activo: true,
    });
    esperar("contrasenaHash" in creado).toBe(false);

    const [fila] = await entorno.bd
      .select()
      .from(usuarios)
      .where(igual(usuarios.id, creado.id));
    esperar(await verificarContrasena("TemporalAna123!", fila.contrasenaHash)).toBe(true);

    await actualizarUsuario(admin, { id: creado.id, cambios: { activo: false } }, entorno.bd);
    await esperar(
      crearUsuario(
        admin,
        {
          nombre: "Otra Ana",
          email: "ana@ferreteria.test",
          rol: "vendedor",
          password: "TemporalAna456!",
        },
        entorno.bd,
      ),
    ).rejects.toMatchObject({ estadoHttp: 409, codigo: CODIGOS_ERROR.EMAIL_DUPLICADO });

    esperar(() =>
      traducirErrorEscrituraUsuario(new Error("UNIQUE constraint failed: usuarios.email")),
    ).toThrow(ErrorApi);
    esperar(() => traducirErrorEscrituraUsuario(new Error("Fallo de conexión"))).toThrow(
      "Fallo de conexión",
    );
  });

  probar("edita usuarios, impide autodesactivación/autodegradación y devuelve 404 en destino inexistente", async () => {
    await esperar(
      actualizarUsuario(admin, { id: admin.id, cambios: { activo: false } }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 422, codigo: CODIGOS_ERROR.OPERACION_SOBRE_SI_MISMO });
    await esperar(
      actualizarUsuario(admin, { id: admin.id, cambios: { rol: "vendedor" } }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 422, codigo: CODIGOS_ERROR.OPERACION_SOBRE_SI_MISMO });

    const editadoPropio = await actualizarUsuario(
      admin,
      { id: admin.id, cambios: { nombre: "Laura M.", email: "laura@ferreteria.test" } },
      entorno.bd,
    );
    esperar(editadoPropio.nombre).toBe("Laura M.");

    const desactivado = await actualizarUsuario(
      admin,
      { id: vendedor.id, cambios: { activo: false } },
      entorno.bd,
    );
    esperar(desactivado.activo).toBe(false);

    const reactivado = await actualizarUsuario(
      admin,
      { id: vendedor.id, cambios: { activo: true } },
      entorno.bd,
    );
    esperar(reactivado.activo).toBe(true);

    await esperar(
      actualizarUsuario(admin, { id: 9999, cambios: { nombre: "Fantasma" } }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 404, codigo: CODIGOS_ERROR.NO_ENCONTRADO });
  });

  probar("lista usuarios con búsqueda, filtro activo/inactivo y paginación", async () => {
    await crearUsuarioPrueba(entorno.bd, {
      nombre: "Diego 100% Sosa",
      email: "diego@ferreteria.test",
      password: "ClaveDiego123!",
      rol: "vendedor",
      activo: false,
    });
    await crearUsuarioPrueba(entorno.bd, {
      nombre: "Ana Gómez",
      email: "ana@ferreteria.test",
      password: "ClaveAna123!",
      rol: "vendedor",
      activo: true,
    });

    const inactivos = await listarUsuarios(admin, { activo: "false" }, entorno.bd);
    esperar(inactivos.total).toBe(1);
    esperar(inactivos.data[0].email).toBe("diego@ferreteria.test");

    const busquedaPorcentaje = await listarUsuarios(admin, { q: "100%" }, entorno.bd);
    esperar(busquedaPorcentaje.total).toBe(1);
    esperar(busquedaPorcentaje.data[0].nombre).toBe("Diego 100% Sosa");

    const pagina1 = await listarUsuarios(admin, { page: 1, pageSize: 2 }, entorno.bd);
    esperar(pagina1.total).toBe(4);
    esperar(pagina1.data).toHaveLength(2);
    esperar(pagina1.data.map((u) => u.nombre)).toEqual(["Ana Gómez", "Diego 100% Sosa"]);

    await esperar(listarUsuarios(admin, { pageSize: 101 }, entorno.bd)).rejects.toThrow();
  });

  probar("rechaza cambio con contraseña actual incorrecta sin alterar el hash y restablece con temporal única", async () => {
    const [antes] = await entorno.bd
      .select()
      .from(usuarios)
      .where(igual(usuarios.id, vendedor.id));

    await esperar(
      cambiarContrasenaPropia(
        vendedor,
        { actual: "Incorrecta123", nueva: "NuevaClaveValida1!" },
        entorno.bd,
      ),
    ).rejects.toMatchObject({
      estadoHttp: 422,
      codigo: CODIGOS_ERROR.CONTRASENA_ACTUAL_INCORRECTA,
    });

    const [despues] = await entorno.bd
      .select()
      .from(usuarios)
      .where(igual(usuarios.id, vendedor.id));
    esperar(despues.contrasenaHash).toBe(antes.contrasenaHash);

    const { passwordTemporal } = await restablecerContrasenaUsuario(
      admin,
      { id: vendedor.id },
      entorno.bd,
    );
    esperar(passwordTemporal.length).toBeGreaterThanOrEqual(8);

    await esperar(
      iniciarSesion({ email: vendedor.email, password: "ClaveVendedor123!" }, entorno.bd),
    ).rejects.toMatchObject({ estadoHttp: 401 });
    await esperar(
      iniciarSesion({ email: vendedor.email, password: passwordTemporal }, entorno.bd),
    ).resolves.toEqual(vendedor);

    const listado = await listarUsuarios(admin, {}, entorno.bd);
    for (const fila of listado.data) {
      esperar("passwordTemporal" in fila).toBe(false);
    }
  });

  probar("cuenta en navegación únicamente productos activos con existencia estrictamente menor al mínimo", async () => {
    const vacio = await obtenerResumenNavegacion(vendedor, {}, entorno.bd);
    esperar(vacio.cantidadProductosBajoMinimo).toBe(0);

    const [cat] = await entorno.bd.insert(categorias).values({ nombre: "Bulonería" }).returning();
    await entorno.bd.insert(productos).values([
      {
        codigo: "P-1",
        descripcion: "Bajo mínimo activo",
        categoriaId: cat.id,
        precio: 1000,
        existencia: 4,
        stockMinimo: 5,
        activo: true,
      },
      {
        codigo: "P-2",
        descripcion: "Igual al mínimo (no cuenta)",
        categoriaId: cat.id,
        precio: 1000,
        existencia: 5,
        stockMinimo: 5,
        activo: true,
      },
      {
        codigo: "P-3",
        descripcion: "Bajo mínimo inactivo (no cuenta)",
        categoriaId: cat.id,
        precio: 1000,
        existencia: 0,
        stockMinimo: 5,
        activo: false,
      },
    ]);

    const resumen = await obtenerResumenNavegacion(vendedor, {}, entorno.bd);
    esperar(resumen.cantidadProductosBajoMinimo).toBe(1);
  });
});
