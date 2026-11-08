import type { Trabajo } from "../types";
import { descargarCSV } from "./csv";
import { hoy } from "../utils";

const COLUMNAS = [
  "Número",
  "Fecha",
  "Estado",
  "Cliente",
  "Teléfono",
  "Email",
  "Ciudad",
  "Pieza del trabajo",
  "Item",
  "Cantidad de piezas",
  "Material",
  "Tipo",
  "Color",
  "Gramos",
  "Total",
  "Fecha de entrega",
  "Notas",
] as const;

type FilaTrabajo = Record<(typeof COLUMNAS)[number], string | number>;

function filasDeTrabajo(t: Trabajo): FilaTrabajo[] {
  const base = {
    "Número": t.numero,
    "Fecha": t.fecha,
    "Estado": t.estado,
    "Cliente": t.cliente,
    "Teléfono": t.telefono,
    "Email": t.email,
    "Ciudad": t.ciudad,
    "Pieza del trabajo": t.pieza,
    "Total": t.total,
    "Fecha de entrega": t.fechaEntrega,
    "Notas": t.notas,
  };

  const filas: FilaTrabajo[] = [];
  for (const item of t.items ?? []) {
    for (const mat of item.materiales ?? []) {
      filas.push({
        ...base,
        "Item": item.pieza,
        "Cantidad de piezas": item.cantidad,
        "Material": mat.nombre,
        "Tipo": mat.tipo,
        "Color": mat.color,
        "Gramos": mat.gramos,
      });
    }
  }

  if (filas.length === 0) {
    filas.push({
      ...base,
      "Item": "",
      "Cantidad de piezas": "",
      "Material": "",
      "Tipo": "",
      "Color": "",
      "Gramos": "",
    });
  }
  return filas;
}

export function exportarTrabajosCSV(trabajos: Trabajo[]): void {
  const filas = trabajos.flatMap(filasDeTrabajo);
  descargarCSV(`trabajos_${hoy()}.csv`, filas, [...COLUMNAS]);
}
