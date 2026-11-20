import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Alinear } from "@/componentes/maquetacion/alinear";
import { Apilar } from "@/componentes/maquetacion/apilar";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { Texto } from "@/componentes/maquetacion/texto";
import { Titulo } from "@/componentes/maquetacion/titulo";
import { FormularioCambioContrasena } from "./formulario-cambio-contrasena";

export interface PropiedadesPerfilUsuario {
  usuario: UsuarioAutenticado;
}

export function PerfilUsuario({ usuario }: PropiedadesPerfilUsuario) {
  return (
    <ContenedorPagina ancho="angosto">
      <EncabezadoPagina titulo="Mi perfil" />
      <Apilar espacio="lg">
        <Tarjeta>
          <TarjetaContenido className="pt-6">
            <Apilar espacio="xs">
              <Titulo nivel="h2">{usuario.nombre}</Titulo>
              <Alinear espacio="sm" envolver>
                <Texto variante="atenuado" como="span">
                  {usuario.email}
                </Texto>
                <InsigniaEstado tipo={usuario.rol} />
              </Alinear>
            </Apilar>
          </TarjetaContenido>
        </Tarjeta>

        <FormularioCambioContrasena />
      </Apilar>
    </ContenedorPagina>
  );
}
