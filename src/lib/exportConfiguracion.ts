import type { Config, Material } from "../types";
import { descargarCSV } from "./csv";
import { hoy } from "../utils";

const COLUMNAS_PARAMS = [
  "Parámetro",
  "Valor",
] as const;

type FilaParam = Record<(typeof COLUMNAS_PARAMS)[number], string | number>;

const COLUMNAS_MATS = [
  "Material",
  "Variante",
  "Costo (Bs/kg)",
] as const;

type FilaMat = Record<(typeof COLUMNAS_MATS)[number], string | number>;

export function exportarConfiguracionCSV(cfg: Config, mats: Material[]): void {
  const filasParams: FilaParam[] = [
    { "Parámetro": "Costo electricidad (Bs/kWh)", "Valor": cfg.electricidadKwh },
    { "Parámetro": "Consumo impresora (kW)", "Valor": cfg.consumoKw },
    { "Parámetro": "Desgaste por hora (Bs)", "Valor": cfg.desgastePorHora },
    { "Parámetro": "Alerta de stock (g)", "Valor": cfg.alertaGramos },
  ];
  descargarCSV(`configuracion_${hoy()}.csv`, filasParams, [...COLUMNAS_PARAMS]);

  const filasMats: FilaMat[] = mats.flatMap((m) =>
    (m.variantes.length ? m.variantes : ["Estándar"]).map((v) => ({
      "Material": m.nombre,
      "Variante": v,
      "Costo (Bs/kg)": m.costo,
    }))
  );
  descargarCSV(`materiales_${hoy()}.csv`, filasMats, [...COLUMNAS_MATS]);
}
