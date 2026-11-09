import { useState, useMemo, useCallback, useEffect } from "react";
import {
  TABS,
  EQUIPO,
  COLORES_MAT,
  estadoColor,
  TAB_COLORS,
  emptyCot,
  calcDesglose,
  MESES_ABR,
  CHELY,
} from "../constants";
import { fmt, hoy, uid, fmtFechaHora, toNum, refTrabajo } from "../utils";
import { useCotizadorStore } from "../lib/useCotizadorStore";
import type { Trabajo, Config, Inventario, Material } from "../types";
import { FormCotizacion } from "./FormCotizacion";
import { Seccion, inpStyle, smlStyle, NumInput } from "./ui";
import { imprimirPDF } from "../lib/pdf";
import { exportarTrabajosCSV } from "../lib/exportTrabajos";
import { exportarInventarioCSV } from "../lib/exportInventario";
import logoUrl from "../assets/chely-logo.svg";

export default function App() {
  const {
    trabajos,
    inv,
    mats,
    cfg,
    coloresExtra,
    sync,
    setTrabajos,
    setInv,
    setMats,
    setCfg,
    setColoresExtra,
  } = useCotizadorStore();

  const [tab, setTab] = useState(0);

  const [cotData, setCotData] = useState<Trabajo>(() => emptyCot(EQUIPO[0]));
  const changeCot = useCallback<((key: keyof Trabajo, val: unknown) => void)>((key, val) => {
    setCotData((p) => ({ ...p, [key]: val }));
  }, []);

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCotiz, setFiltroCotiz] = useState("Todos");
  const [filtroFechaCreac, setFiltroFechaCreac] = useState("");
  const [invFiltroMat, setInvFiltroMat] = useState("Todos");
  const [invFiltroColor, setInvFiltroColor] = useState("Todos");
  const [invSoloAlerta, setInvSoloAlerta] = useState(false);
  const [invModal, setInvModal] = useState(false);
  const [nuevoRoll, setNuevoRoll] = useState({
    material: "PLA",
    tipo: "Estándar",
    color: "Negro",
    marca: "",
    lote: "",
    fecha: hoy(),
    grInicial: 1000,
  });
  const [colorPersonalizado, setColorPersonalizado] = useState("");

  const [matModal, setMatModal] = useState(false);
  const [nuevoMat, setNuevoMat] = useState({ nombre: "", costo: 100, variante: "", color: "" });
  const [editMatId, setEditMatId] = useState<string | null>(null);
  const [nuevaVariante, setNuevaVariante] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<Trabajo | null>(null);
  const [pdfModal, setPdfModal] = useState<{ url: string; nombre: string } | null>(null);
  const changeEdit = useCallback((key: keyof Trabajo, val: unknown) => {
    setEditData((p) => (p ? { ...p, [key]: val } : p));
  }, []);

  function guardarCotizacion() {
    if (!cotData.cliente) return alert("Completa el nombre del cliente.");
    const itemsSinPieza = (cotData.items || []).filter((i) => !i.pieza || !i.pieza.trim());
    if (itemsSinPieza.length > 0) return alert("Completa el nombre de todas las piezas.");
    const d = calcDesglose(cotData, mats, cfg);
    const ahora = new Date();
    const fechaCreacion = ahora.toISOString();
    const maxNum = trabajos.reduce((m, t) => Math.max(m, t.numero || 0), 0);
    const nuevo: Trabajo = {
      ...cotData,
      id: uid(),
      numero: maxNum + 1,
      estado: "Pendiente",
      fecha: hoy(),
      total: d.precioTotal,
      fechaCreacion,
      updatedAt: fechaCreacion,
    };
    setTrabajos((p) => [nuevo, ...p]);
    setCotData({ ...emptyCot(cotData.cotizador) });
    setTab(1);
  }

  function guardarEdicion() {
    if (!editData) return;
    const d = calcDesglose(editData, mats, cfg);
    const ahora = new Date().toISOString();
    // Preserve numero; bump updatedAt so it moves to the front
    setTrabajos((p) => {
      const updated = { ...editData, total: d.precioTotal, updatedAt: ahora };
      return [updated, ...p.filter((t) => t.id !== editData.id)];
    });
    setEditModal(false);
    setEditData(null);
  }

  function abrirEdicion(t: Trabajo) {
    const defaultMat = mats[0];
    const defaultLinea = {
      id: uid(),
      nombre: defaultMat?.id || "PLA",
      tipo: defaultMat?.variantes?.[0] || "Estándar",
      color: "",
      gramos: 100,
    };
    setEditData({
      ...t,
      items: t.items && t.items.length ? t.items : [{ id: uid(), pieza: t.pieza || "", descripcion: t.descripcion || "", cantidad: t.cantidad || 1, horas: t.horas || 1, minutos: 0, manoObra: 0, materiales: [] }],
      extras: t.extras || [],
      lineas: t.lineas && t.lineas.length ? t.lineas : [defaultLinea],
    });
    setEditModal(true);
  }

  function cambiarEstado(id: string, estado: Trabajo["estado"]) {
    const ahora = new Date().toISOString();
    setTrabajos((p) => {
      const updated = p.map((t) => (t.id === id ? { ...t, estado, updatedAt: ahora } : t));
      // Move the changed job to the front
      const moved = updated.find((t) => t.id === id);
      if (!moved) return updated;
      return [moved, ...updated.filter((t) => t.id !== id)];
    });
  }

  function borrarTrabajo(id: string) {
    if (!confirm("¿Eliminar este trabajo? No se puede deshacer.")) return;
    setTrabajos((p) => p.filter((t) => t.id !== id));
  }

  function borrarInv(id: string) {
    if (!confirm("¿Eliminar este carrete del inventario? No se puede deshacer.")) return;
    setInv((p) => p.filter((r) => r.id !== id));
  }


  function descargarPDF(t: Trabajo) {
    const ref = refTrabajo(t);
    imprimirPDF(t, mats, cfg, ref);
  }

  function agregarRollo() {
    const colorFinal = nuevoRoll.color === "Otro" ? colorPersonalizado.trim() : nuevoRoll.color;
    if (!colorFinal) return alert("Ingresa el nombre del color.");
    const r: Inventario = {
      id: uid(),
      material: nuevoRoll.material,
      tipo: nuevoRoll.tipo,
      color: colorFinal,
      marca: nuevoRoll.marca.trim(),
      lote: nuevoRoll.lote,
      fecha: nuevoRoll.fecha,
      grInicial: nuevoRoll.grInicial,
      grUsado: 0,
      grPurga: 0,
    };
    setInv((p) => [r, ...p]);
    if (nuevoRoll.color === "Otro" && colorFinal && !COLORES_MAT.includes(colorFinal) && !coloresExtra.includes(colorFinal)) {
      setColoresExtra((p) => [...p, colorFinal]);
    }
    const defaultMat = mats[0];
    const variantesDefault = defaultMat?.variantes || ["Estándar"];
    setNuevoRoll({
      material: defaultMat?.nombre || defaultMat?.id || "PLA",
      tipo: variantesDefault[0],
      color: coloresInvDisponibles[0] || "Negro",
      marca: "",
      lote: "",
      fecha: hoy(),
      grInicial: 1000,
    });
    setColorPersonalizado("");
    setInvModal(false);
  }

  const coloresInvDisponibles = useMemo(() => {
    const coloresBase = [...COLORES_MAT.filter((c) => c !== "Otro"), ...coloresExtra];
    return [...coloresBase, "Otro"];
  }, [coloresExtra]);

  // Actualizar variante automáticamente cuando cambia el material en el modal de inventario
  useEffect(() => {
    if (invModal) {
      const matSeleccionado = mats.find((m) => m.nombre === nuevoRoll.material || m.id === nuevoRoll.material);
      if (matSeleccionado) {
        const variantesMat = matSeleccionado.variantes || ["Estándar"];
        if (!variantesMat.includes(nuevoRoll.tipo)) {
          setNuevoRoll((p) => ({ ...p, tipo: variantesMat[0] }));
        }
      }
    }
  }, [nuevoRoll.material, invModal, mats]);

  const dLive = useMemo(() => calcDesglose(cotData, mats, cfg), [cotData, mats, cfg]);
  const dEdit = useMemo(() => (editData ? calcDesglose(editData, mats, cfg) : null), [editData, mats, cfg]);

  const trabajosFiltrados = trabajos.filter(
    (t) =>
      (filtroEstado === "Todos" || t.estado === filtroEstado) &&
      (filtroCotiz === "Todos" || t.cotizador === filtroCotiz) &&
      (!filtroFechaCreac || (t.fechaCreacion || t.fecha || "").slice(0, 10) === filtroFechaCreac)
  );

  const invConAlerta = inv.map((r) => ({ ...r, alerta: r.grInicial - r.grUsado - r.grPurga < cfg.alertaGramos }));
  const invFiltrado = invConAlerta.filter(
    (r) =>
      (invFiltroMat === "Todos" || r.material === invFiltroMat) &&
      (invFiltroColor === "Todos" || r.color === invFiltroColor) &&
      (!invSoloAlerta || r.alerta)
  );
  const rollosAlerta = invConAlerta.filter((r) => r.alerta).length;

  // ---- totales dashboard ----
  const totalPendiente = trabajos.filter((t) => t.estado === "Pendiente").reduce((s, t) => s + t.total, 0);
  const totalConfirmado = trabajos.filter((t) => t.estado === "Confirmado").reduce((s, t) => s + t.total, 0);
  const totalMes = useMemo(() => {
    const now = new Date();
    return trabajos
      .filter((t) => { const d = new Date(t.fecha || ""); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, t) => s + t.total, 0);
  }, [trabajos]);
  const ventasPorMes = useMemo(() => {
    const m: Record<string, number> = {};
    trabajos.forEach((t) => {
      const d = new Date(t.fecha || "");
      if (isNaN(d.getTime())) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[k] = (m[k] || 0) + t.total;
    });
    const keys = Object.keys(m).sort().slice(-6);
    return keys.map((k) => {
      const [y, mon] = k.split("-");
      return { label: MESES_ABR[Number(mon) - 1] + " " + y.slice(2), val: m[k] };
    });
  }, [trabajos]);
  const maxBar = Math.max(...ventasPorMes.map((v) => v.val), 1);

  // libera URL de blob cuando cambia el modal
  useEffect(() => {
    return () => {
      if (pdfModal) URL.revokeObjectURL(pdfModal.url);
    };
  }, [pdfModal]);

  // ---- helpers visuales ----
  const badgeStyle = (estado: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: estadoColor[estado] + "22",
    color: estadoColor[estado],
    border: `1px solid ${estadoColor[estado]}44`,
  });

  const tabIcons = ["✨", "📋", "🧵", "📊", "⚙️"];

  return (
    <div
      style={{
        fontFamily: "'Poppins', system-ui, sans-serif",
        maxWidth: 720,
        margin: "0 auto",
        padding: 0,
        background: CHELY.fondo,
        minHeight: "100vh",
      }}
    >
      {/* Google Fonts injector */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        select, input, textarea { font-family: 'Poppins', system-ui, sans-serif; }
        input:focus, select:focus { border-color: ${CHELY.lila} !important; box-shadow: 0 0 0 3px ${CHELY.lila}33 !important; outline: none; }
        button { font-family: 'Poppins', system-ui, sans-serif; }
      `}</style>

      {/* ══ CABECERA CHELY ══ */}
      <div
        style={{
          background: CHELY.grad,
          padding: "20px 20px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* destellos decorativos */}
        <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: "40%", width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={logoUrl}
              alt="Logo 3D CHELY"
              style={{ width: 104, height: 104, objectFit: "contain", flexShrink: 0, borderRadius: 8 }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              fontSize: 10,
              color: sync === "error" ? "#ffe0e0" : "rgba(255,255,255,.8)",
              background: "rgba(0,0,0,.15)",
              padding: "3px 10px",
              borderRadius: 12,
              fontFamily: "'Poppins', system-ui, sans-serif",
            }}>
              {sync === "error" ? "⚠ Error" : sync === "guardando" ? "💾 Guardando…" : sync === "cargando" ? "⏳ Cargando…" : "✓ Sincronizado"}
            </span>
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div
        style={{
          background: "#fff",
          borderBottom: `2px solid ${CHELY.lavanda}`,
          padding: "4px 12px",
          overflowX: "auto",
          display: "flex",
          gap: 2,
        }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              flex: "0 0 auto",
              padding: "9px 14px",
              border: "none",
              borderBottom: tab === i ? `3px solid ${TAB_COLORS[i]}` : "3px solid transparent",
              background: "transparent",
              color: tab === i ? TAB_COLORS[i] : "#888",
              fontWeight: tab === i ? 700 : 400,
              cursor: "pointer",
              fontSize: 12,
              whiteSpace: "nowrap",
              position: "relative",
              transition: "all .2s",
              fontFamily: "'Poppins', system-ui, sans-serif",
            }}
          >
            {tabIcons[i]} {t}
            {t === "Inventario" && rollosAlerta > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 2,
                  background: "#e74c3c",
                  color: "#fff",
                  fontSize: 9,
                  borderRadius: 10,
                  padding: "1px 4px",
                  lineHeight: "1.4",
                }}
              >
                {rollosAlerta}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 12px" }}>

        {/* ══ COTIZADOR ══ */}
        {tab === 0 && (
          <div>
            <FormCotizacion data={cotData} onChange={changeCot} mats={mats} cfg={cfg} desglose={dLive} coloresExtra={coloresExtra} inv={inv} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={guardarCotizacion}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: CHELY.grad,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                  boxShadow: `0 6px 20px ${CHELY.lila}55`,
                  letterSpacing: ".3px",
                }}
              >
                ✨ Guardar cotización
              </button>
              <button
                onClick={() => setCotData({ ...emptyCot(cotData.cotizador) })}
                style={{
                  padding: "14px 20px",
                  background: "#fff",
                  border: `1.5px solid ${CHELY.lavanda}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  color: CHELY.lilaOscuro,
                  fontSize: 14,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* ══ TRABAJOS ══ */}
        {tab === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Filtros */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                background: "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                border: `1.5px solid ${CHELY.lavanda}`,
              }}
            >
              <span style={{ fontSize: 12, color: CHELY.lilaOscuro, fontWeight: 600, marginRight: 4 }}>Filtros:</span>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...smlStyle, width: "auto" }}>
                <option value="Todos">Todos los estados</option>
                {["Pendiente", "Confirmado", "Cancelado"].map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <select value={filtroCotiz} onChange={(e) => setFiltroCotiz(e.target.value)} style={{ ...smlStyle, width: "auto" }}>
                <option value="Todos">Todos</option>
                {EQUIPO.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <input
                type="date"
                value={filtroFechaCreac}
                onChange={(e) => setFiltroFechaCreac(e.target.value)}
                style={{ ...smlStyle, width: "auto" }}
                title="Filtrar por fecha de creación"
              />
              {filtroFechaCreac && (
                <button
                  onClick={() => setFiltroFechaCreac("")}
                  style={{
                    ...smlStyle,
                    width: "auto",
                    cursor: "pointer",
                    background: "#fdf0f5",
                    border: `1px solid ${CHELY.rosa}`,
                    color: CHELY.rosaOscuro,
                  }}
                >
                  ✕
                </button>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#999" }}>
                {trabajosFiltrados.length} trabajo{trabajosFiltrados.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => exportarTrabajosCSV(trabajos)}
                disabled={trabajos.length === 0}
                style={{
                  ...smlStyle,
                  width: "auto",
                  cursor: trabajos.length === 0 ? "not-allowed" : "pointer",
                  background: CHELY.rosaOscuro,
                  border: `1px solid ${CHELY.rosaOscuro}`,
                  color: "#fff",
                  fontWeight: 600,
                  opacity: trabajos.length === 0 ? 0.5 : 1,
                }}
              >
                Exportar CSV
              </button>
            </div>

            {trabajosFiltrados.length === 0 && (
              <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>
                Sin trabajos con esos filtros.
              </div>
            )}

            {trabajosFiltrados.map((t) => {
              const sc = estadoColor[t.estado] || CHELY.lila;
              const ref = refTrabajo(t);
              return (
                <div
                  key={t.id}
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${CHELY.lavanda}`,
                    borderLeft: `4px solid ${sc}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    boxShadow: `0 2px 8px ${CHELY.lila}12`,
                  }}
                >
                  {/* Ref + fecha creación */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: CHELY.lilaOscuro,
                      background: CHELY.perla,
                      padding: "2px 10px",
                      borderRadius: 12,
                      border: `1px solid ${CHELY.lavanda}`,
                    }}>
                      Ref. {ref}
                    </span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>
                      {fmtFechaHora(t.fechaCreacion)}
                    </span>
                    <span style={{ ...badgeStyle(t.estado), marginLeft: "auto" }}>{t.estado}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#222", fontFamily: "'Playfair Display', serif" }}>{t.pieza}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#777" }}>
                        {t.cliente}{t.ciudad ? ` · ${t.ciudad}` : ""}{t.telefono ? ` · ${t.telefono}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Datos */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#666", marginBottom: 10 }}>
                    <span>👤 {t.cotizador}</span>
                    <span>📦 {(t.items || []).reduce((s, i) => s + (i.cantidad || 0), 0)} u. ({(t.items || []).length} item{(t.items || []).length !== 1 ? "s" : ""})</span>
                    <span>⏱ {(t.items || []).reduce((s, i) => s + (i.horas || 0), 0)}h total</span>
                    {t.fechaEntrega && <span>📅 Entrega: {t.fechaEntrega}</span>}
                    <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 15, color: CHELY.lilaOscuro, fontFamily: "'Playfair Display', serif" }}>
                      {fmt(t.total)}
                    </span>
                  </div>

                  {/* Cambiar estado */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {(["Pendiente", "Confirmado", "Cancelado"] as Trabajo["estado"][]).map((e) => (
                      <button
                        key={e}
                        onClick={() => cambiarEstado(t.id, e)}
                        style={{
                          padding: "4px 12px",
                          fontSize: 11,
                          borderRadius: 20,
                          cursor: "pointer",
                          border: `1.5px solid ${estadoColor[e]}`,
                          background: t.estado === e ? estadoColor[e] : "#fff",
                          color: t.estado === e ? "#fff" : estadoColor[e],
                          fontWeight: 600,
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => abrirEdicion(t)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        borderRadius: 8,
                        cursor: "pointer",
                        background: CHELY.perla,
                        border: `1.5px solid ${CHELY.lavanda}`,
                        color: CHELY.lilaOscuro,
                        fontWeight: 600,
                      }}
                    >
                      ✏ Editar
                    </button>
                    <button
                      onClick={() => descargarPDF(t)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        borderRadius: 8,
                        cursor: "pointer",
                        background: CHELY.grad,
                        border: "none",
                        color: "#fff",
                        fontWeight: 600,
                        boxShadow: `0 2px 8px ${CHELY.lila}44`,
                      }}
                    >
                      🖨 PDF
                    </button>
                    <button
                      onClick={() => borrarTrabajo(t.id)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        borderRadius: 8,
                        cursor: "pointer",
                        background: "#fee",
                        border: "1px solid #e55",
                        color: "#c33",
                        fontWeight: 600,
                      }}
                    >
                      🗑 Borrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ INVENTARIO ══ */}
        {tab === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Header inventario */}
            <div
              style={{
                background: CHELY.grad,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: `0 4px 16px ${CHELY.lila}40`,
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: 16, fontFamily: "'Playfair Display', serif" }}>
                  🧵 Inventario de Carretes
                </h3>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.8)", fontSize: 12 }}>
                  {inv.length} carretes · {rollosAlerta} con alerta
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => exportarInventarioCSV(inv, cfg.alertaGramos)}
                disabled={inv.length === 0}
                style={{
                  padding: "9px 16px",
                  background: "rgba(255,255,255,.12)",
                  border: "1.5px solid rgba(255,255,255,.6)",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: inv.length === 0 ? "not-allowed" : "pointer",
                  opacity: inv.length === 0 ? 0.5 : 1,
                  fontSize: 13,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                }}
              >
                Exportar CSV
              </button>
              <button
                onClick={() => {
                  const defaultMat = mats[0];
                  const variantes = defaultMat?.variantes || ["Estándar"];
                  setNuevoRoll({
                    material: defaultMat?.nombre || defaultMat?.id || "PLA",
                    tipo: variantes[0],
                    color: coloresInvDisponibles[0] || "Negro",
                    marca: "",
                    lote: "",
                    fecha: hoy(),
                    grInicial: 1000,
                  });
                  setColorPersonalizado("");
                  setInvModal(true);
                }}
                style={{
                  padding: "9px 20px",
                  background: "rgba(255,255,255,.25)",
                  border: "1.5px solid rgba(255,255,255,.6)",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                }}
              >
                + Nuevo carrete
              </button>
              </div>
            </div>

            {/* Filtros inventario */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={invFiltroMat} onChange={(e) => setInvFiltroMat(e.target.value)} style={{ ...smlStyle, width: "auto" }}>
                <option value="Todos">Todos los materiales</option>
                {mats.map((m) => <option key={m.id}>{m.nombre}</option>)}
              </select>
              <select value={invFiltroColor} onChange={(e) => setInvFiltroColor(e.target.value)} style={{ ...smlStyle, width: "auto" }}>
                <option value="Todos">Todos los colores</option>
                {[...new Set(inv.map((r) => r.color))].map((c) => <option key={c}>{c}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: CHELY.lilaOscuro, cursor: "pointer" }}>
                <input type="checkbox" checked={invSoloAlerta} onChange={(e) => setInvSoloAlerta(e.target.checked)} />
                Solo alertas
              </label>
            </div>

            {invFiltrado.length === 0 && (
              <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>Sin carretes.</div>
            )}

            {invFiltrado.map((r) => {
              const grRest = r.grInicial - r.grUsado - r.grPurga;
              const pct = Math.max(0, Math.min(100, (grRest / r.grInicial) * 100));
              const barColor = pct < 20 ? "#e74c3c" : pct < 40 ? "#e67e22" : CHELY.lila;
              return (
                <div
                  key={r.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "14px 16px",
                    border: `1.5px solid ${r.alerta ? "#e74c3c44" : CHELY.lavanda}`,
                    borderLeft: `4px solid ${r.alerta ? "#e74c3c" : CHELY.lila}`,
                    boxShadow: `0 2px 6px ${CHELY.lila}10`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: CHELY.lilaOscuro,
                        background: CHELY.perla,
                        padding: "2px 10px",
                        borderRadius: 12,
                        border: `1px solid ${CHELY.lavanda}`,
                      }}>
                        {r.material} {r.tipo}
                      </span>
                      {r.marca && (
                        <span style={{
                          fontSize: 11,
                          color: "#555",
                          background: "#e8f4f8",
                          padding: "2px 10px",
                          borderRadius: 12,
                          border: "1px solid #b8d4e0",
                          fontWeight: 600,
                        }}>
                          {r.marca}
                        </span>
                      )}
                      <span style={{
                        fontSize: 12,
                        color: "#555",
                        background: CHELY.dorado + "55",
                        padding: "2px 10px",
                        borderRadius: 12,
                        border: `1px solid ${CHELY.dorado}`,
                        fontWeight: 600,
                      }}>
                        {r.color}
                      </span>
                      {r.alerta && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#e74c3c", background: "#fee", padding: "2px 10px", borderRadius: 12, border: "1px solid #e55" }}>
                          ⚠ Stock bajo
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CHELY.lilaOscuro, fontFamily: "'Playfair Display', serif" }}>
                      {Math.round(grRest)}g
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#eee", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width .5s" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#888", flexWrap: "wrap" }}>
                    <span>Inicial: {r.grInicial}g</span>
                    <span>Usado: {r.grUsado}g</span>
                    <span>Purga: {r.grPurga}g</span>
                    {r.lote && <span>Lote: {r.lote}</span>}
                    {r.fecha && <span>Fecha: {r.fecha}</span>}
                  </div>
                  {/* Editar todos los campos del carrete */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Material</label>
                      <input
                        type="text"
                        style={smlStyle}
                        value={r.material}
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, material: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Variante</label>
                      <input
                        type="text"
                        style={smlStyle}
                        value={r.tipo}
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, tipo: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Color</label>
                      <input
                        type="text"
                        style={smlStyle}
                        value={r.color}
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, color: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Marca</label>
                      <input
                        type="text"
                        style={smlStyle}
                        value={r.marca}
                        placeholder="Ej: Sunlu, Eryone..."
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, marca: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Lote</label>
                      <input
                        type="text"
                        style={smlStyle}
                        value={r.lote}
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, lote: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Fecha de compra</label>
                      <input
                        type="date"
                        style={smlStyle}
                        value={r.fecha}
                        onChange={(e) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, fecha: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 2 }}>Gramos iniciales</label>
                      <NumInput
                        min={0}
                        value={r.grInicial}
                        onCommit={(n) => setInv((p) => p.map((x) => (x.id === r.id ? { ...x, grInicial: n } : x)))}
                        style={{ ...smlStyle, width: "100%" }}
                      />
                    </div>
                  </div>
                  {/* Editar gramos usados */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600 }}>Gramos usados:</label>
                    <NumInput
                      min={0}
                      max={r.grInicial}
                      value={r.grUsado}
                      onCommit={(n) =>
                        setInv((p) => p.map((x) => (x.id === r.id ? { ...x, grUsado: n } : x)))
                      }
                      style={{ ...smlStyle, width: 90 }}
                    />
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600 }}>Purga:</label>
                    <NumInput
                      min={0}
                      max={r.grInicial}
                      value={r.grPurga}
                      onCommit={(n) =>
                        setInv((p) => p.map((x) => (x.id === r.id ? { ...x, grPurga: n } : x)))
                      }
                      style={{ ...smlStyle, width: 90 }}
                    />
                    <button
                      onClick={() => borrarInv(r.id)}
                      style={{
                        marginLeft: "auto",
                        padding: "5px 14px",
                        fontSize: 12,
                        borderRadius: 8,
                        cursor: "pointer",
                        background: "#fee",
                        border: "1px solid #e55",
                        color: "#c33",
                        fontWeight: 600,
                      }}
                    >
                      🗑 Borrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {tab === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Pendiente", val: fmt(totalPendiente), color: "#e67e22", icon: "⏳" },
                { label: "Confirmado", val: fmt(totalConfirmado), color: "#27ae60", icon: "✅" },
                { label: "Este mes", val: fmt(totalMes), color: CHELY.lilaMedia, icon: "📅" },
                { label: "Trabajos totales", val: trabajos.length, color: CHELY.rosaOscuro, icon: "📋" },
              ].map(({ label, val, color, icon }) => (
                <div
                  key={label}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "16px 18px",
                    border: `1.5px solid ${CHELY.lavanda}`,
                    borderTop: `4px solid ${color}`,
                    boxShadow: `0 2px 8px ${color}20`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: "#999", fontFamily: "'Poppins', system-ui, sans-serif" }}>{icon} {label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color, fontFamily: "'Playfair Display', serif" }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de ventas */}
            {ventasPorMes.length > 0 && (
              <div style={{
                background: "#fff",
                borderRadius: 12,
                padding: "16px 18px",
                border: `1.5px solid ${CHELY.lavanda}`,
              }}>
                <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, color: CHELY.lilaOscuro }}>📊 Ventas por mes</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                  {ventasPorMes.map((v) => (
                    <div key={v.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${(v.val / maxBar) * 80}px`,
                          background: CHELY.grad,
                          borderRadius: "4px 4px 0 0",
                          minHeight: 4,
                          boxShadow: `0 2px 6px ${CHELY.lila}40`,
                        }}
                      />
                      <span style={{ fontSize: 10, color: "#999" }}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventario alertas */}
            {rollosAlerta > 0 && (
              <div style={{
                background: "#fff",
                borderRadius: 12,
                padding: "14px 16px",
                border: "1.5px solid #e74c3c44",
                borderLeft: "4px solid #e74c3c",
              }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#e74c3c", fontSize: 13 }}>⚠ Carretes con stock bajo</p>
                {invConAlerta
                  .filter((r) => r.alerta)
                  .map((r) => (
                    <p key={r.id} style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>
                      {r.material} {r.tipo} {r.color} — {Math.round(r.grInicial - r.grUsado - r.grPurga)}g restantes
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CONFIGURACIÓN ══ */}
        {tab === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Seccion tipo="params" titulo="Parámetros de costo">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  { label: "Costo electricidad (Bs/kWh)", key: "electricidadKwh" as keyof Config },
                  { label: "Consumo impresora (kW)", key: "consumoKw" as keyof Config },
                  { label: "Desgaste por hora (Bs)", key: "desgastePorHora" as keyof Config },
                  { label: "Alerta de stock (g)", key: "alertaGramos" as keyof Config },
                ] as const).map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</label>
                    <NumInput
                      style={inpStyle}
                      step={0.001}
                      min={0}
                      value={cfg[key] as number}
                      onCommit={(n) => setCfg({ [key]: n })}
                    />
                  </div>
                ))}
              </div>
            </Seccion>

            <Seccion
              tipo="material"
              titulo="Materiales, variantes y costos"
              accion={
                <button
                  onClick={() => {
                    setNuevoMat({ nombre: "", costo: 100, variante: "", color: "" });
                    setEditMatId(null);
                    setMatModal(true);
                  }}
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
                  + Nuevo material
                </button>
              }
            >
              {mats.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 10,
                    border: `1.5px solid ${CHELY.lavanda}`,
                    boxShadow: `0 2px 6px ${CHELY.lila}15`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: CHELY.lilaOscuro, fontWeight: 700 }}>{m.nombre}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditMatId(m.id);
                          setNuevaVariante("");
                          setMatModal(true);
                        }}
                        style={{
                          padding: "4px 12px",
                          fontSize: 11,
                          borderRadius: 8,
                          cursor: "pointer",
                          background: CHELY.perla,
                          border: `1px solid ${CHELY.lavanda}`,
                          color: CHELY.lilaOscuro,
                          fontWeight: 600,
                        }}
                      >
                        + Variante
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el material "${m.nombre}"?`)) {
                            setMats((p) => p.filter((x) => x.id !== m.id));
                          }
                        }}
                        style={{
                          padding: "4px 12px",
                          fontSize: 11,
                          borderRadius: 8,
                          cursor: "pointer",
                          background: "#fee",
                          border: "1px solid #e55",
                          color: "#c33",
                          fontWeight: 600,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Costo (Bs/kg):</label>
                    <NumInput
                      style={{ ...smlStyle, width: 100 }}
                      value={m.costo}
                      min={0}
                      onCommit={(n) => setMats((p) => p.map((x) => (x.id === m.id ? { ...x, costo: n } : x)))}
                    />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.variantes.map((v) => (
                      <span
                        key={v}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 16,
                          background: CHELY.lavanda + "33",
                          border: `1px solid ${CHELY.lavanda}`,
                          color: CHELY.lilaOscuro,
                        }}
                      >
                        {v}
                        <button
                          onClick={() => {
                            if (m.variantes.length > 1) {
                              setMats((p) => p.map((x) => (x.id === m.id ? { ...x, variantes: x.variantes.filter((vv) => vv !== v) } : x)));
                            }
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: m.variantes.length > 1 ? "pointer" : "not-allowed",
                            color: CHELY.rosaOscuro,
                            fontSize: 12,
                            opacity: m.variantes.length > 1 ? 1 : 0.3,
                            padding: 0,
                          }}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </Seccion>
          </div>
        )}

      </div>

      {/* ══ MODAL NUEVO CARRETE ══ */}
      {invModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(60,20,80,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 420, boxShadow: `0 20px 60px ${CHELY.lila}44` }}>
            <div style={{ background: CHELY.grad, margin: "-24px -24px 20px", padding: "16px 24px", borderRadius: "18px 18px 0 0" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>🧵 Nuevo Carrete</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Material", key: "material", opts: mats.map((m) => m.nombre) },
                { label: "Variante", key: "tipo", opts: mats.find((m) => m.nombre === nuevoRoll.material || m.id === nuevoRoll.material)?.variantes || ["Estándar"] },
                { label: "Color", key: "color", opts: coloresInvDisponibles },
              ].map(({ label, key, opts }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
                  <select
                    style={inpStyle}
                    value={nuevoRoll[key as keyof typeof nuevoRoll] as string}
                    onChange={(e) => setNuevoRoll((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {nuevoRoll.color === "Otro" && (
                <div>
                  <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Nombre del color</label>
                  <input
                    style={inpStyle}
                    placeholder="Ej: Rosa pastel, Beige champagne..."
                    value={colorPersonalizado}
                    onChange={(e) => setColorPersonalizado(e.target.value)}
                  />
                </div>
              )}
              {[
                { label: "Marca", key: "marca", type: "text", placeholder: "Ej: Sunlu, Eryone, Creality..." },
                { label: "Lote", key: "lote", type: "text", placeholder: "Ej: L-005" },
                { label: "Fecha de compra", key: "fecha", type: "date" },
                { label: "Gramos iniciales", key: "grInicial", type: "number" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
                  <input
                    style={inpStyle}
                    type={type}
                    placeholder={placeholder}
                    value={nuevoRoll[key as keyof typeof nuevoRoll] as string | number}
                    onChange={(e) => setNuevoRoll((p) => ({ ...p, [key]: type === "number" ? toNum(e.target.value) : e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={agregarRollo}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: CHELY.grad,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                  boxShadow: `0 4px 14px ${CHELY.lila}55`,
                }}
              >
                ✅ Agregar carrete
              </button>
              <button
                onClick={() => setInvModal(false)}
                style={{
                  padding: "12px 18px",
                  background: "#fff",
                  border: `1.5px solid ${CHELY.lavanda}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: CHELY.lilaOscuro,
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EDITAR ══ */}
      {editModal && editData && dEdit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(60,20,80,.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div style={{
            background: CHELY.fondo,
            borderRadius: 18,
            padding: 20,
            width: "100%",
            maxWidth: 680,
            boxShadow: `0 20px 60px ${CHELY.lila}44`,
            margin: "20px auto",
          }}>
            <div style={{ background: CHELY.grad, margin: "-20px -20px 20px", padding: "16px 20px", borderRadius: "18px 18px 0 0" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>✏ Editar trabajo</h3>
            </div>
            <FormCotizacion data={editData} onChange={changeEdit} mats={mats} cfg={cfg} desglose={dEdit} coloresExtra={coloresExtra} inv={inv} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={guardarEdicion}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: CHELY.grad,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                  boxShadow: `0 4px 14px ${CHELY.lila}55`,
                }}
              >
                💾 Guardar cambios
              </button>
              <button
                onClick={() => { setEditModal(false); setEditData(null); }}
                style={{
                  padding: "12px 18px",
                  background: "#fff",
                  border: `1.5px solid ${CHELY.lavanda}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: CHELY.lilaOscuro,
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL NUEVO MATERIAL / VARIANTE ══ */}
      {matModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(60,20,80,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 400, boxShadow: `0 20px 60px ${CHELY.lila}44` }}>
            <div style={{ background: CHELY.grad, margin: "-24px -24px 20px", padding: "16px 24px", borderRadius: "18px 18px 0 0" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>
                {editMatId ? "+ Agregar variante" : "Nuevo Material"}
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {editMatId ? (
                <div>
                  <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>
                    Nueva variante para {mats.find((m) => m.id === editMatId)?.nombre}
                  </label>
                  <input
                    style={inpStyle}
                    placeholder="Ej: Carbono, Glitter..."
                    value={nuevaVariante}
                    onChange={(e) => setNuevaVariante(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Nombre del material</label>
                    <input
                      style={inpStyle}
                      placeholder="Ej: PC, HIPS, PVA..."
                      value={nuevoMat.nombre}
                      onChange={(e) => setNuevoMat((p) => ({ ...p, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Costo (Bs/kg)</label>
                    <NumInput
                      style={inpStyle}
                      min={0}
                      value={nuevoMat.costo}
                      onCommit={(n) => setNuevoMat((p) => ({ ...p, costo: n }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Variante inicial (opcional)</label>
                    <input
                      style={inpStyle}
                      placeholder="Ej: Estándar, Transparente..."
                      value={nuevoMat.variante}
                      onChange={(e) => setNuevoMat((p) => ({ ...p, variante: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: CHELY.lilaOscuro, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Color disponible (opcional)</label>
                    <input
                      style={inpStyle}
                      placeholder="Ej: Negro, Blanco, Azul..."
                      value={nuevoMat.color}
                      onChange={(e) => setNuevoMat((p) => ({ ...p, color: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  if (editMatId) {
                    // Agregar variante a material existente
                    if (nuevaVariante.trim()) {
                      setMats((p) => p.map((m) =>
                        m.id === editMatId && !m.variantes.includes(nuevaVariante.trim())
                          ? { ...m, variantes: [...m.variantes, nuevaVariante.trim()] }
                          : m
                      ));
                    }
                  } else {
                    // Crear nuevo material
                    if (!nuevoMat.nombre.trim()) return alert("Ingresa el nombre del material.");
                    const newMat: Material = {
                      id: nuevoMat.nombre.trim(),
                      nombre: nuevoMat.nombre.trim(),
                      costo: nuevoMat.costo,
                      variantes: nuevoMat.variante.trim() ? [nuevoMat.variante.trim()] : ["Estándar"],
                    };
                    setMats((p) => [...p, newMat]);
                    // Agregar color a coloresExtra si se especificó y no existe
                    if (nuevoMat.color.trim() && !COLORES_MAT.includes(nuevoMat.color.trim()) && !coloresExtra.includes(nuevoMat.color.trim())) {
                      setColoresExtra((p) => [...p, nuevoMat.color.trim()]);
                    }
                  }
                  setMatModal(false);
                  setEditMatId(null);
                  setNuevoMat({ nombre: "", costo: 100, variante: "", color: "" });
                  setNuevaVariante("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: CHELY.grad,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "'Poppins', system-ui, sans-serif",
                  boxShadow: `0 4px 14px ${CHELY.lila}55`,
                }}
              >
                {editMatId ? "Agregar variante" : "Crear material"}
              </button>
              <button
                onClick={() => {
                  setMatModal(false);
                  setEditMatId(null);
                }}
                style={{
                  padding: "12px 18px",
                  background: "#fff",
                  border: `1.5px solid ${CHELY.lavanda}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: CHELY.lilaOscuro,
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PDF ══ */}
      {pdfModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(60,20,80,.55)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1100,
            padding: 0,
          }}
        >
          <div style={{
            background: CHELY.grad,
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>🖨 Vista previa — {pdfModal.nombre}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={pdfModal.url}
                download={pdfModal.nombre}
                style={{
                  padding: "7px 18px",
                  background: "rgba(255,255,255,.25)",
                  border: "1.5px solid rgba(255,255,255,.6)",
                  borderRadius: 8,
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⬇ Descargar
              </a>
              <button
                onClick={() => { URL.revokeObjectURL(pdfModal.url); setPdfModal(null); }}
                style={{
                  padding: "7px 14px",
                  fontSize: 13,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "rgba(255,255,255,.2)",
                  border: "1.5px solid rgba(255,255,255,.5)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
          <iframe src={pdfModal.url} style={{ flex: 1, border: "none", minHeight: 500 }} title="Vista previa" />
        </div>
      )}

    </div>
  );
}
