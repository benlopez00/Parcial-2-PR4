CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`nombre` text NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	CONSTRAINT "categorias_activa_valida" CHECK("categorias"."activa" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`);--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`tipo_doc` text NOT NULL,
	`nro_doc` text NOT NULL,
	`nombre` text NOT NULL,
	`domicilio` text,
	`telefono` text,
	`email` text,
	`cuenta_corriente` integer DEFAULT false NOT NULL,
	`limite_credito` integer,
	`activo` integer DEFAULT true NOT NULL,
	CONSTRAINT "clientes_tipo_doc_valido" CHECK("clientes"."tipo_doc" IN ('DNI', 'CUIT')),
	CONSTRAINT "clientes_limite_valido" CHECK("clientes"."limite_credito" IS NULL OR (typeof("clientes"."limite_credito") = 'integer' AND "clientes"."limite_credito" BETWEEN 0 AND 9007199254740991)),
	CONSTRAINT "clientes_cuenta_corriente_valida" CHECK("clientes"."cuenta_corriente" IN (0, 1)),
	CONSTRAINT "clientes_activo_valido" CHECK("clientes"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_documento_unico` ON `clientes` (`tipo_doc`,`nro_doc`);--> statement-breakpoint
CREATE TABLE `factura_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`factura_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`codigo` text NOT NULL,
	`descripcion` text NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_unitario` integer NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "factura_items_cantidad_valida" CHECK(typeof("factura_items"."cantidad") = 'integer' AND "factura_items"."cantidad" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "factura_items_precio_valido" CHECK(typeof("factura_items"."precio_unitario") = 'integer' AND "factura_items"."precio_unitario" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "factura_items_subtotal_valido" CHECK(typeof("factura_items"."subtotal") = 'integer' AND "factura_items"."subtotal" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factura_items_producto_unico` ON `factura_items` (`factura_id`,`producto_id`);--> statement-breakpoint
CREATE TABLE `facturas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`punto_venta` integer DEFAULT 1 NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cliente_id` integer,
	`usuario_id` integer NOT NULL,
	`cliente_nombre` text,
	`cliente_tipo_doc` text,
	`cliente_nro_doc` text,
	`cliente_domicilio` text,
	`total` integer NOT NULL,
	`forma_pago` text NOT NULL,
	`monto_recibido` integer,
	`tarjeta_tipo` text,
	`tarjeta_marca` text,
	`tarjeta_ultimos4` text,
	`estado` text DEFAULT 'emitida' NOT NULL,
	`motivo_anulacion` text,
	`fecha_anulacion` text,
	`usuario_anulacion_id` integer,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_anulacion_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "facturas_punto_venta_valido" CHECK(typeof("facturas"."punto_venta") = 'integer' AND "facturas"."punto_venta" BETWEEN 1 AND 9999),
	CONSTRAINT "facturas_numero_valido" CHECK(typeof("facturas"."numero") = 'integer' AND "facturas"."numero" BETWEEN 1 AND 99999999),
	CONSTRAINT "facturas_total_valido" CHECK(typeof("facturas"."total") = 'integer' AND "facturas"."total" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "facturas_monto_recibido_valido" CHECK("facturas"."monto_recibido" IS NULL OR (typeof("facturas"."monto_recibido") = 'integer' AND "facturas"."monto_recibido" BETWEEN 0 AND 9007199254740991)),
	CONSTRAINT "facturas_forma_pago_valida" CHECK("facturas"."forma_pago" IN ('contado', 'tarjeta', 'cuenta_corriente')),
	CONSTRAINT "facturas_estado_valido" CHECK("facturas"."estado" IN ('emitida', 'anulada')),
	CONSTRAINT "facturas_tarjeta_tipo_valido" CHECK("facturas"."tarjeta_tipo" IS NULL OR "facturas"."tarjeta_tipo" IN ('debito', 'credito')),
	CONSTRAINT "facturas_ultimos4_validos" CHECK("facturas"."tarjeta_ultimos4" IS NULL OR (length("facturas"."tarjeta_ultimos4") = 4 AND "facturas"."tarjeta_ultimos4" NOT GLOB '*[^0-9]*'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facturas_numeracion_unica` ON `facturas` (`punto_venta`,`numero`);--> statement-breakpoint
CREATE INDEX `facturas_cliente_fecha_indice` ON `facturas` (`cliente_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `movimientos_cuenta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cliente_id` integer NOT NULL,
	`factura_id` integer,
	`pago_id` integer,
	`tipo` text NOT NULL,
	`importe` integer NOT NULL,
	`fecha` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`descripcion` text NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movimientos_cuenta_tipo_valido" CHECK("movimientos_cuenta"."tipo" IN ('debito', 'credito')),
	CONSTRAINT "movimientos_cuenta_importe_valido" CHECK((typeof("movimientos_cuenta"."importe") = 'integer' AND "movimientos_cuenta"."importe" BETWEEN 0 AND 9007199254740991) AND "movimientos_cuenta"."importe" > 0),
	CONSTRAINT "movimientos_cuenta_origen_unico" CHECK(("movimientos_cuenta"."factura_id" IS NOT NULL AND "movimientos_cuenta"."pago_id" IS NULL) OR ("movimientos_cuenta"."factura_id" IS NULL AND "movimientos_cuenta"."pago_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `movimientos_cuenta_cliente_fecha_indice` ON `movimientos_cuenta` (`cliente_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `movimientos_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`producto_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`factura_id` integer,
	`tipo` text NOT NULL,
	`cantidad` integer NOT NULL,
	`existencia_resultante` integer NOT NULL,
	`motivo` text NOT NULL,
	`observacion` text,
	`fecha` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movimientos_stock_tipo_valido" CHECK("movimientos_stock"."tipo" IN ('venta', 'anulacion', 'ingreso', 'egreso')),
	CONSTRAINT "movimientos_stock_cantidad_valida" CHECK(typeof("movimientos_stock"."cantidad") = 'integer' AND "movimientos_stock"."cantidad" BETWEEN -9007199254740991 AND 9007199254740991 AND (("movimientos_stock"."tipo" IN ('venta', 'egreso') AND "movimientos_stock"."cantidad" < 0) OR ("movimientos_stock"."tipo" IN ('ingreso', 'anulacion') AND "movimientos_stock"."cantidad" > 0))),
	CONSTRAINT "movimientos_stock_existencia_valida" CHECK(typeof("movimientos_stock"."existencia_resultante") = 'integer' AND "movimientos_stock"."existencia_resultante" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE INDEX `movimientos_stock_producto_fecha_indice` ON `movimientos_stock` (`producto_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`punto_venta` integer DEFAULT 1 NOT NULL,
	`numero_recibo` integer NOT NULL,
	`fecha` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cliente_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`importe` integer NOT NULL,
	`medio` text NOT NULL,
	`observacion` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pagos_punto_venta_valido" CHECK(typeof("pagos"."punto_venta") = 'integer' AND "pagos"."punto_venta" BETWEEN 1 AND 9999),
	CONSTRAINT "pagos_numero_valido" CHECK(typeof("pagos"."numero_recibo") = 'integer' AND "pagos"."numero_recibo" BETWEEN 1 AND 99999999),
	CONSTRAINT "pagos_importe_valido" CHECK((typeof("pagos"."importe") = 'integer' AND "pagos"."importe" BETWEEN 0 AND 9007199254740991) AND "pagos"."importe" > 0),
	CONSTRAINT "pagos_medio_valido" CHECK("pagos"."medio" IN ('efectivo', 'transferencia', 'tarjeta_debito'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pagos_numeracion_unica` ON `pagos` (`punto_venta`,`numero_recibo`);--> statement-breakpoint
CREATE INDEX `pagos_cliente_fecha_indice` ON `pagos` (`cliente_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`codigo` text NOT NULL,
	`descripcion` text NOT NULL,
	`categoria_id` integer NOT NULL,
	`precio` integer NOT NULL,
	`existencia` integer DEFAULT 0 NOT NULL,
	`stock_minimo` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "productos_precio_valido" CHECK(typeof("productos"."precio") = 'integer' AND "productos"."precio" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "productos_existencia_valida" CHECK(typeof("productos"."existencia") = 'integer' AND "productos"."existencia" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "productos_stock_minimo_valido" CHECK(typeof("productos"."stock_minimo") = 'integer' AND "productos"."stock_minimo" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "productos_activo_valido" CHECK("productos"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `productos_codigo_unique` ON `productos` (`codigo`);--> statement-breakpoint
CREATE INDEX `productos_categoria_indice` ON `productos` (`categoria_id`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_creacion` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`email` text NOT NULL,
	`nombre` text NOT NULL,
	`contrasena_hash` text NOT NULL,
	`rol` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	CONSTRAINT "usuarios_rol_valido" CHECK("usuarios"."rol" IN ('admin', 'vendedor')),
	CONSTRAINT "usuarios_activo_valido" CHECK("usuarios"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);