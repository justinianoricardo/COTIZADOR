import type { Config, Material, Inventario, Trabajo, Desglose, DetalleItem, DesgloseItem, Linea } from "./types";
import { uid } from "./utils";

// ---- Pestañas y equipo ----
export const TABS = ["Cotizador", "Trabajos", "Inventario", "Dashboard", "Configuración"] as const;
export const EQUIPO = ["Ricardo", "Rosario"];

// ---- Configuración por defecto ----
export const CFG_DEFAULT: Config = {
  electricidadKwh: 1.021,
  consumoKw: 0.15,
  desgastePorHora: 3.5,
  alertaGramos: 100,
};

// ---- Materiales por defecto ----
export const MATS_DEFAULT: Material[] = [
  { id: "PLA", nombre: "PLA", costo: 80, variantes: ["Estándar", "PLA+", "Mate", "Seda", "Mármol", "Fibra de Carbono", "Madera", "Fluorescente", "Metálico", "Glitter", "Cambio de Color"] },
  { id: "PLA+", nombre: "PLA+", costo: 110, variantes: ["Estándar", "Resistente al impacto", "Alta temperatura"] },
  { id: "PETG", nombre: "PETG", costo: 120, variantes: ["Estándar", "Transparente", "CF (fibra carbono)"] },
  { id: "ABS", nombre: "ABS", costo: 100, variantes: ["Estándar", "ABS+", "CF (fibra carbono)"] },
  { id: "TPU", nombre: "TPU", costo: 150, variantes: ["Shore 95A", "Shore 85A (suave)", "Shore 60A (muy suave)"] },
  { id: "Resina", nombre: "Resina", costo: 200, variantes: ["Estándar", "ABS-Like", "Flexible", "Transparente", "Water-Washable"] },
  { id: "ASA", nombre: "ASA", costo: 130, variantes: ["Estándar", "CF (fibra carbono)"] },
  { id: "Nylon", nombre: "Nylon", costo: 160, variantes: ["PA6", "PA12", "PA6-CF", "PA12-CF"] },
];

// ---- Tipos de material (variantes) ----
export const TIPOS_MAT: Record<string, string[]> = {
  PLA: ["Estándar", "PLA+", "Mate", "Seda", "Mármol", "Fibra de Carbono", "Madera", "Fluorescente", "Metálico", "Glitter", "Cambio de Color"],
  "PLA+": ["Estándar", "Resistente al impacto", "Alta temperatura"],
  PETG: ["Estándar", "Transparente", "CF (fibra carbono)"],
  ABS: ["Estándar", "ABS+", "CF (fibra carbono)"],
  TPU: ["Shore 95A", "Shore 85A (suave)", "Shore 60A (muy suave)"],
  Resina: ["Estándar", "ABS-Like", "Flexible", "Transparente", "Water-Washable"],
  ASA: ["Estándar", "CF (fibra carbono)"],
  Nylon: ["PA6", "PA12", "PA6-CF", "PA12-CF"],
};

export const COLORES_MAT = [
  "Blanco", "Negro", "Gris", "Rojo", "Azul", "Verde", "Amarillo",
  "Naranja", "Morado", "Rosa", "Marrón", "Transparente", "Plateado", "Dorado", "Otro",
];

// ---- Paleta Chely Studio 3D ----
export const CHELY = {
  rosa: "#F7B4C8",
  lavanda: "#CDB4F3",
  lila: "#A78BFA",
  dorado: "#F7D9A6",
  perla: "#F2F2F6",
  // versiones más oscuras para texto sobre fondo claro
  rosaOscuro: "#c46a8e",
  lilaOscuro: "#7c3aed",
  lilaMedia: "#8B5CF6",
  // fondo general
  fondo: "#fdf6ff",
  // gradiente de marca
  grad: "linear-gradient(135deg, #F7B4C8 0%, #CDB4F3 50%, #A78BFA 100%)",
  gradInv: "linear-gradient(135deg, #A78BFA 0%, #CDB4F3 50%, #F7B4C8 100%)",
  gradDorado: "linear-gradient(135deg, #F7D9A6 0%, #F7B4C8 100%)",
};

export const BADGE_COLORS = [CHELY.lilaMedia, "#27ae60", "#e67e22", CHELY.rosa, "#e74c3c", "#1abc9c"];

export const estadoColor: Record<string, string> = {
  Pendiente: "#e67e22",
  Confirmado: "#27ae60",
  Cancelado: "#e74c3c",
};

// ---- Colores por sección — identidad Chely Studio 3D ----
export const SEC: Record<string, { bg: string; border: string; head: string; icon: string }> = {
  cotizador: { bg: "#fdf0f5", border: "#F7B4C8", head: "#c46a8e", icon: "✨" },
  cliente:   { bg: "#f5f0ff", border: "#CDB4F3", head: "#7c3aed", icon: "🦄" },
  trabajo:   { bg: "#fdf6ee", border: "#F7D9A6", head: "#9a6200", icon: "🖨" },
  material:  { bg: "#f5f0ff", border: "#A78BFA", head: "#6d28d9", icon: "🧵" },
  extra:     { bg: "#fdf0f5", border: "#F7B4C8", head: "#be185d", icon: "➕" },
  params:    { bg: "#fdf8f0", border: "#F7D9A6", head: "#92400e", icon: "⚙️" },
  resumen:   { bg: "#f5f0ff", border: "#A78BFA", head: "#6d28d9", icon: "💎" },
};

export const TAB_COLORS = [CHELY.lilaMedia, "#27ae60", CHELY.lila, "#e67e22", "#6b7280"];

// ---- Item vacío ----
export function emptyItem(): DetalleItem {
  return { id: uid(), pieza: "", descripcion: "", cantidad: 1, horas: 1, minutos: 0, manoObra: 0, materiales: [] };
}

// ---- Desglose por item individual ----
export function calcDesgloseItem(
  item: { cantidad: number; horas: number; minutos?: number; manoObra?: number; materiales?: { nombre: string; gramos: number }[] },
  mats: Material[],
  cfg: Config,
  markup: number
): DesgloseItem {
  const cMat = (item.materiales || []).reduce((s, m) => {
    const mat = mats.find((x) => x.id === m.nombre) || mats[0];
    return s + (m.gramos / 1000) * (mat?.costo || 0);
  }, 0);
  const totalHoras = (item.horas || 0) + (Number(item.minutos) || 0) / 60;
  const cFijo = (cfg.electricidadKwh * cfg.consumoKw + cfg.desgastePorHora) * totalHoras;
  const cMO = Number(item.manoObra) || 0;
  const costoTotal = cMat + cFijo + cMO;
  const cantidad = Math.max(1, item.cantidad || 1);
  const costoPorUnidad = costoTotal / cantidad;
  const precioPorUnidad = costoPorUnidad * (1 + markup / 100);
  const precioItem = precioPorUnidad * cantidad;
  return { cMat, cFijo, cMO, costoTotal, costoPorUnidad, precioPorUnidad, precioItem };
}

// ---- Trabajo vacío ----
export function emptyCot(cotizador: string = EQUIPO[0]): Trabajo {
  return {
    id: uid(),
    numero: 0,
    cotizador,
    cliente: "",
    telefono: "",
    email: "",
    ciudad: "",
    pieza: "",
    descripcion: "",
    cantidad: 1,
    items: [emptyItem()],
    lineas: [],
    extras: [],
    horas: 2,
    manoObra: 0,
    markup: 40,
    notas: "",
    fecha: "",
    fechaEntrega: "",
    estado: "Pendiente",
    total: 0,
    fechaCreacion: "",
    updatedAt: "",
  };
}

// ---- Inventario por defecto ----
export const INV_DEFAULT: Inventario[] = [
  { id: uid(), material: "PLA", tipo: "Estándar", color: "Blanco", marca: "", lote: "L-001", fecha: "2025-01-10", grInicial: 1000, grUsado: 350, grPurga: 15 },
  { id: uid(), material: "PLA", tipo: "Seda", color: "Dorado", marca: "", lote: "L-002", fecha: "2025-03-05", grInicial: 1000, grUsado: 120, grPurga: 8 },
  { id: uid(), material: "PETG", tipo: "Estándar", color: "Negro", marca: "", lote: "L-003", fecha: "2025-04-20", grInicial: 1000, grUsado: 680, grPurga: 22 },
  { id: uid(), material: "Resina", tipo: "ABS-Like", color: "Transparente", marca: "", lote: "L-004", fecha: "2025-05-01", grInicial: 1000, grUsado: 920, grPurga: 30 },
];

// ---- Trabajos de ejemplo ----
export function trabajosDemo(): Trabajo[] {
  return [
    {
      id: "t1",
      numero: 1,
      cotizador: "Ricardo",
      cliente: "María López",
      telefono: "76543210",
      email: "maria@mail.com",
      ciudad: "Santa Cruz",
      pieza: "Soporte de pared",
      descripcion: "Soporte TV 55\"",
      cantidad: 2,
      items: [
        { id: "i1a", pieza: "Soporte de pared", descripcion: "Soporte TV 55\"", cantidad: 2, horas: 3, minutos: 0, manoObra: 50, materiales: [{ id: "l1", nombre: "PLA", tipo: "Estándar", color: "Blanco", gramos: 150 }] }
      ],
      lineas: [],
      extras: [],
      horas: 3,
      manoObra: 50,
      markup: 40,
      estado: "Confirmado",
      fecha: "2025-05-10",
      fechaEntrega: "2025-05-15",
      notas: "Urgente",
      total: 0,
      fechaCreacion: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "t2",
      numero: 2,
      cotizador: "Rosario",
      cliente: "Carlos Méndez",
      telefono: "71234567",
      email: "",
      ciudad: "Cochabamba",
      pieza: "Carcasa electrónica",
      descripcion: "Caja Arduino",
      cantidad: 1,
      items: [
        { id: "i2a", pieza: "Carcasa electrónica", descripcion: "Caja Arduino", cantidad: 1, horas: 5, minutos: 0, manoObra: 80, materiales: [{ id: "l2", nombre: "PETG", tipo: "Estándar", color: "Negro", gramos: 200 }] }
      ],
      lineas: [],
      extras: [{ id: "e1", descripcion: "Resina UV", costo: 15 }],
      horas: 5,
      manoObra: 80,
      markup: 50,
      estado: "Pendiente",
      fecha: "2025-06-02",
      fechaEntrega: "2025-06-20",
      notas: "",
      total: 0,
      fechaCreacion: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "t3",
      numero: 3,
      cotizador: "Ricardo",
      cliente: "Ana Torres",
      telefono: "79876543",
      email: "ana@mail.com",
      ciudad: "Santa Cruz",
      pieza: "Figura decorativa",
      descripcion: "Dragón 15cm",
      cantidad: 3,
      items: [
        { id: "i3a", pieza: "Figura decorativa", descripcion: "Dragón 15cm", cantidad: 3, horas: 2, minutos: 0, manoObra: 30, materiales: [
          { id: "l3", nombre: "Resina", tipo: "ABS-Like", color: "Transparente", gramos: 80 },
          { id: "l4", nombre: "PLA", tipo: "Seda", color: "Dorado", gramos: 20 }
        ] }
      ],
      lineas: [],
      extras: [],
      horas: 2,
      manoObra: 30,
      markup: 60,
      estado: "Confirmado",
      fecha: "2025-06-15",
      fechaEntrega: "2025-06-25",
      notas: "",
      total: 0,
      fechaCreacion: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
  ];
}

// ---- Helpers de cálculo ----
export function calcDesglose(
  t: { cantidad?: number; items?: { cantidad: number; horas: number; minutos?: number; manoObra?: number; materiales?: Linea[] }[]; lineas?: { nombre: string; gramos: number }[]; horas?: number; manoObra?: number; markup?: number; extras?: { costo: number }[] },
  mats: Material[],
  cfg: Config
): Desglose {
  const items = t.items || [];
  const cantidadFromItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);
  const horasFromItems = items.reduce((s, i) => s + (i.horas || 0) + (Number((i as DetalleItem).minutos) || 0) / 60, 0);

  const cantidad = Math.max(1, cantidadFromItems || t.cantidad || 1);
  const totalHoras = horasFromItems || t.horas || 0;

  // Materiales: sumar los de cada item (si existen) o usar lineas globales (legacy)
  const allMateriales: Linea[] = items.flatMap((i) => i.materiales || []);
  const lineasAUsar = allMateriales.length > 0 ? allMateriales : (t.lineas || []);

  const cMat = lineasAUsar.reduce((s, l) => {
    const m = mats.find((m) => m.id === l.nombre) || mats[0];
    return s + (l.gramos / 1000) * (m?.costo || 0);
  }, 0);
  const cFijo = (cfg.electricidadKwh * cfg.consumoKw + cfg.desgastePorHora) * totalHoras;
  // Mano de obra: suma desde items si alguno tiene valor, si no usa el global
  const cMO_items = items.reduce((s, i) => s + (Number(i.manoObra) || 0), 0);
  const cMO = cMO_items > 0 ? cMO_items : (Number(t.manoObra) || 0);
  const cExt = (t.extras || []).reduce((s, e) => s + (Number(e.costo) || 0), 0);
  // Costo total incluye material, fijos, mano de obra y extras
  const costoTotalProduccion = cMat + cFijo + cMO + cExt;
  const costoPorUnidad = costoTotalProduccion / cantidad;
  // El % de ganancia se aplica DESPUES del costo total
  const precioPorUnidad = costoPorUnidad * (1 + (t.markup || 0) / 100);
  const precioTotal = precioPorUnidad * cantidad;
  return { cMat, cFijo, cMO, cExt, costoTotalProduccion, costoPorUnidad, precioPorUnidad, precioTotal, cantidad };
}

export const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
