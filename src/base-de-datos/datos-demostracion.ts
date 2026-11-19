// Credencial pública de una demo sin datos reales; SEMILLA_PASSWORD permite elegir otra al crearla.
export const CONTRASENA_DEMOSTRACION = "DemoFerreteria123!";
export const usuariosDemostracion = [
  { nombre: "Laura Fernández", email: "laura@ferreteria.test", rol: "admin" },
  { nombre: "Pablo Gómez", email: "pablo@ferreteria.test", rol: "vendedor" },
  { nombre: "Ana Sosa", email: "ana@ferreteria.test", rol: "vendedor" },
] as const;
export const categoriasDemostracion = ["Herramientas", "Electricidad", "Bulonería", "Pinturería", "Jardín"];

// Precios en centavos. Los cuatro primeros quedan bajo mínimo y no se usan en las ventas de la demo.
export const productosDemostracion = [
  { codigo: "HE-001", descripcion: "Martillo carpintero 500 g", categoria: 0, precio: 1250000 },
  { codigo: "HE-002", descripcion: "Pinza universal 180 mm", categoria: 0, precio: 980000 },
  { codigo: "HE-003", descripcion: "Destornillador Phillips Nº 2", categoria: 0, precio: 350000 },
  { codigo: "HE-004", descripcion: "Llave ajustable 10 pulgadas", categoria: 0, precio: 1450000 },
  { codigo: "HE-005", descripcion: "Cinta métrica 5 m", categoria: 0, precio: 640000 },
  { codigo: "HE-006", descripcion: "Serrucho de costilla 300 mm", categoria: 0, precio: 1890000 },
  { codigo: "EL-001", descripcion: "Lámpara LED 12 W", categoria: 1, precio: 320000 },
  { codigo: "EL-002", descripcion: "Cable unipolar 2,5 mm por metro", categoria: 1, precio: 185000 },
  { codigo: "EL-003", descripcion: "Tomacorriente doble", categoria: 1, precio: 450000 },
  { codigo: "EL-004", descripcion: "Llave térmica bipolar 20 A", categoria: 1, precio: 1280000 },
  { codigo: "EL-005", descripcion: "Cinta aisladora 10 m", categoria: 1, precio: 195000 },
  { codigo: "EL-006", descripcion: "Prolongador de cuatro tomas", categoria: 1, precio: 1560000 },
  { codigo: "BU-001", descripcion: "Tornillo para madera 4 × 40 mm, bolsa", categoria: 2, precio: 280000 },
  { codigo: "BU-002", descripcion: "Tarugo plástico Nº 8, bolsa", categoria: 2, precio: 230000 },
  { codigo: "BU-003", descripcion: "Tuerca hexagonal M8, bolsa", categoria: 2, precio: 310000 },
  { codigo: "BU-004", descripcion: "Arandela plana M8, bolsa", categoria: 2, precio: 180000 },
  { codigo: "BU-005", descripcion: "Bulón galvanizado M8 × 50 mm", categoria: 2, precio: 95000 },
  { codigo: "BU-006", descripcion: "Clavos de acero 2 pulgadas, caja", categoria: 2, precio: 420000 },
  { codigo: "PI-001", descripcion: "Pincel de cerda 2 pulgadas", categoria: 3, precio: 360000 },
  { codigo: "PI-002", descripcion: "Rodillo de lana 22 cm", categoria: 3, precio: 790000 },
  { codigo: "PI-003", descripcion: "Lija al agua grano 120", categoria: 3, precio: 85000 },
  { codigo: "PI-004", descripcion: "Cinta de enmascarar 24 mm", categoria: 3, precio: 245000 },
  { codigo: "PI-005", descripcion: "Enduido interior 1 kg", categoria: 3, precio: 580000 },
  { codigo: "PI-006", descripcion: "Esmalte sintético blanco 1 l", categoria: 3, precio: 1640000 },
  { codigo: "JA-001", descripcion: "Manguera reforzada por metro", categoria: 4, precio: 390000 },
  { codigo: "JA-002", descripcion: "Pala de punta con cabo", categoria: 4, precio: 2250000 },
  { codigo: "JA-003", descripcion: "Rastrillo de doce dientes", categoria: 4, precio: 1470000 },
  { codigo: "JA-004", descripcion: "Tijera de podar", categoria: 4, precio: 1180000 },
  { codigo: "JA-005", descripcion: "Conector rápido para manguera", categoria: 4, precio: 275000 },
  { codigo: "JA-006", descripcion: "Guantes de jardinería", categoria: 4, precio: 465000 },
];

// Personas y documentos ficticios; los CUIT tienen formato y dígito verificador válidos.
export const clientesDemostracion = [
  { nombre: "Mariana Benítez", tipoDoc: "DNI", nroDoc: "30000101" },
  { nombre: "Diego Acosta", tipoDoc: "DNI", nroDoc: "30000102" },
  { nombre: "Lucía Cabrera", tipoDoc: "DNI", nroDoc: "30000103" },
  { nombre: "Jorge Molina", tipoDoc: "DNI", nroDoc: "30000104" },
  { nombre: "Paula Suárez", tipoDoc: "DNI", nroDoc: "30000105" },
  { nombre: "Sergio Ríos", tipoDoc: "DNI", nroDoc: "30000106" },
  { nombre: "Carolina Vega", tipoDoc: "DNI", nroDoc: "30000107" },
  { nombre: "Andrés Torres", tipoDoc: "DNI", nroDoc: "30000108" },
  { nombre: "Taller del Parque", tipoDoc: "CUIT", nroDoc: "20300000011" },
  { nombre: "Mantenimiento del Sur", tipoDoc: "CUIT", nroDoc: "27300000024" },
] as const;
