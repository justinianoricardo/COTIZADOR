// ---- Modelos de dominio (espejan el estado original del componente) ----

export type Linea = {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  gramos: number;
};

export type Extra = {
  id: string;
  descripcion: string;
  costo: number;
};

export type DetalleItem = {
  id: string;
  pieza: string;
  descripcion: string;
  cantidad: number;
  horas: number;
  minutos: number;
  manoObra: number;
  materiales: Linea[];
};

export type DesgloseItem = {
  cMat: number;
  cFijo: number;
  cMO: number;
  costoTotal: number;
  costoPorUnidad: number;
  precioPorUnidad: number;
  precioItem: number;
};

export type Trabajo = {
  id: string;
  numero: number;
  cotizador: string;
  cliente: string;
  telefono: string;
  email: string;
  ciudad: string;
  pieza: string;
  descripcion: string;
  cantidad: number;
  items: DetalleItem[];
  lineas: Linea[];
  extras: Extra[];
  horas: number;
  manoObra: number;
  markup: number;
  notas: string;
  fecha: string;
  fechaEntrega: string;
  estado: "Pendiente" | "Confirmado" | "Cancelado";
  total: number;
  fechaCreacion: string;
  updatedAt: string;
};

export type Inventario = {
  id: string;
  material: string;
  tipo: string;
  color: string;
  marca: string;
  lote: string;
  fecha: string;
  grInicial: number;
  grUsado: number;
  grPurga: number;
};

export type Material = {
  id: string;
  nombre: string;
  costo: number;
  variantes: string[];
};

export type Config = {
  electricidadKwh: number;
  consumoKw: number;
  desgastePorHora: number;
  alertaGramos: number;
};

export type Desglose = {
  cMat: number;
  cFijo: number;
  cMO: number;
  cExt: number;
  costoTotalProduccion: number;
  costoPorUnidad: number;
  precioPorUnidad: number;
  precioTotal: number;
  cantidad: number;
};

// ---- Tipos fila de Supabase (snake_case) ----

export type JobRow = {
  id: string;
  numero: number;
  cotizador: string;
  cliente: string;
  telefono: string;
  email: string;
  ciudad: string;
  pieza: string;
  descripcion: string;
  cantidad: number;
  items: DetalleItem[];
  lineas: Linea[];
  extras: Extra[];
  horas: number;
  mano_obra: number;
  markup: number;
  notas: string;
  fecha: string;
  fecha_entrega: string;
  estado: string;
  total: number;
  fecha_creacion: string;
  created_at?: string;
  updated_at?: string;
};

export type InventoryRow = {
  id: string;
  material: string;
  tipo: string;
  color: string;
  marca: string;
  lote: string;
  fecha: string;
  gr_inicial: number;
  gr_usado: number;
  gr_purga: number;
  created_at?: string;
  updated_at?: string;
};

export type MaterialRow = {
  id: string;
  nombre: string;
  costo: number;
  variantes: string[];
  sort_order: number;
};

export type SettingsRow = {
  key: string;
  electricidad_kwh: number;
  consumo_kw: number;
  desgaste_por_hora: number;
  alerta_gramos: number;
  colores_extra: string[];
  updated_at?: string;
};
