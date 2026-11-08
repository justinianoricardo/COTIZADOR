import type { Inventario } from "../types";
import { descargarCSV } from "./csv";
import { hoy } from "../utils";

const COLUMNAS = [
  "Material",
  "Tipo",
  "Color",
  "Marca",
  "Lote",
  "Fecha de ingreso",
  "Gramos iniciales",
  "Gramos usados",
  "Gramos de purga",
  "Gramos disponibles",
  "Porcentaje disponible",
  "Alerta de stock",
] as const;

type FilaInventario = Record<(typeof COLUMNAS)[number], string | number>;

export function exportarInventarioCSV(inventario: Inventario[], alertaGramos: number): void {
  const filas: FilaInventario[] = inventario.map((r) => {
    const disponibles = r.grInicial - r.grUsado - r.grPurga;
    return {
      "Material": r.material,
      "Tipo": r.tipo,
      "Color": r.color,
      "Marca": r.marca,
      "Lote": r.lote,
      "Fecha de ingreso": r.fecha,
      "Gramos iniciales": r.grInicial,
      "Gramos usados": r.grUsado,
      "Gramos de purga": r.grPurga,
      "Gramos disponibles": disponibles,
      "Porcentaje disponible": r.grInicial > 0 ? Math.round((disponibles / r.grInicial) * 100) : 0,
      "Alerta de stock": disponibles < alertaGramos ? "Sí" : "No",
    };
  });
  descargarCSV(`inventario_${hoy()}.csv`, filas, [...COLUMNAS]);
}
