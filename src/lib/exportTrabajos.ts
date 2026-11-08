import type { Trabajo, DetalleItem, Linea } from "../types";
import { descargarCSV } from "./csv";
import { hoy } from "../utils";

const COLUMNAS = [
  "Número",
  "Fecha",
  "Estado",
  "Cotizado por",
  "Cliente",
  "Teléfono",
  "Email",
  "Ciudad",
  "Fecha de entrega",
  "Markup %",
  "Total del trabajo",
  "Tipo de detalle",
  "Item",
  "Descripción del item",
  "Cantidad de piezas",
  "Horas",
  "Minutos",
  "Mano de obra",
  "Material",
  "Tipo de material",
  "Color",
  "Gramos",
  "Costo extra",
  "Notas",
] as const;

type FilaTrabajo = Record<(typeof COLUMNAS)[number], string | number>;

function filaBase(t: Trabajo): FilaTrabajo {
  return {
    "Número": t.numero,
    "Fecha": t.fecha,
    "Estado": t.estado,
    "Cotizado por": t.cotizador,
    "Cliente": t.cliente,
    "Teléfono": t.telefono,
    "Email": t.email,
    "Ciudad": t.ciudad,
    "Fecha de entrega": t.fechaEntrega,
    "Markup %": t.markup,
    "Total del trabajo": t.total,
    "Tipo de detalle": "",
    "Item": "",
    "Descripción del item": "",
    "Cantidad de piezas": "",
    "Horas": "",
    "Minutos": "",
    "Mano de obra": "",
    "Material": "",
    "Tipo de material": "",
    "Color": "",
    "Gramos": "",
    "Costo extra": "",
    "Notas": t.notas,
  };
}

function filaMaterial(fila: FilaTrabajo, mat: Linea, tipo: string): FilaTrabajo {
  return {
    ...fila,
    "Tipo de detalle": tipo,
    "Material": mat.nombre,
    "Tipo de material": mat.tipo,
    "Color": mat.color,
    "Gramos": mat.gramos,
  };
}

function filasItem(base: FilaTrabajo, item: DetalleItem): FilaTrabajo[] {
  const datosItem: FilaTrabajo = {
    ...base,
    "Item": item.pieza,
    "Descripción del item": item.descripcion,
    "Cantidad de piezas": item.cantidad,
    "Horas": item.horas,
    "Minutos": item.minutos,
    "Mano de obra": item.manoObra,
  };
  if (!item.materiales?.length) return [{ ...datosItem, "Tipo de detalle": "Item" }];
  return item.materiales.map((mat) => filaMaterial(datosItem, mat, "Material del item"));
}

function filasDeTrabajo(t: Trabajo): FilaTrabajo[] {
  const base = filaBase(t);
  const filas: FilaTrabajo[] = [];

  for (const item of t.items ?? []) filas.push(...filasItem(base, item));
  for (const mat of t.lineas ?? []) filas.push(filaMaterial(base, mat, "Material general"));
  for (const extra of t.extras ?? []) {
    filas.push({
      ...base,
      "Tipo de detalle": "Extra",
      "Descripción del item": extra.descripcion,
      "Costo extra": extra.costo,
    });
  }

  return filas.length ? filas : [{ ...base, "Tipo de detalle": "Sin detalle" }];
}

export function exportarTrabajosCSV(trabajos: Trabajo[]): void {
  const filas = trabajos.flatMap(filasDeTrabajo);
  descargarCSV(`trabajos_${hoy()}.csv`, filas, [...COLUMNAS]);
}
