import { useMemo } from "react";
import type { Material, Desglose, Trabajo, Linea, Extra, DetalleItem, Inventario, Config } from "../types";
import { EQUIPO, COLORES_MAT, CHELY, emptyItem, calcDesgloseItem } from "../constants";
import { uid, fmt } from "../utils";
import { NumInput } from "./ui";

// Convierte YYYY-MM-DD → DD/MM/YYYY para mostrar
function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
// Convierte DD/MM/YYYY → YYYY-MM-DD para guardar
function displayToIso(val: string): string {
  const clean = val.replace(/[^0-9/]/g, "");
  const parts = clean.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
  }
  return val;
}
// Aplica máscara automática DD/MM/YYYY mientras escribe
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += "/";
    out += digits[i];
  }
  return out;
}
import { Seccion, Field, inpStyle, smlStyle } from "./ui";

type Props = {
  data: Partial<Trabajo>;
  onChange: (key: keyof Trabajo, val: unknown) => void;
  mats: Material[];
  cfg: Config;
  desglose: Desglose | null;
  coloresExtra?: string[];
  inv?: Inventario[];
};

const lineaVacia = (mats: Material[]): Linea => {
  const defaultMat = mats[0];
  return { id: uid(), nombre: defaultMat?.id || "PLA", tipo: defaultMat?.variantes?.[0] || "Estándar", color: "", gramos: 100 };
};
const extraVacio = (): Extra => ({ id: uid(), descripcion: "", costo: 0 });

export function FormCotizacion({ data, onChange, mats, cfg, desglose, coloresExtra = [], inv = [] }: Props) {
  // Colores disponibles basados en el inventario real (con stock)
  const coloresInventario = useMemo(() => {
    const coloresConStock = inv
      .filter((r) => r.grInicial - r.grUsado - r.grPurga > 0)
      .map((r) => r.color);
    return [...new Set(coloresConStock)];
  }, [inv]);

  // Todos los colores disponibles (inventario + extras + colores base para "Otro")
  const coloresDisponibles = useMemo(() => {
    const base = [...new Set([...coloresInventario, ...coloresExtra])];
    if (base.length === 0) {
      return [...COLORES_MAT.filter((c) => c !== "Otro"), "Otro"];
    }
    return [...base, "Otro"];
  }, [coloresInventario, coloresExtra]);

  if (!desglose) return null;

  // Actualizar un item completo
  function updItem(id: string, key: keyof DetalleItem, val: string | number | Linea[]) {
    const items = (data.items || []).map((i) => (i.id === id ? { ...i, [key]: val } as DetalleItem : i));
    onChange("items", items);
  }

  // Actualizar un material dentro de un item
  function updMaterialItem(itemId: string, matId: string, key: keyof Linea, val: string | number) {
    const items = (data.items || []).map((item) => {
      if (item.id !== itemId) return item;
      const materiales = (item.materiales || []).map((m) => {
        if (m.id !== matId) return m;
        const u = { ...m, [key]: val } as Linea;
        if (key === "nombre") {
          const mat = mats.find((x) => x.id === val);
          u.tipo = mat?.variantes?.[0] || "Estándar";
        }
        return u;
      });
      return { ...item, materiales };
    });
    onChange("items", items);
  }

  // Agregar material a un item
  function addMaterialItem(itemId: string) {
    const items = (data.items || []).map((item) => {
      if (item.id !== itemId) return item;
      return { ...item, materiales: [...(item.materiales || []), lineaVacia(mats)] };
    });
    onChange("items", items);
  }

  // Eliminar material de un item
  function removeMaterialItem(itemId: string, matId: string) {
    const items = (data.items || []).map((item) => {
      if (item.id !== itemId) return item;
      return { ...item, materiales: (item.materiales || []).filter((m) => m.id !== matId) };
    });
    onChange("items", items);
  }

  function updExtra(id: string, key: keyof Extra, val: string | number) {
    const extras = (data.extras || []).map((e) => (e.id === id ? { ...e, [key]: val } as Extra : e));
    onChange("extras", extras);
  }

  // Calcular totales de items para mostrar
  const itemsTotales = (data.items || []).reduce(
    (acc, i) => ({
      cantidad: acc.cantidad + (i.cantidad || 0),
      horas: acc.horas + (i.horas || 0) + (Number(i.minutos) || 0) / 60,
    }),
    { cantidad: 0, horas: 0 }
  );

  // Calcular materiales totales de todos los items (agrupados por tipo, variante, color)
  const materialesTotales = useMemo(() => {
    const todos: Linea[] = (data.items || []).flatMap((i) => i.materiales || []);
    const grupos: Record<string, Linea & { cantidad: number }> = {};
    for (const m of todos) {
      const key = `${m.nombre}|${m.tipo}|${m.color}`;
      if (!grupos[key]) {
        grupos[key] = { ...m, cantidad: 0 };
      }
      grupos[key].cantidad += m.gramos;
    }
    return Object.values(grupos);
  }, [data.items]);

  // Calcular total de gramos
  const totalGramos = materialesTotales.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Poppins', system-ui, sans-serif" }}>

      {/* Cotizador */}
      <Seccion tipo="cotizador" titulo="Cotizador">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EQUIPO.map((n) => (
            <button
              key={n}
              onClick={() => onChange("cotizador", n)}
              style={{
                padding: "8px 24px",
                borderRadius: 24,
                fontSize: 14,
                cursor: "pointer",
                border: `2px solid ${data.cotizador === n ? CHELY.lila : CHELY.lavanda}`,
                background: data.cotizador === n
                  ? CHELY.grad
                  : "#fff",
                color: data.cotizador === n ? "#fff" : CHELY.lilaOscuro,
                fontWeight: data.cotizador === n ? 700 : 500,
                fontFamily: "'Poppins', system-ui, sans-serif",
                boxShadow: data.cotizador === n ? `0 4px 12px ${CHELY.lila}66` : "none",
                transition: "all .2s",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Seccion>

      {/* Datos del cliente */}
      <Seccion tipo="cliente" titulo="Datos del cliente">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Nombre del cliente *" span2>
            <input
              style={inpStyle}
              placeholder="Nombre completo"
              value={data.cliente || ""}
              onChange={(e) => onChange("cliente", e.target.value)}
            />
          </Field>
          <Field label="Teléfono">
            <input
              style={inpStyle}
              placeholder="7X XXX XXX"
              value={data.telefono || ""}
              onChange={(e) => onChange("telefono", e.target.value)}
            />
          </Field>
          <Field label="Ciudad">
            <input
              style={inpStyle}
              placeholder="Ej: Santa Cruz"
              value={data.ciudad || ""}
              onChange={(e) => onChange("ciudad", e.target.value)}
            />
          </Field>
          <Field label="Email" span2>
            <input
              style={inpStyle}
              placeholder="correo@ejemplo.com"
              value={data.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
            />
          </Field>
        </div>
      </Seccion>

      {/* Detalle del trabajo */}
      <Seccion
        tipo="trabajo"
        titulo="Detalle del trabajo"
        accion={
          <button
            onClick={() => onChange("items", [...(data.items || []), emptyItem()])}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 20,
              cursor: "pointer",
              background: "rgba(255,255,255,.25)",
              border: "1.5px solid rgba(255,255,255,.6)",
              color: "#fff",
              fontWeight: 600,
              fontFamily: "'Poppins', system-ui, sans-serif",
            }}
          >
            + Agregar item
          </button>
        }
      >
        {(data.items || []).map((item, idx) => {
          const di = calcDesgloseItem(item, mats, cfg, data.markup ?? 40);

          return (
            <div
              key={item.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 12,
                border: `2px solid ${CHELY.lavanda}`,
                boxShadow: `0 2px 8px ${CHELY.lila}15`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  background: CHELY.grad,
                  padding: "4px 14px",
                  borderRadius: 20,
                  color: "#fff",
                }}>
                  Item {idx + 1}
                </span>
                {(data.items || []).length > 1 && (
                  <button
                    onClick={() => onChange("items", (data.items || []).filter((x) => x.id !== item.id))}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: "#fdf0f5",
                      border: `1px solid ${CHELY.rosa}`,
                      color: CHELY.rosaOscuro,
                      fontWeight: 600,
                    }}
                  >
                    Quitar item
                  </button>
                )}
              </div>

              {/* Datos del item */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <Field label="Nombre de la pieza *">
                  <input
                    style={inpStyle}
                    placeholder="Ej: Soporte de pared..."
                    value={item.pieza || ""}
                    onChange={(e) => updItem(item.id, "pieza", e.target.value)}
                  />
                </Field>
                <Field label="Descripcion">
                  <input
                    style={inpStyle}
                    placeholder="Dimensiones, uso..."
                    value={item.descripcion || ""}
                    onChange={(e) => updItem(item.id, "descripcion", e.target.value)}
                  />
                </Field>
                <Field label="Cantidad (unidades)">
                  <NumInput
                    style={inpStyle}
                    min={1}
                    enforceMin
                    value={item.cantidad}
                    onCommit={(n) => updItem(item.id, "cantidad", n)}
                  />
                </Field>
                <Field label="Tiempo de impresión">
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <NumInput
                      style={{ ...smlStyle, width: 60, textAlign: "center" }}
                      min={0}
                      value={item.horas}
                      onCommit={(n) => updItem(item.id, "horas", n)}
                    />
                    <span style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>h</span>
                    <NumInput
                      style={{ ...smlStyle, width: 60, textAlign: "center" }}
                      min={0}
                      max={59}
                      value={item.minutos ?? 0}
                      onCommit={(n) => updItem(item.id, "minutos", n)}
                    />
                    <span style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>m</span>
                  </div>
                </Field>
                <Field label="Mano de obra (Bs)">
                  <NumInput
                    style={inpStyle}
                    min={0}
                    value={item.manoObra ?? 0}
                    onCommit={(n) => updItem(item.id, "manoObra", n)}
                  />
                </Field>
              </div>

              {/* Materiales de este item */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: CHELY.lilaMedia }}>Materiales de este item:</span>
                  <button
                    onClick={() => addMaterialItem(item.id)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: CHELY.perla,
                      border: `1px solid ${CHELY.lavanda}`,
                      color: CHELY.lilaOscuro,
                      fontWeight: 600,
                    }}
                  >
                    + Material
                  </button>
                </div>

                {(item.materiales || []).length === 0 && (
                  <p style={{ fontSize: 11, color: "#aaa", fontStyle: "italic", margin: "4px 0" }}>
                    Sin materiales. Agrega al menos uno.
                  </p>
                )}

                {(item.materiales || []).map((m) => {
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 80px auto",
                        gap: 6,
                        alignItems: "center",
                        background: CHELY.perla,
                        borderRadius: 8,
                        padding: "8px 10px",
                        marginBottom: 6,
                      }}
                    >
                      <select
                        style={{ ...smlStyle, fontSize: 12 }}
                        value={m.nombre}
                        onChange={(e) => updMaterialItem(item.id, m.id, "nombre", e.target.value)}
                      >
                        {mats.map((x) => (
                          <option key={x.id}>{x.nombre}</option>
                        ))}
                      </select>
                      <select
                        style={{ ...smlStyle, fontSize: 12 }}
                        value={m.tipo}
                        onChange={(e) => updMaterialItem(item.id, m.id, "tipo", e.target.value)}
                      >
                        {(mats.find((x) => x.id === m.nombre)?.variantes || ["Estándar"]).map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        style={{ ...smlStyle, fontSize: 12 }}
                        value={m.color}
                        onChange={(e) => updMaterialItem(item.id, m.id, "color", e.target.value)}
                      >
                        <option value="">Color...</option>
                        {coloresDisponibles.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <NumInput
                        style={{ ...smlStyle, fontSize: 12, width: 70 }}
                        min={1}
                        enforceMin
                        value={m.gramos}
                        onCommit={(n) => updMaterialItem(item.id, m.id, "gramos", n)}
                      />
                      <button
                        onClick={() => removeMaterialItem(item.id, m.id)}
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: "#fdf0f5",
                          border: `1px solid ${CHELY.rosa}`,
                          color: CHELY.rosaOscuro,
                          fontWeight: 600,
                        }}
                      >
                        x
                      </button>
                    </div>
                  );
                })}

                {(item.materiales || []).length > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: CHELY.lilaMedia }}>
                    Costo material: {fmt(di.cMat)} · {item.cantidad} u. x {item.horas}h {item.minutos ?? 0}m
                  </p>
                )}
              </div>

              {/* Desglose de costo por item */}
              <div style={{
                marginTop: 12,
                borderTop: `2px dashed ${CHELY.lavanda}`,
                paddingTop: 10,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: CHELY.lilaOscuro, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Desglose de costo
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                  {[
                    { label: "Material", val: fmt(di.cMat) },
                    { label: `Fijos (${item.horas}h ${item.minutos ?? 0}m)`, val: fmt(di.cFijo) },
                    { label: "Mano de obra", val: fmt(di.cMO) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: CHELY.perla, borderRadius: 8, padding: "6px 10px", border: `1px solid ${CHELY.lavanda}` }}>
                      <p style={{ margin: 0, fontSize: 10, color: "#777" }}>{label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#222" }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <div style={{ background: "#f0f7ff", borderRadius: 8, padding: "6px 10px", border: `1px solid #bdd7ee` }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#555" }}>Costo total ({item.cantidad} u.)</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#1a4f8a" }}>{fmt(di.costoTotal)}</p>
                  </div>
                  <div style={{ background: "#f0f7ff", borderRadius: 8, padding: "6px 10px", border: `1px solid #bdd7ee` }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#555" }}>Costo por unidad</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#1a4f8a" }}>{fmt(di.costoPorUnidad)}</p>
                  </div>
                  <div style={{
                    background: CHELY.grad,
                    borderRadius: 8,
                    padding: "6px 10px",
                    gridColumn: "span 1",
                  }}>
                    <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.85)" }}>
                      Precio c/u (+{data.markup ?? 40}% ganancia)
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                      {fmt(di.precioItem)}
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,.8)" }}>
                      {fmt(di.precioPorUnidad)}/u.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Totales de items */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginTop: 12,
          padding: "10px 14px",
          background: CHELY.perla,
          borderRadius: 10,
          border: `1.5px solid ${CHELY.lavanda}`,
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Total unidades</p>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: CHELY.lilaOscuro }}>{itemsTotales.cantidad}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Total horas</p>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: CHELY.lilaOscuro }}>{itemsTotales.horas}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Items</p>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: CHELY.lilaOscuro }}>{(data.items || []).length}</p>
          </div>
        </div>

        {/* Fecha de entrega y notas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <Field label="Fecha de entrega (dd/mm/aaaa)">
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inpStyle, paddingRight: 36 }}
                type="text"
                placeholder="DD/MM/AAAA"
                value={isoToDisplay(data.fechaEntrega || "")}
                onChange={(e) => {
                  const masked = maskDate(e.target.value);
                  onChange("fechaEntrega", displayToIso(masked));
                }}
                maxLength={10}
              />
              <input
                type="date"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", opacity: 0, width: 24, height: 24, cursor: "pointer" }}
                value={data.fechaEntrega || ""}
                onChange={(e) => onChange("fechaEntrega", e.target.value)}
                tabIndex={-1}
              />
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", color: CHELY.lilaMedia }}>📅</span>
            </div>
          </Field>
          <Field label="Notas">
            <input
              style={inpStyle}
              placeholder="Urgente, acabado especial..."
              value={data.notas || ""}
              onChange={(e) => onChange("notas", e.target.value)}
            />
          </Field>
        </div>
      </Seccion>

      {/* Resumen de materiales totales */}
      <Seccion tipo="material" titulo="Resumen de materiales" subtitulo="total consolidado de todos los items">
        {materialesTotales.length === 0 ? (
          <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: "10px 0", fontStyle: "italic" }}>
            Sin materiales asignados.
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 6 }}>
              {materialesTotales.map((m) => {
                const mat = mats.find((x) => x.id === m.nombre) || mats[0];
                const costoTotal = (m.cantidad / 1000) * (mat?.costo || 0);
                return (
                  <div
                    key={`${m.nombre}-${m.tipo}-${m.color}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 100px 100px",
                      gap: 8,
                      background: "#fff",
                      borderRadius: 8,
                      padding: "8px 12px",
                      border: `1px solid ${CHELY.lavanda}`,
                      fontSize: 12,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: CHELY.lilaOscuro }}>{m.nombre}</span>
                    <span style={{ color: "#666" }}>{m.tipo}</span>
                    <span style={{ color: "#666" }}>{m.color || "-"}</span>
                    <span style={{ textAlign: "right", fontWeight: 500 }}>{m.cantidad} g</span>
                    <span style={{ textAlign: "right", color: CHELY.lilaMedia, fontWeight: 600 }}>{fmt(costoTotal)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              padding: "10px 14px",
              background: CHELY.grad,
              borderRadius: 10,
              color: "#fff",
            }}>
              <span style={{ fontWeight: 600 }}>Total gramos:</span>
              <span style={{ fontWeight: 700 }}>{totalGramos} g</span>
              <span style={{ fontWeight: 600 }}>Costo material total:</span>
              <span style={{ fontWeight: 700 }}>{fmt(desglose.cMat)}</span>
            </div>
          </>
        )}
      </Seccion>

      {/* Extras */}
      <Seccion
        tipo="extra"
        titulo="Materiales / Costos extra"
        subtitulo="no aparece en el presupuesto, se suma al costo total"
        accion={
          <button
            onClick={() => onChange("extras", [...(data.extras || []), extraVacio()])}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 20,
              cursor: "pointer",
              background: "rgba(255,255,255,.25)",
              border: "1.5px solid rgba(255,255,255,.6)",
              color: "#fff",
              fontWeight: 600,
              fontFamily: "'Poppins', system-ui, sans-serif",
            }}
          >
            + Agregar
          </button>
        }
      >
        {(data.extras || []).length === 0 && (
          <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
            Sin costos extra.
          </p>
        )}
        {(data.extras || []).map((e) => (
          <div
            key={e.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px auto",
              gap: 8,
              alignItems: "flex-end",
              marginBottom: 8,
              background: "#fff",
              borderRadius: 10,
              padding: "10px 12px",
              border: `1.5px solid ${CHELY.rosa}`,
            }}
          >
            <Field label="Descripción">
              <input
                style={inpStyle}
                placeholder="Ej: Resina UV, pintura..."
                value={e.descripcion}
                onChange={(v) => updExtra(e.id, "descripcion", v.target.value)}
              />
            </Field>
            <Field label="Costo (Bs)">
              <NumInput
                style={inpStyle}
                min={0}
                value={e.costo}
                onCommit={(n) => updExtra(e.id, "costo", n)}
              />
            </Field>
            <button
              onClick={() => onChange("extras", (data.extras || []).filter((x) => x.id !== e.id))}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1.5px solid ${CHELY.rosa}`,
                background: "#fdf0f5",
                color: CHELY.rosaOscuro,
                cursor: "pointer",
                fontSize: 14,
                alignSelf: "flex-end",
                fontWeight: 700,
              }}
            >
              x
            </button>
          </div>
        ))}
      </Seccion>

      {/* Parámetros de costo */}
      <Seccion tipo="params" titulo="Parametros de costo" subtitulo="no aparece en el presupuesto">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Field label="Horas totales">
            <input style={{ ...inpStyle, background: "#f8f0ff", color: CHELY.lilaMedia }} value={itemsTotales.horas.toString()} readOnly />
          </Field>
          <Field label="Costos fijos totales">
            <input style={{ ...inpStyle, background: "#f8f0ff", color: CHELY.lilaMedia }} value={fmt(desglose.cFijo)} readOnly />
          </Field>
          <Field label="Mano de obra total">
            <input
              style={{ ...inpStyle, background: "#f8f0ff", color: CHELY.lilaMedia }}
              value={fmt(desglose.cMO)}
              readOnly
              title="Se calcula sumando la MO de cada item"
            />
          </Field>
          <Field label="Markup / Ganancia (%)">
            <NumInput
              style={inpStyle}
              min={0}
              max={300}
              value={data.markup ?? 0}
              onCommit={(n) => onChange("markup", n)}
            />
          </Field>
        </div>
      </Seccion>

      {/* Resumen */}
      <Seccion tipo="resumen" titulo="Resumen de costos">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Material (total prod.)", val: fmt(desglose.cMat) },
            { label: "Fijos elec.+desgaste (total)", val: fmt(desglose.cFijo) },
            { label: "Mano de obra (total)", val: fmt(desglose.cMO) },
            { label: "Extras (incluidos en costo)", val: fmt(desglose.cExt) },
            { label: `Costo total (${desglose.cantidad} u.)`, val: fmt(desglose.costoTotalProduccion), bold: true },
            { label: "Costo por unidad", val: fmt(desglose.costoPorUnidad) },
          ].map(({ label, val, bold }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                border: `1.5px solid ${bold ? CHELY.lila : CHELY.lavanda}`,
                boxShadow: bold ? `0 2px 8px ${CHELY.lila}30` : "none",
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: "#888", fontFamily: "'Poppins', system-ui, sans-serif" }}>{label}</p>
              <p style={{
                margin: "4px 0 0",
                fontSize: 14,
                fontWeight: bold ? 700 : 500,
                color: bold ? CHELY.lilaOscuro : "#222",
                fontFamily: "'Poppins', system-ui, sans-serif",
              }}>
                {val}
              </p>
            </div>
          ))}
        </div>

        {/* Total box */}
        <div style={{
          background: CHELY.grad,
          borderRadius: 14,
          padding: "18px 22px",
          boxShadow: `0 6px 20px ${CHELY.lila}50`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: "rgba(255,255,255,.8)", fontSize: 11, fontFamily: "'Poppins', system-ui, sans-serif" }}>
                Precio c/u (+{data.markup || 0}% ganancia)
              </p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontSize: 17, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                {fmt(desglose.precioPorUnidad)}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: "rgba(255,255,255,.8)", fontSize: 11, fontFamily: "'Poppins', system-ui, sans-serif" }}>Cantidad</p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontSize: 17, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                {desglose.cantidad} u.
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: "rgba(255,255,255,.8)", fontSize: 11, fontFamily: "'Poppins', system-ui, sans-serif" }}>PRECIO FINAL</p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                {fmt(desglose.precioTotal)}
              </p>
            </div>
          </div>
        </div>
      </Seccion>
    </div>
  );
}
