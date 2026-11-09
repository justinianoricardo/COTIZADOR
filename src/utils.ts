// ---- Utilidades puras (sin dependencias de React) ----

export function uid(): string {
  return Math.random().toString(36).slice(2);
}

// Convierte el valor de un input numérico a number, permitiendo borrar el primer dígito.
// String vacío (usuario borró todo) → regresa 0 sin fijar ceros.
export function toNum(raw: string): number {
  const s = String(raw).replace(/[^0-9.]/g, "");
  if (s === "" || s === ".") return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function fmt(n: number): string {
  return "Bs " + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function hoy(): string {
  return new Date().toISOString().split("T")[0];
}

export function ahoraISO(): string {
  return new Date().toISOString();
}

export function fmtFechaHora(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function refTrabajo(t: { numero: number; fechaCreacion: string; fecha: string }): string {
  const año = new Date(t.fechaCreacion || t.fecha || Date.now()).getFullYear();
  return `${año}-${String(t.numero || 0).padStart(4, "0")}`;
}

export function fmtFechaCorta(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let id: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (id) clearTimeout(id);
  };
  const run = (...args: Parameters<T>) => {
    cancel();
    id = setTimeout(() => fn(...args), ms);
  };
  run.cancel = cancel;
  return run;
}
