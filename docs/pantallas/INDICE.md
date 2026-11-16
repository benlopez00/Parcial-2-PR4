# Índice de Pantallas de Referencia

Imágenes extraídas de [docs/pantallas.html](file:///c:/Proyectos/Parcial-2-PR4/docs/pantallas.html) y organizadas por módulo/grupo.

> **Importante (Sección 8 de Requerimientos):** Estas pantallas son la referencia obligatoria de **contenido, campos, filtros, atajos de teclado y flujos**. El diseño visual debe implementarse con identidad propia utilizando **shadcn/ui** y **Tailwind CSS**.

## 1. Acceso (`docs/pantallas/Acceso/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Acceso/login.jpg` | Iniciar sesión | `/login` · única página pública (`RF-U1`) | 1440×900 |

## 2. Inicio (`docs/pantallas/Inicio/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Inicio/inicio.jpg` | Tablero | `/` · indicadores, gráficos y reposición (`RF-T1` a `RF-T3`) | 1440×1081 |

## 3. Ventas (`docs/pantallas/Ventas/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Ventas/venta-vacia.jpg` | Nueva venta | `/ventas/nueva` · estado inicial (`RF-V1`) | 1440×900 |
| `Ventas/venta-busqueda.jpg` | Búsqueda de productos | `Enter` agrega · `↑` `↓` eligen (`RF-V3`, `RF-V4`) | 1440×900 |
| `Ventas/venta-cuenta.jpg` | Venta en cuenta corriente | Cliente registrado, saldo y límite (`RF-V2`, `RF-V5`) | 1440×930 |
| `Ventas/venta-alta-cliente.jpg` | Alta de cliente en el momento | Modal sin perder la venta (`POST /api/clientes`) | 1440×900 |
| `Ventas/facturas.jpg` | Facturas | `/ventas` · filtros, total emitido y paginado (`RF-V8`) | 1440×1156 |
| `Ventas/comprobante.jpg` | Comprobante | `/ventas/[id]` · vista imprimible (`RF-V7`) | 1440×900 |
| `Ventas/anular.jpg` | Anular factura | Modal solo administrador, motivo obligatorio (`RF-V9`) | 1440×900 |
| `Ventas/anulada.jpg` | Factura anulada | Queda visible con su motivo y datos de anulación (`Regla 5`) | 1440×900 |

## 4. Productos (`docs/pantallas/Productos/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Productos/catalogo.jpg` | Catálogo | `/productos` · pestaña Catálogo y marca bajo mínimo (`RF-P1`) | 1440×1138 |
| `Productos/nuevo-producto.jpg` | Nuevo producto | Modal con stock inicial como ingreso (`RF-P2`) | 1440×900 |
| `Productos/egreso.jpg` | Egreso de stock | Modal con motivo obligatorio (`RF-P5`) | 1440×900 |
| `Productos/existencias.jpg` | Existencias y movimientos | Pestaña dentro de `/productos` (`RF-P6`) | 1440×1150 |
| `Productos/ficha-producto.jpg` | Ficha del producto | `/productos/[id]` · tarjetas resumen y movimientos con referencia | 1440×900 |
| `Productos/categorias.jpg` | Categorías | `/productos/categorias` · alta, edición y baja lógica (`RF-P7`) | 1440×900 |

## 5. Clientes (`docs/pantallas/Clientes/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Clientes/clientes.jpg` | Clientes | `/clientes` · búsqueda por nombre/documento y saldo (`RF-C1`) | 1440×900 |
| `Clientes/ficha-cliente.jpg` | Ficha del cliente | `/clientes/[id]` · pestaña Datos y últimas facturas (`RF-C3`) | 1440×900 |
| `Clientes/cuenta.jpg` | Cuenta corriente | `/clientes/[id]` · pestaña Cuenta corriente con saldo acumulado (`RF-C4`) | 1440×900 |
| `Clientes/pago.jpg` | Registrar pago | Modal que valida no superar la deuda (`RF-C5`) | 1440×900 |
| `Clientes/recibo.jpg` | Recibo | `/clientes/recibos/[id]` · numerado e imprimible (`RF-C5`) | 1440×900 |
| `Clientes/saldos.jpg` | Saldos | `/clientes/saldos` · clientes con deuda de mayor a menor (`RF-C6`) | 1440×900 |

## 6. Usuarios (`docs/pantallas/Usuarios/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Usuarios/usuarios.jpg` | Usuarios | `/usuarios` · solo administrador (`RF-U4`) | 1440×900 |
| `Usuarios/nuevo-usuario.jpg` | Nuevo usuario | Modal con rol y contraseña temporal (`RF-U4`) | 1440×900 |
| `Usuarios/perfil.jpg` | Mi perfil | `/perfil` · cambiar contraseña propia (`RF-U5`) | 1440×900 |

## 7. Vendedor (`docs/pantallas/Vendedor/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Vendedor/vendedor-productos.jpg` | Catálogo como vendedor | Sin botones de edición/stock ni módulo Usuarios en el panel lateral | 1440×900 |
| `Vendedor/vendedor-factura.jpg` | Factura como vendedor | Sin botón Anular (y la API responde `403`) | 1440×900 |

## 8. Teléfono (`docs/pantallas/Telefono/`)
| Archivo | Título | Ruta / Nota | Dimensiones |
| :--- | :--- | :--- | :--- |
| `Telefono/movil-inicio.jpg` | Tablero móvil | Vista en `390 px` de ancho | 390×844 |
| `Telefono/movil-menu.jpg` | Menú lateral móvil | El panel lateral se colapsa en un menú desplegable | 390×844 |
| `Telefono/movil-venta.jpg` | Nueva venta móvil | Vista adaptable en `390 px` de ancho | 390×844 |
