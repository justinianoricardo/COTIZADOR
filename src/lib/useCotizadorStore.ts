import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import type { Trabajo, Inventario, Material, Config } from "../types";
import type { JobRow, InventoryRow, MaterialRow, SettingsRow } from "../types";
import {
  jobRowToTrabajo,
  trabajoToJobRow,
  inventoryRowToInventario,
  inventarioToInventoryRow,
  materialRowToMaterial,
  materialToMaterialRow,
  settingsRowToConfig,
} from "./mappers";
import {
  MATS_DEFAULT,
  INV_DEFAULT,
  CFG_DEFAULT,
  trabajosDemo,
  calcDesglose,
} from "../constants";

export type SyncState = "cargando" | "listo" | "guardando" | "error";

export type AppData = {
  trabajos: Trabajo[];
  inv: Inventario[];
  mats: Material[];
  cfg: Config;
  coloresExtra: string[];
};

const EMPTY: AppData = {
  trabajos: [],
  inv: [],
  mats: MATS_DEFAULT,
  cfg: CFG_DEFAULT,
  coloresExtra: [],
};

// Recalcula total de cada trabajo antes de persistir
function withTotales(trabajos: Trabajo[], mats: Material[], cfg: Config): Trabajo[] {
  return trabajos.map((t) => ({ ...t, total: calcDesglose(t, mats, cfg).precioTotal }));
}

export function useCotizadorStore() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [sync, setSync] = useState<SyncState>("cargando");

  // marca para evitar escribir durante la carga inicial (crearía un bucle)
  const initialized = useRef(false);
  // guarda el último snapshot de datos que se envió a la BD, para no persistir
  // cuando el único cambio provino de un evento realtime.
  const lastSavedRef = useRef<string>("");

  // ---------- CARGA INICIAL ----------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // materiales
        const { data: matsRows } = (await supabase
          .from("materials")
          .select("*")
          .order("sort_order", { ascending: true })) as { data: MaterialRow[] | null };

        let mats: Material[] = (matsRows || []).map(materialRowToMaterial);
        if (mats.length === 0) {
          // sembrar materiales por defecto
          const seed = MATS_DEFAULT.map((m, i) => materialToMaterialRow(m, i + 1));
          await supabase.from("materials").upsert(seed, { onConflict: "id" });
          mats = MATS_DEFAULT.slice();
        }

        // settings
        const { data: settingsRow } = (await supabase
          .from("app_settings")
          .select("*")
          .eq("key", "main")
          .maybeSingle()) as { data: SettingsRow | null };

        let cfg = CFG_DEFAULT;
        let coloresExtra: string[] = [];
        if (settingsRow) {
          const parsed = settingsRowToConfig(settingsRow);
          cfg = parsed.cfg;
          coloresExtra = parsed.coloresExtra;
        } else {
          await supabase.from("app_settings").upsert({ key: "main" });
        }

        // trabajos
        const { data: jobsRows } = (await supabase
          .from("jobs")
          .select("*")
          .order("updated_at", { ascending: false })) as { data: JobRow[] | null };

        let trabajos: Trabajo[] = (jobsRows || []).map(jobRowToTrabajo);
        if (trabajos.length === 0) {
          const demo = trabajosDemo();
          const payload = demo.map((t) => trabajoToJobRow({ ...t, total: calcDesglose(t, mats, cfg).precioTotal }));
          await supabase.from("jobs").upsert(payload, { onConflict: "id" });
          trabajos = demo.map((t) => ({ ...t, total: calcDesglose(t, mats, cfg).precioTotal }));
        }

        // inventario
        const { data: invRows } = (await supabase
          .from("inventory")
          .select("*")) as { data: InventoryRow[] | null };

        let inv: Inventario[] = (invRows || []).map(inventoryRowToInventario);
        if (inv.length === 0) {
          const seed = INV_DEFAULT.map(inventarioToInventoryRow);
          await supabase.from("inventory").upsert(seed, { onConflict: "id" });
          inv = INV_DEFAULT.slice();
        }

        const snapshot: AppData = { trabajos, inv, mats, cfg, coloresExtra };
        const json = JSON.stringify(snapshot);
        lastSavedRef.current = json;

        if (!mounted) return;
        setData(snapshot);
        setSync("listo");
        initialized.current = true;
      } catch (err) {
        console.error("Error cargando datos:", err);
        if (mounted) setSync("error");
      }
    })();

    // ---------- REALTIME ----------
    const channel = supabase
      .channel("cotizador-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          applyJobEvent(payload as unknown as RealtimeEvent<JobRow>);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        (payload) => {
          applyInventoryEvent(payload as unknown as RealtimeEvent<InventoryRow>);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materials" },
        (payload) => {
          applyMaterialsEvent(payload as unknown as RealtimeEvent<MaterialRow>);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          applySettingsEvent(payload as unknown as RealtimeEvent<SettingsRow>);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- APLICADORES DE EVENTOS REALTIME ----------
  type RealtimeEvent<T = Record<string, unknown>> = {
    eventType: string;
    old: T | null;
    new: T | null;
  };

  function applyJobEvent(payload: RealtimeEvent<JobRow>) {
    if (!initialized.current) return;
    setData((prev) => {
      const row = payload.new;
      if (payload.eventType === "DELETE" && payload.old) {
        const next = prev.trabajos.filter((t) => t.id !== payload.old!.id);
        const snap = { ...prev, trabajos: next };
        lastSavedRef.current = JSON.stringify(snap);
        return snap;
      }
      if (!row) return prev;
      const t = jobRowToTrabajo(row);
      const exists = prev.trabajos.some((x) => x.id === t.id);
      // Reorder: updated/new jobs go to the front, preserving numero
      const jobs = exists
        ? [t, ...prev.trabajos.filter((x) => x.id !== t.id)]
        : [t, ...prev.trabajos];
      const snap = { ...prev, trabajos: jobs };
      lastSavedRef.current = JSON.stringify(snap);
      return snap;
    });
  }

  function applyInventoryEvent(payload: RealtimeEvent<InventoryRow>) {
    if (!initialized.current) return;
    setData((prev) => {
      const row = payload.new;
      if (payload.eventType === "DELETE" && payload.old) {
        const next = prev.inv.filter((r) => r.id !== payload.old!.id);
        const snap = { ...prev, inv: next };
        lastSavedRef.current = JSON.stringify(snap);
        return snap;
      }
      if (!row) return prev;
      const r = inventoryRowToInventario(row);
      const exists = prev.inv.some((x) => x.id === r.id);
      const inv = exists ? prev.inv.map((x) => (x.id === r.id ? r : x)) : [r, ...prev.inv];
      const snap = { ...prev, inv };
      lastSavedRef.current = JSON.stringify(snap);
      return snap;
    });
  }

  function applyMaterialsEvent(payload: RealtimeEvent<MaterialRow>) {
    if (!initialized.current) return;
    setData((prev) => {
      const row = payload.new;
      if (payload.eventType === "DELETE" && payload.old) {
        const next = prev.mats.filter((m) => m.id !== payload.old!.id);
        const snap = { ...prev, mats: next };
        lastSavedRef.current = JSON.stringify(snap);
        return snap;
      }
      if (!row) return prev;
      const m = materialRowToMaterial(row);
      const exists = prev.mats.some((x) => x.id === m.id);
      const mats = exists ? prev.mats.map((x) => (x.id === m.id ? m : x)) : [...prev.mats, m];
      const snap = { ...prev, mats };
      lastSavedRef.current = JSON.stringify(snap);
      return snap;
    });
  }

  function applySettingsEvent(payload: RealtimeEvent<SettingsRow>) {
    if (!initialized.current) return;
    setData((prev) => {
      const row = payload.new;
      if (!row) return prev;
      const { cfg, coloresExtra } = settingsRowToConfig(row);
      const snap = { ...prev, cfg, coloresExtra };
      lastSavedRef.current = JSON.stringify(snap);
      return snap;
    });
  }

  // ---------- AUTOGUARDADO ----------
  // Cada vez que el snapshot cambia y es distinto al último persistido,
  // calcula un debounce y envía upserts a las tablas afectadas.
  useEffect(() => {
    if (!initialized.current) return;

    const snapshot: AppData = {
      trabajos: withTotales(data.trabajos, data.mats, data.cfg),
      inv: data.inv,
      mats: data.mats,
      cfg: data.cfg,
      coloresExtra: data.coloresExtra,
    };

    const json = JSON.stringify(snapshot);
    if (json === lastSavedRef.current) return;
    // si todos los cambios provinieron de eventos realtime, json === lastSaved y no guardamos.
    // cuando el usuario hace un cambio local, json !== lastSaved y persistimos.

    setSync("guardando");
    const timer = setTimeout(async () => {
      try {
        // diff por tabla. Comparamos versiones para no reenviar lo que ya está en BD.
        const jobsPayload = snapshot.trabajos.map((t) => trabajoToJobRow(t));
        const invPayload = snapshot.inv.map((i) => inventarioToInventoryRow(i));
        const matsPayload = snapshot.mats.map((m, idx) => materialToMaterialRow(m, idx + 1));
        const settingsPayload = {
          key: "main",
          electricidad_kwh: snapshot.cfg.electricidadKwh,
          consumo_kw: snapshot.cfg.consumoKw,
          desgaste_por_hora: snapshot.cfg.desgastePorHora,
          alerta_gramos: snapshot.cfg.alertaGramos,
          colores_extra: snapshot.coloresExtra,
        };

        const [j, i, m, s] = await Promise.all([
          supabase.from("jobs").upsert(jobsPayload, { onConflict: "id" }),
          supabase.from("inventory").upsert(invPayload, { onConflict: "id" }),
          supabase.from("materials").upsert(matsPayload, { onConflict: "id" }),
          supabase.from("app_settings").upsert(settingsPayload, { onConflict: "key" }),
        ]);

        const anyError = j.error || i.error || m.error || s.error;
        // sync de ids eliminados
        // buscamos qué ids del servidor ya no están en el snapshot local
        await deleteRemoved("jobs", "id", snapshot.trabajos.map((x) => x.id));
        await deleteRemoved("inventory", "id", snapshot.inv.map((x) => x.id));
        await deleteRemoved("materials", "id", snapshot.mats.map((x) => x.id));

        if (anyError) {
          console.error("Errores al guardar:", { j: j.error, i: i.error, m: m.error, s: s.error });
          setSync("error");
        } else {
          lastSavedRef.current = json;
          setSync("listo");
        }
      } catch (err) {
        console.error("Error guardando:", err);
        setSync("error");
      }
    }, 700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.trabajos, data.inv, data.mats, data.cfg, data.coloresExtra]);

  // borra filas del servidor que ya no existen en el snapshot local
  async function deleteRemoved(table: string, column: string, keepIds: string[]) {
    const { data: existing } = await supabase.from(table).select(column);
    const rows = (existing || []) as unknown as Record<string, string>[];
    const toDelete: string[] = rows
      .map((r) => r[column])
      .filter((id) => !keepIds.includes(id));
    if (toDelete.length === 0) return;
    await supabase.from(table).delete().in(column, toDelete);
  }

  // ---------- API MUTABLE ----------
  const setTrabajos = useCallback((updater: Trabajo[] | ((prev: Trabajo[]) => Trabajo[])) => {
    setData((prev) => ({
      ...prev,
      trabajos: typeof updater === "function" ? (updater as (p: Trabajo[]) => Trabajo[])(prev.trabajos) : updater,
    }));
  }, []);

  const setInv = useCallback((updater: Inventario[] | ((prev: Inventario[]) => Inventario[])) => {
    setData((prev) => ({
      ...prev,
      inv: typeof updater === "function" ? (updater as (p: Inventario[]) => Inventario[])(prev.inv) : updater,
    }));
  }, []);

  const setMats = useCallback((updater: Material[] | ((prev: Material[]) => Material[])) => {
    setData((prev) => ({
      ...prev,
      mats: typeof updater === "function" ? (updater as (p: Material[]) => Material[])(prev.mats) : updater,
    }));
  }, []);

  const setCfg = useCallback((updater: Partial<Config> | ((prev: Config) => Config)) => {
    setData((prev) => ({
      ...prev,
      cfg: typeof updater === "function" ? (updater as (p: Config) => Config)(prev.cfg) : { ...prev.cfg, ...updater },
    }));
  }, []);

  const setColoresExtra = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setData((prev) => ({
      ...prev,
      coloresExtra: typeof updater === "function" ? (updater as (p: string[]) => string[])(prev.coloresExtra) : updater,
    }));
  }, []);

  return {
    ...data,
    sync,
    setTrabajos,
    setInv,
    setMats,
    setCfg,
    setColoresExtra,
  };
}
