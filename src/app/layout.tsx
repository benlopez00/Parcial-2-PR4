import type { Metadata as Metadatos } from "next";
import type { ReactNode as NodoReact } from "react";
import "./globals.css";

export const metadata: Metadatos = {
  title: "Gestión comercial",
  description: "Sistema de gestión comercial",
};

export default function DisposicionRaiz({ children: contenido }: Readonly<{ children: NodoReact }>) {
  return (
    <html lang="es-AR">
      <body>{contenido}</body>
    </html>
  );
}
