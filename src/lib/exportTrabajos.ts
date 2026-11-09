import type { Trabajo, DetalleItem, Linea } from "../types";
import { descargarCSV } from "./csv";
import { hoy, refTrabajo, fmtFechaHora } from "../utils";

const COLUMNAS = [
  "Referencia",
  "Número",
  "Fecha de creación",
  "Última modificación",
  "Fecha",
  "Fecha de entrega",
  "Estado",
  "Cotizado por",
  "Cliente",
  "Teléfono",
  "Email",
  "Ciudad",
  "Pieza",
  "Descripción",
  "Cantidad",
  "Horas",
  "Mano de obra",
  "Markup %",
  "Total del trabajo",
  "Notas",
  "Tipo de detalle",
  "Item",
  "Descripción del item",
  "Cantidad de piezas del item",
  "Horas del item",
  "Minutos del item",
  "Mano de obra del item",
  "Material",
  "Tipo de material",
  "Color",
  "Gramos",
  "Costo extra",
] as const;

type FilaTrabajo = Record<(typeof COLUMNAS)[number], string | number>;

const DETALLE_VACIO = {
  "Item": "",
  "Descripción del item": "",
  "Cantidad de piezas del item": "",
  "Horas del item": "",
  "Minutos del item": "",
  "Mano de obra del item": "",
  "Material": "",
  "Tipo de material": "",
  "Color": "",
  "Gramos": "",
  "Costo extra": "",
};

function filaBase(t: Trabajo): FilaTrabajo {
  return {
    "Referencia": refTrabajo(t),
    "Número": t.numero,
    "Fecha de creación": fmtFechaHora(t.fechaCreacion),
    "Última modificación": fmtFechaHora(t.updatedAt),
    "Fecha": t.fecha,
    "Fecha de entrega": t.fechaEntrega,
    "Estado": t.estado,
    "Cotizado por": t.cotizador,
    "Cliente": t.cliente,
    "Teléfono": t.telefono,
    "Email": t.email,
    "Ciudad": t.ciudad,
    "Pieza": t.pieza,
    "Descripción": t.descripcion,
    "Cantidad": t.cantidad,
    "Horas": t.horas,
    "Mano de obra": t.manoObra,
    "Markup %": t.markup,
    "Total del trabajo": t.total,
    "Notas": t.notas,
    "Tipo de detalle": "",
    ...DETALLE_VACIO,
  };
}

function filaItem(base: FilaTrabajo, item: DetalleItem, tipo: string): FilaTrabajo {
  return {
    ...base,
    "Tipo de detalle": tipo,
    "Item": item.pieza,
    "Descripción del item": item.descripcion,
    "Cantidad de piezas del item": item.cantidad,
    "Horas del item": item.horas,
    "Minutos del item": item.minutos,
    "Mano de obra del item": item.manoObra,
  };
}

function filaMaterial(base: FilaTrabajo, mat: Linea, tipo: string): FilaTrabajo {
  return {
    ...base,
    "Tipo de detalle": tipo,
    "Material": mat.nombre,
    "Tipo de material": mat.tipo,
    "Color": mat.color,
    "Gramos": mat.gramos,
  };
}

function filasDeTrabajo(t: Trabajo): FilaTrabajo[] {
  const base = filaBase(t);
  const filas: FilaTrabajo[] = [];

  for (const item of t.items ?? []) {
    const datosItem = filaItem(base, item, "Item");
    if (!item.materiales?.length) {
      filas.push(datosItem);
      continue;
    }
    for (const mat of item.materiales) {
      filas.push(filaMaterial(datosItem, mat, "Material del item"));
    }
  }
  for (const mat of t.lineas ?? []) filas.push(filaMaterial(base, mat, "Material general"));
  for (const extra of t.extras ?? []) {
    filas.push({ ...base, "Tipo de detalle": "Extra", "Descripción del item": extra.descripcion, "Costo extra": extra.costo });
  }

  return filas.length ? filas : [base];
}

export function exportarTrabajosCSV(trabajos: Trabajo[]): void {
  const filas = trabajos.flatMap(filasDeTrabajo);
  descargarCSV(`trabajos_${hoy()}.csv`, filas, [...COLUMNAS]);
}
