import type { JobItem, AppSettings, Material } from './types';

export function calcItemCosts(
  item: JobItem,
  settings: AppSettings,
  materialsMap: Record<string, Material>
) {
  const totalHoras = (item.horas + (item.minutos ?? 0) / 60) * item.cantidad;
  const electricidad = totalHoras * settings.consumo_kw * settings.electricidad_kwh;
  const desgaste = totalHoras * settings.desgaste_por_hora;
  const costosF = electricidad + desgaste;

  let costoMaterial = 0;
  let totalGramos = 0;
  for (const mat of item.materiales) {
    const grTotales = mat.gramos * item.cantidad;
    totalGramos += grTotales;
    const precioPorGramo = (materialsMap[mat.nombre]?.costo ?? 0) / 1000;
    costoMaterial += grTotales * precioPorGramo;
  }

  const manoObra = item.manoObra * item.cantidad;
  const costoBase = costoMaterial + costosF;

  return {
    costoMaterial,
    costosF,
    electricidad,
    desgaste,
    manoObra,
    costoBase,
    totalHoras,
    totalGramos,
  };
}

export function calcJobTotal(
  items: JobItem[],
  extras: { monto: number }[],
  markup: number,
  settings: AppSettings,
  materialsMap: Record<string, Material>
): number {
  let baseTotal = 0;
  let totalManoObra = 0;
  for (const item of items) {
    const { costoBase, manoObra } = calcItemCosts(item, settings, materialsMap);
    baseTotal += costoBase;
    totalManoObra += manoObra;
  }
  let extrasTotal = 0;
  for (const e of extras) {
    extrasTotal += e.monto;
  }
  const costoTotal = baseTotal + totalManoObra + extrasTotal;
  return costoTotal * (1 + markup / 100);
}

export function formatBs(n: number): string {
  return `Bs ${n.toFixed(2)}`;
}
