import type {
  Trabajo,
  Inventario,
  Material,
  JobRow,
  InventoryRow,
  MaterialRow,
  SettingsRow,
} from "../types";
import { uid } from "../utils";

// ---- Jobs ----
export function jobRowToTrabajo(r: JobRow): Trabajo {
  return {
    id: r.id,
    numero: Number(r.numero ?? 0),
    cotizador: r.cotizador ?? "",
    cliente: r.cliente ?? "",
    telefono: r.telefono ?? "",
    email: r.email ?? "",
    ciudad: r.ciudad ?? "",
    pieza: r.pieza ?? "",
    descripcion: r.descripcion ?? "",
    cantidad: Number(r.cantidad ?? 1),
    items: r.items ?? [],
    lineas: r.lineas ?? [],
    extras: r.extras ?? [],
    horas: Number(r.horas ?? 2),
    manoObra: Number(r.mano_obra ?? 0),
    markup: Number(r.markup ?? 40),
    notas: r.notas ?? "",
    fecha: r.fecha ?? "",
    fechaEntrega: r.fecha_entrega ?? "",
    estado: (r.estado as Trabajo["estado"]) ?? "Pendiente",
    total: Number(r.total ?? 0),
    fechaCreacion: r.fecha_creacion ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.fecha_creacion ?? r.created_at ?? new Date().toISOString(),
  };
}

export function trabajoToJobRow(t: Trabajo): JobRow {
  return {
    id: t.id,
    numero: t.numero,
    cotizador: t.cotizador,
    cliente: t.cliente,
    telefono: t.telefono,
    email: t.email,
    ciudad: t.ciudad,
    pieza: t.pieza,
    descripcion: t.descripcion,
    cantidad: t.cantidad,
    items: t.items,
    lineas: t.lineas,
    extras: t.extras,
    horas: t.horas,
    mano_obra: t.manoObra,
    markup: t.markup,
    notas: t.notas,
    fecha: t.fecha,
    fecha_entrega: t.fechaEntrega,
    estado: t.estado,
    total: t.total,
    fecha_creacion: t.fechaCreacion,
    updated_at: t.updatedAt,
  };
}

// ---- Inventory ----
export function inventoryRowToInventario(r: InventoryRow): Inventario {
  return {
    id: r.id,
    material: r.material ?? "",
    tipo: r.tipo ?? "",
    color: r.color ?? "",
    marca: r.marca ?? "",
    lote: r.lote ?? "",
    fecha: r.fecha ?? "",
    grInicial: Number(r.gr_inicial ?? 1000),
    grUsado: Number(r.gr_usado ?? 0),
    grPurga: Number(r.gr_purga ?? 0),
  };
}

export function inventarioToInventoryRow(i: Inventario): InventoryRow {
  return {
    id: i.id,
    material: i.material,
    tipo: i.tipo,
    color: i.color,
    marca: i.marca,
    lote: i.lote,
    fecha: i.fecha,
    gr_inicial: i.grInicial,
    gr_usado: i.grUsado,
    gr_purga: i.grPurga,
  };
}

// ---- Materials ----
export function materialRowToMaterial(r: MaterialRow): Material {
  return {
    id: r.id,
    nombre: r.nombre,
    costo: Number(r.costo ?? 0),
    variantes: Array.isArray(r.variantes) ? r.variantes : ["Estándar"],
  };
}

export function materialToMaterialRow(m: Material, sortOrder: number): MaterialRow {
  return {
    id: m.id,
    nombre: m.nombre,
    costo: m.costo,
    variantes: m.variantes || ["Estándar"],
    sort_order: sortOrder,
  };
}

// ---- Settings ----
export function settingsRowToConfig(r: SettingsRow) {
  return {
    cfg: {
      electricidadKwh: Number(r.electricidad_kwh ?? 1.021),
      consumoKw: Number(r.consumo_kw ?? 0.15),
      desgastePorHora: Number(r.desgaste_por_hora ?? 3.5),
      alertaGramos: Number(r.alerta_gramos ?? 100),
    },
    coloresExtra: Array.isArray(r.colores_extra) ? r.colores_extra : [],
  };
}

// Crea un id temporal válido si el trabajo vino sin id
export function ensureId(id: string | undefined): string {
  return id && id.length ? id : uid();
}
