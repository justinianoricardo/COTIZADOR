export interface Material {
  id: string;
  nombre: string;
  costo: number;
  sort_order: number;
  variantes: string[];
}

export interface MaterialLine {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  gramos: number;
}

export interface JobItem {
  id: string;
  pieza: string;
  descripcion: string;
  cantidad: number;
  horas: number;
  minutos?: number;
  manoObra: number;
  materiales: MaterialLine[];
}

export interface Extra {
  id: string;
  descripcion: string;
  monto: number;
}

export interface Job {
  id: string;
  numero?: number;
  cotizador: string;
  cliente: string;
  telefono: string;
  email: string;
  ciudad: string;
  items: JobItem[];
  extras: Extra[];
  markup: number;
  notas: string;
  fecha: string;
  fecha_entrega: string;
  estado: string;
  total: number;
  fecha_creacion: string;
  updated_at?: string;
}

export interface AppSettings {
  key: string;
  electricidad_kwh: number;
  consumo_kw: number;
  desgaste_por_hora: number;
  alerta_gramos: number;
  colores_extra: string[];
}

export interface InventoryItem {
  id: string;
  material: string;
  tipo: string;
  color: string;
  marca?: string;
  lote: string;
  fecha: string;
  gr_inicial: number;
  gr_usado: number;
  gr_purga: number;
}
