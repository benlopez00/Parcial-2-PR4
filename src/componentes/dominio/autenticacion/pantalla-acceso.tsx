import { FormularioAcceso } from "./formulario-acceso";

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

      <main className="flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <FormularioAcceso />
      </main>
    </div>
  );
}
