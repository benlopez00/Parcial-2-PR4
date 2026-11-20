import { Insignia } from "@/componentes/interfaz/insignia";

export type VarianteInsigniaEstado = "activo" | "inactivo" | "admin" | "vendedor" | "alerta";

export interface PropiedadesInsigniaEstado {
  tipo: VarianteInsigniaEstado;
  etiqueta?: string;
}

const configuracionEstados: Record<
  VarianteInsigniaEstado,
  {
    variante: "success" | "secondary" | "info" | "warning";
    textoPorDefecto: string;
    conPunto: boolean;
    colorPunto?: string;
  }
> = {
  activo: {
    variante: "success",
    textoPorDefecto: "Activo",
    conPunto: true,
    colorPunto: "bg-emerald-600",
  },
  inactivo: {
    variante: "secondary",
    textoPorDefecto: "Inactivo",
    conPunto: true,
    colorPunto: "bg-slate-400",
  },
  admin: {
    variante: "info",
    textoPorDefecto: "Administrador",
    conPunto: false,
  },
  vendedor: {
    variante: "secondary",
    textoPorDefecto: "Vendedor",
    conPunto: false,
  },
  alerta: {
    variante: "warning",
    textoPorDefecto: "Bajo mínimo",
    conPunto: false,
  },
};

export function InsigniaEstado({ tipo, etiqueta }: PropiedadesInsigniaEstado) {
  const configuracion = configuracionEstados[tipo];
  return (
    <Insignia variant={configuracion.variante}>
      {configuracion.conPunto ? (
        <span aria-hidden="true" className={`size-1.5 rounded-full ${configuracion.colorPunto}`} />
      ) : null}
      <span>{etiqueta ?? configuracion.textoPorDefecto}</span>
    </Insignia>
  );
}
