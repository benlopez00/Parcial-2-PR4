import { FormularioAcceso } from "./formulario-acceso";

const INTEGRANTES_GRUPO = [
  { nombre: "Eduardo Benjamín López Avila", legajo: "63448" },
  { nombre: "Álvaro Tomás Rojas Sosa", legajo: "62088" },
  { nombre: "Pablo Augusto Collante", legajo: "63143" },
] as const;

export function PantallaAcceso() {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <section
        aria-label="Presentación del comercio"
        className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:px-14 lg:py-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-16 size-56 rounded-full bg-white/[0.04]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 size-80 rounded-full border-[28px] border-white/[0.04]"
        />

        <div className="relative z-10">
          <p className="text-lg font-bold tracking-tight text-white">Mostrador</p>
          <p className="text-sm text-sidebar-foreground/65">Ferretería del Centro</p>
        </div>

        <div className="relative z-10 my-8 max-w-md space-y-3 lg:my-0">
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
            Facturá, controlá el stock y llevá las cuentas corrientes desde el mostrador.
          </h2>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">
            Cada venta descuenta existencias en el mismo acto y deja su movimiento registrado.
          </p>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/50">
          Av. Mitre 1234 · San Miguel de Tucumán
        </p>
      </section>

      <main className="flex flex-col bg-background px-6 py-6 sm:px-10 lg:py-8">
        <aside
          aria-label="Integrantes del grupo"
          className="ml-auto mb-6 w-full max-w-xs rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-xs text-muted-foreground shadow-xs"
        >
          <p className="mb-1.5 font-semibold tracking-wide text-foreground/80">
            Integrantes del grupo
          </p>
          <ul className="space-y-1">
            {INTEGRANTES_GRUPO.map((integrante) => (
              <li
                key={integrante.legajo}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate">{integrante.nombre}</span>
                <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-foreground/75">
                  {integrante.legajo}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex flex-1 items-center justify-center py-4">
          <FormularioAcceso />
        </div>
      </main>
    </div>
  );
}
