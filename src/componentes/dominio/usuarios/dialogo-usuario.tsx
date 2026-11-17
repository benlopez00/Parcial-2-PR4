"use client";

import * as React from "react";
import { actualizarUsuarioAccion, crearUsuarioAccion } from "@/app/(sistema)/usuarios/acciones";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import {
  Dialogo,
  DialogoContenido,
  DialogoDescripcion,
  DialogoEncabezado,
  DialogoTitulo,
} from "@/componentes/interfaz/dialogo";
import type { UsuarioPublico } from "@/servicios/servicio-usuarios";
import { esquemaCrearUsuario, esquemaEditarUsuario } from "@/validaciones/validacion-usuarios";
import { FormularioUsuario, type ValoresFormularioUsuario } from "./formulario-usuario";

export interface PropiedadesDialogoUsuario {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  usuarioAEditar: UsuarioPublico | null;
  esUsuarioActual: boolean;
  alGuardar: (usuario: UsuarioPublico, modo: "crear" | "editar") => void;
}

const valoresVacios: ValoresFormularioUsuario = {
  nombre: "",
  email: "",
  rol: "vendedor",
  password: "",
};

export function DialogoUsuario({
  abierto,
  alCambiarAbierto,
  usuarioAEditar,
  esUsuarioActual,
  alGuardar,
}: PropiedadesDialogoUsuario) {
  const modo = usuarioAEditar ? "editar" : "crear";
  const [valores, setValores] = React.useState<ValoresFormularioUsuario>(valoresVacios);

  const formularioCrear = usarFormularioAccion({
    esquema: esquemaCrearUsuario,
    accion: crearUsuarioAccion,
    alCompletar: (creado) => {
      alCambiarAbierto(false);
      alGuardar(creado, "crear");
    },
  });

  const esquemaEdicionAdaptado = React.useMemo(
    () =>
      esquemaEditarUsuario.transform((cambios) => ({
        id: usuarioAEditar?.id ?? 0,
        cambios,
      })),
    [usuarioAEditar?.id],
  );

  const formularioEditar = usarFormularioAccion({
    esquema: esquemaEdicionAdaptado,
    accion: actualizarUsuarioAccion,
    alCompletar: (actualizado) => {
      alCambiarAbierto(false);
      alGuardar(actualizado, "editar");
    },
  });

  const formularioActivo = modo === "crear" ? formularioCrear : formularioEditar;

  React.useEffect(() => {
    if (!abierto) {
      return;
    }
    formularioCrear.limpiarErrores();
    formularioEditar.limpiarErrores();
    if (usuarioAEditar) {
      setValores({
        nombre: usuarioAEditar.nombre,
        email: usuarioAEditar.email,
        rol: usuarioAEditar.rol,
        password: "",
      });
    } else {
      setValores(valoresVacios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, usuarioAEditar]);

  function manejarCambioCampo<Campo extends keyof ValoresFormularioUsuario>(
    campo: Campo,
    valor: ValoresFormularioUsuario[Campo],
  ) {
    setValores((previo) => ({ ...previo, [campo]: valor }));
    formularioActivo.limpiarErrorCampo(campo);
  }

  async function manejarEnvio() {
    if (modo === "crear") {
      await formularioCrear.enviar({
        nombre: valores.nombre,
        email: valores.email,
        rol: valores.rol,
        password: valores.password,
      });
      return;
    }

    if (!usuarioAEditar) {
      return;
    }

    const cambios: { nombre?: string; email?: string; rol?: "admin" | "vendedor" } = {};
    if (valores.nombre.trim() !== usuarioAEditar.nombre) {
      cambios.nombre = valores.nombre;
    }
    if (valores.email.trim().toLowerCase() !== usuarioAEditar.email) {
      cambios.email = valores.email;
    }
    if (valores.rol !== usuarioAEditar.rol) {
      cambios.rol = valores.rol;
    }

    if (Object.keys(cambios).length === 0) {
      alCambiarAbierto(false);
      return;
    }

    await formularioEditar.enviar(cambios);
  }

  return (
    <Dialogo
      open={abierto}
      onOpenChange={(nuevoEstado) => {
        if (!formularioActivo.enviando) {
          alCambiarAbierto(nuevoEstado);
        }
      }}
    >
      <DialogoContenido>
        <DialogoEncabezado>
          <DialogoTitulo>{modo === "crear" ? "Nuevo usuario" : "Editar usuario"}</DialogoTitulo>
          <DialogoDescripcion>
            {modo === "crear"
              ? "Comunicále la contraseña temporal; la puede cambiar desde su perfil."
              : "Modificá los datos o el rol del usuario."}
          </DialogoDescripcion>
        </DialogoEncabezado>

        <FormularioUsuario
          modo={modo}
          valores={valores}
          esUsuarioActual={esUsuarioActual}
          enviando={formularioActivo.enviando}
          erroresPorCampo={formularioActivo.erroresPorCampo}
          errorGeneral={formularioActivo.errorGeneral}
          alCambiarCampo={manejarCambioCampo}
          alCancelar={() => alCambiarAbierto(false)}
          alEnviar={manejarEnvio}
        />
      </DialogoContenido>
    </Dialogo>
  );
}
