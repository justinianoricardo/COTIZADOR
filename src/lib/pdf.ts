import type { Trabajo, Material, Config } from "../types";
import { calcDesglose, calcDesgloseItem } from "../constants";
import { hoy, fmtFechaCorta } from "../utils";
import logoUrl from "../assets/chely-logo.svg";

// Teléfono por cotizador
const TELEFONOS: Record<string, string> = {
  Ricardo: "+591 64244400",
  Rosario: "+591 75312161",
};
const TEL_DEFAULT = "+591 64244400";

// Logo SVG inline del manual Chely Studio 3D
// Reproduce el isotipo: hexágono con degradado, "C" cursiva y destellos
const LOGO_SVG = `<img src="${logoUrl}" alt="3D CHELY" style="width:108px;height:108px;object-fit:contain;display:block" />`;

function buildHtml(t: Trabajo, mats: Material[], cfg: Config, ref: string): string {
  const d = calcDesglose(t, mats, cfg);
  const fechaCreac = t.fechaCreacion ? fmtFechaCorta(t.fechaCreacion) : (t.fecha || hoy());
  const tel = TELEFONOS[t.cotizador] || TEL_DEFAULT;

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<title>Presupuesto ${ref} — 3D CHELY</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Poppins',Arial,sans-serif;color:#111;font-size:12px;background:#fdf6ff;}
.page{width:8.5in;height:11in;margin:0 auto;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;}

/* ── HEADER ─────────────────────────────── */
.header{
  background:linear-gradient(135deg,#F7B4C8 0%,#CDB4F3 55%,#A78BFA 100%);
  padding:18px 36px 16px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  position:relative;
  overflow:hidden;
}
.header::before{
  content:"";
  position:absolute;top:-40px;right:-40px;
  width:180px;height:180px;
  border-radius:50%;
  background:rgba(255,255,255,.12);
}
.header::after{
  content:"";
  position:absolute;bottom:-25px;left:38%;
  width:110px;height:110px;
  border-radius:50%;
  background:rgba(255,255,255,.08);
}
.brand-left{display:flex;align-items:center;gap:14px;position:relative;z-index:1;}
.brand-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:22px;
  font-weight:700;
  color:#fff;
  text-shadow:0 2px 6px rgba(0,0,0,.18);
  line-height:1.1;
}
.brand-tag{
  font-size:11px;
  color:rgba(255,255,255,.9);
  font-style:italic;
  margin-top:3px;
}
.header-right{text-align:right;position:relative;z-index:1;}
.ref-box{
  background:rgba(255,255,255,.28);
  border:1.5px solid rgba(255,255,255,.55);
  border-radius:10px;
  padding:8px 18px;
}
.ref-label{font-size:10px;color:rgba(255,255,255,.8);letter-spacing:.5px;text-transform:uppercase;}
.ref-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:19px;
  font-weight:700;
  color:#fff;
}
.ref-fecha{font-size:11px;color:rgba(255,255,255,.85);margin-top:2px;}

/* ── SUBHEADER ──────────────────────────── */
.subheader{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#fdf6ff;
  padding:8px 36px;
  border-bottom:2px solid #CDB4F3;
}
.cot-name{font-family:'Poppins',sans-serif;font-size:13px;color:#111;font-weight:600;}
.badge{
  display:inline-block;
  padding:4px 18px;
  border-radius:20px;
  font-size:11px;
  font-weight:700;
  font-family:'Poppins',sans-serif;
  letter-spacing:.3px;
  color:#111;
}
.badge-pendiente{background:#fef3c7;border:1px solid #fcd34d;}
.badge-confirmado{background:#d1fae5;border:1px solid #6ee7b7;}
.badge-cancelado{background:#fee2e2;border:1px solid #fca5a5;}

/* ── BODY ────────────────────────────────── */
.body{padding:16px 36px 14px;flex:1;}
.section-title{
  font-size:10px;
  font-weight:700;
  color:#7c3aed;
  text-transform:uppercase;
  letter-spacing:.9px;
  margin:12px 0 8px;
  display:flex;
  align-items:center;
  gap:6px;
  color:#111;
}
.section-title::after{
  content:"";
  flex:1;
  height:1.5px;
  background:linear-gradient(to right,#CDB4F3,transparent);
}
.grid2{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:4px;}
.field label{font-size:9.5px;color:#555;display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.4px;}
.field span{font-size:12.5px;font-weight:500;color:#111;}

/* ── TABLA ──────────────────────────────── */
table{width:100%;border-collapse:collapse;margin-top:6px;border-radius:10px;overflow:hidden;}
thead tr{background:linear-gradient(135deg,#A78BFA 0%,#7c3aed 100%);}
thead th{
  color:#fff;
  padding:8px 12px;
  font-size:11px;
  font-weight:700;
  text-align:left;
  letter-spacing:.3px;
  font-family:'Poppins',sans-serif;
}
thead th.right{text-align:right;}
tbody tr:nth-child(even){background:#fdf6ff;}
tbody tr:nth-child(odd){background:#fff;}
tbody td{
  padding:10px 12px;
  font-size:12.5px;
  color:#111;
  border-bottom:1px solid #e9e0ff;
}
tbody td.right{text-align:right;font-weight:700;color:#111;}
tbody td.piece{font-weight:700;color:#111;}
tbody tr.cost-row td{
  padding:4px 8px 6px;
  font-size:10px;
  background:#f5f0ff !important;
  border-bottom:2px solid #e2d9f3;
}
.cost-cell{display:inline-block;margin-right:12px;}
.cost-lbl{display:block;font-size:9px;color:#7c3aed;text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px;}
.cost-val{font-size:11px;font-weight:600;color:#111;}
.cost-val.hi{color:#6d28d9;font-weight:700;}
.price-badge{display:inline-block;background:linear-gradient(135deg,#6d28d9,#A78BFA);color:#fff;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;}
tbody tr.sum-row td{background:linear-gradient(135deg,#f5f0ff,#ede9fe) !important;font-weight:700;font-size:11px;}

/* ── TOTAL BOX ──────────────────────────── */
.total-wrap{display:flex;gap:12px;margin-top:14px;}
.total-box{
  flex:1;
  background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 40%,#A78BFA 100%);
  border-radius:14px;
  padding:16px 26px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  box-shadow:0 6px 20px rgba(109,40,217,.45);
}
/* Izquierda: por unidad */
.unit-side{text-align:left;}
.unit-label{font-size:10px;color:rgba(255,255,255,.85);font-family:'Poppins',sans-serif;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px;}
.unit-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;
  font-weight:700;
  color:#fff;
  text-shadow:0 1px 4px rgba(0,0,0,.2);
}
/* Derecha: total final */
.total-side{text-align:right;}
.total-label{font-size:10px;color:rgba(255,255,255,.85);font-family:'Poppins',sans-serif;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px;}
.total-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:30px;
  font-weight:700;
  color:#fff;
  text-shadow:0 2px 6px rgba(0,0,0,.2);
}
/* Divisor central */
.total-divider{
  width:1.5px;
  height:44px;
  background:rgba(255,255,255,.35);
  border-radius:2px;
  align-self:center;
}

/* ── NOTA ──────────────────────────────── */
.nota{
  background:#fffbe6;
  border-left:4px solid #d97706;
  border-radius:0 8px 8px 0;
  padding:8px 14px;
  font-size:11.5px;
  color:#111;
  margin-top:12px;
}

/* ── FOOTER ─────────────────────────────── */
.footer{
  background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#A78BFA 100%);
  padding:11px 36px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.footer-brand{
  font-family:'Playfair Display',Georgia,serif;
  font-size:14px;
  font-weight:700;
  color:#fff;
}
.footer-info{font-size:10px;color:rgba(255,255,255,.9);margin-top:2px;}
.footer-tag{font-size:10px;color:rgba(255,255,255,.85);font-style:italic;text-align:right;}
.validity{
  background:rgba(255,255,255,.22);
  border:1px solid rgba(255,255,255,.45);
  border-radius:8px;
  padding:7px 16px;
  font-size:10px;
  color:#fff;
  text-align:center;
  font-weight:600;
}

#print-bar{
  position:fixed;bottom:0;left:0;right:0;
  background:#1e1b2e;color:#fff;
  padding:10px 24px;
  display:flex;align-items:center;gap:16px;
  font-family:'Poppins',Arial,sans-serif;
  z-index:100;
}
#print-bar .title{font-size:14px;font-weight:600;flex:1;}
#print-bar .meta{font-size:12px;color:#cbb6f3;}
#print-bar button{
  padding:8px 22px;border:none;border-radius:8px;
  background:linear-gradient(135deg,#A78BFA,#7c3aed);
  color:#fff;font-size:13px;font-weight:600;cursor:pointer;
}

@media print {
  @page{size:letter;margin:0;}
  html,body{background:#fff;margin:0;padding:0;width:8.5in;height:11in;overflow:hidden;}
  .page{margin:0;width:8.5in;height:11in;page-break-after:avoid;page-break-inside:avoid;overflow:hidden;}
  #print-bar{display:none !important;}
}
</style></head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="brand-left">
      ${LOGO_SVG}
    </div>
    <div class="header-right">
      <div class="ref-box">
        <div class="ref-label">Presupuesto</div>
        <div class="ref-val">Ref. ${ref}</div>
        <div class="ref-fecha">Creado el ${fechaCreac}</div>
      </div>
    </div>
  </div>

  <!-- SUBHEADER -->
  <div class="subheader">
    <div class="cot-name">👤 Cotizado por: <strong>${t.cotizador}</strong></div>
    <div>
      <span class="badge badge-${(t.estado || "pendiente").toLowerCase()}">${t.estado}</span>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Datos del cliente -->
    <div class="section-title">Datos del cliente</div>
    <div class="grid2">
      <div class="field"><label>Nombre</label><span>${t.cliente}</span></div>
      <div class="field"><label>Teléfono</label><span>${t.telefono || "—"}</span></div>
      <div class="field"><label>Email</label><span>${t.email || "—"}</span></div>
      <div class="field"><label>Ciudad</label><span>${t.ciudad || "—"}</span></div>
    </div>

    <!-- Desglose por item -->
    <div class="section-title">Desglose por item</div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th style="width:38px">Cant.</th>
          <th>Pieza / Descripcion</th>
          <th style="width:44px;text-align:center">Horas</th>
          <th style="width:78px;text-align:right">Material</th>
          <th style="width:90px;text-align:right">Precio c/u</th>
        </tr>
      </thead>
      <tbody>
        ${(t.items || []).map((item, idx) => {
          const di = calcDesgloseItem(item, mats, cfg, t.markup || 0);
          const totalGramos = (item.materiales || []).reduce((s, m) => s + (Number(m.gramos) || 0), 0);
          return `
        <tr>
          <td style="text-align:center;font-weight:700;color:#7c3aed;font-size:13px">${idx + 1}</td>
          <td style="text-align:center;font-weight:700;font-size:14px">${item.cantidad}</td>
          <td class="piece">${item.pieza}${item.descripcion ? `<br><span style="font-weight:400;color:#555;font-size:10.5px">${item.descripcion}</span>` : ""}</td>
          <td style="text-align:center">${item.horas || 0}h</td>
          <td style="text-align:right">${totalGramos}g</td>
          <td style="text-align:right"><span class="price-badge">Bs ${di.precioPorUnidad.toFixed(2)}</span></td>
        </tr>`;
        }).join("")}
      </tbody>
    </table>



    <!-- Total box -->
    <div class="total-wrap">
      <div class="total-box">
        <div class="total-side" style="flex:1">
          <div class="total-label">PRECIO FINAL (${d.cantidad} ${d.cantidad > 1 ? "piezas" : "pieza"})</div>
          <div class="total-val">Bs ${d.precioTotal.toFixed(2)}</div>
        </div>
      </div>
    </div>

    ${t.notas ? `<div class="nota"><strong>📝 Notas:</strong> ${t.notas}</div>` : ""}

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div class="footer-brand">3D CHELY</div>
      <div class="footer-info">${tel} · TikTok: @3d.chely</div>
    </div>
    <div class="validity">
      ⏳ Válido por 15 días<br>desde la fecha de emisión
    </div>
    <div>
      <div class="footer-tag">Tú lo imaginas...<br>nosotros lo imprimimos.</div>
    </div>
  </div>

</div>
<div id="print-bar">
  <div class="title">Cotización — ${(t.pieza || "Sin nombre").replace(/</g, "&lt;")}</div>
  <div class="meta">Ref: ${ref}</div>
  <button onclick="window.print()">Imprimir</button>
</div>
</body></html>`;
}

export function imprimirPDF(t: Trabajo, mats: Material[], cfg: Config, ref: string = ""): string | null {
  const html = buildHtml(t, mats, cfg, ref || String(t.id).slice(-6));
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=960,height=780");
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `Presupuesto-${ref || t.id.slice(-6)}-${(t.pieza || "").replace(/\s+/g, "-")}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return url;
  } catch {
    return null;
  }
}

export function generarHtmlPresupuesto(t: Trabajo, mats: Material[], cfg: Config, ref: string = ""): { url: string; nombre: string } | null {
  const html = buildHtml(t, mats, cfg, ref || String(t.id).slice(-6));
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    return {
      url,
      nombre: `Presupuesto-${ref || t.id.slice(-6)}-${(t.pieza || "").replace(/\s+/g, "-")}.html`,
    };
  } catch {
    return null;
  }
}
