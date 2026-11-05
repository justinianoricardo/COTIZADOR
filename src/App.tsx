import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import type { Job, AppSettings, Material, JobItem, Extra, MaterialLine } from './lib/types';
import { calcJobTotal, calcItemCosts, formatBs } from './lib/calc';
import { PrintView } from './components/PrintView';
import {
  Printer,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Settings,
  Package,
  FileText,
  Edit2,
  X,
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  key: 'main',
  electricidad_kwh: 1.021,
  consumo_kw: 0.15,
  desgaste_por_hora: 3.5,
  alerta_gramos: 100,
  colores_extra: [],
};

const COLORES_BASE = ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Rosa', 'Marrón'];

function genId() {
  return Math.random().toString(36).slice(2, 13);
}

function newItem(): JobItem {
  return {
    id: genId(),
    pieza: '',
    descripcion: '',
    cantidad: 1,
    horas: 2,
    manoObra: 0,
    materiales: [{ id: genId(), nombre: 'PLA', tipo: 'Estándar', color: 'Gris', gramos: 100 }],
  };
}

function newJob(): Omit<Job, 'id' | 'fecha_creacion'> {
  return {
    cotizador: '',
    cliente: '',
    telefono: '',
    email: '',
    ciudad: '',
    items: [newItem()],
    extras: [],
    markup: 40,
    notas: '',
    fecha: new Date().toISOString().slice(0, 10),
    fecha_entrega: '',
    estado: 'Pendiente',
    total: 0,
  };
}

type View = 'list' | 'edit' | 'print' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('list');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [draftJob, setDraftJob] = useState<Omit<Job, 'id' | 'fecha_creacion'>>(newJob());
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsMap, setMaterialsMap] = useState<Record<string, Material>>({});
  const [saving, setSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [jobsRes, settingsRes, matsRes] = await Promise.all([
      supabase.from('jobs').select('*').order('updated_at', { ascending: false }),
      supabase.from('app_settings').select('*').eq('key', 'main').maybeSingle(),
      supabase.from('materials').select('*').order('sort_order'),
    ]);

    if (jobsRes.data) setJobs(jobsRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    if (matsRes.data) {
      setMaterials(matsRes.data);
      const map: Record<string, Material> = {};
      for (const m of matsRes.data) map[m.nombre] = m;
      setMaterialsMap(map);
    }
  }

  const computedTotal = useCallback(
    (draft: Omit<Job, 'id' | 'fecha_creacion'>) =>
      calcJobTotal(draft.items, draft.extras, draft.markup, settings, materialsMap),
    [settings, materialsMap]
  );

  function openNew() {
    setDraftJob(newJob());
    setSelectedJob(null);
    setExpandedItems(new Set());
    setView('edit');
  }

  function openEdit(job: Job) {
    setSelectedJob(job);
    setDraftJob({
      numero: job.numero,
      cotizador: job.cotizador,
      cliente: job.cliente,
      telefono: job.telefono,
      email: job.email,
      ciudad: job.ciudad,
      items: job.items,
      extras: job.extras,
      markup: job.markup,
      notas: job.notas,
      fecha: job.fecha,
      fecha_entrega: job.fecha_entrega,
      estado: job.estado,
      total: job.total,
    });
    setExpandedItems(new Set(job.items.map((i) => i.id)));
    setView('edit');
  }

  function openPrint(job: Job) {
    setSelectedJob(job);
    setView('print');
  }

  async function saveJob() {
    setSaving(true);
    const total = computedTotal(draftJob);
    const { numero, ...payload } = draftJob;
    const payloadWithTotal = { ...payload, total };

    if (selectedJob) {
      await supabase
        .from('jobs')
        .update({ ...payloadWithTotal, updated_at: new Date().toISOString() })
        .eq('id', selectedJob.id);
    } else {
      const id = genId();
      await supabase.from('jobs').insert({ id, ...payloadWithTotal });
    }

    await loadData();
    setSaving(false);
    setView('list');
  }

  async function deleteJob(id: string) {
    if (!confirm('¿Eliminar esta cotización?')) return;
    await supabase.from('jobs').delete().eq('id', id);
    await loadData();
  }

  async function saveSettings() {
    await supabase.from('app_settings').upsert(settings);
    await loadData();
  }

  // Draft helpers
  function setField<K extends keyof typeof draftJob>(k: K, v: (typeof draftJob)[K]) {
    setDraftJob((d) => ({ ...d, [k]: v }));
  }

  function addItem() {
    const item = newItem();
    setDraftJob((d) => ({ ...d, items: [...d.items, item] }));
    setExpandedItems((s) => new Set([...s, item.id]));
  }

  function removeItem(id: string) {
    setDraftJob((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
  }

  function updateItem(id: string, changes: Partial<JobItem>) {
    setDraftJob((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...changes } : i)),
    }));
  }

  function addMaterial(itemId: string) {
    updateItem(itemId, {
      materiales: [
        ...(draftJob.items.find((i) => i.id === itemId)?.materiales ?? []),
        { id: genId(), nombre: 'PLA', tipo: 'Estándar', color: 'Gris', gramos: 50 },
      ],
    });
  }

  function updateMaterial(itemId: string, matId: string, changes: Partial<MaterialLine>) {
    const item = draftJob.items.find((i) => i.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      materiales: item.materiales.map((m) => (m.id === matId ? { ...m, ...changes } : m)),
    });
  }

  function removeMaterial(itemId: string, matId: string) {
    const item = draftJob.items.find((i) => i.id === itemId);
    if (!item) return;
    updateItem(itemId, { materiales: item.materiales.filter((m) => m.id !== matId) });
  }

  function addExtra() {
    setDraftJob((d) => ({
      ...d,
      extras: [...d.extras, { id: genId(), descripcion: '', monto: 0 }],
    }));
  }

  function updateExtra(id: string, changes: Partial<Extra>) {
    setDraftJob((d) => ({
      ...d,
      extras: d.extras.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    }));
  }

  function removeExtra(id: string) {
    setDraftJob((d) => ({ ...d, extras: d.extras.filter((e) => e.id !== id) }));
  }

  function toggleExpand(id: string) {
    setExpandedItems((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  }

  const allColors = [...COLORES_BASE, ...(settings.colores_extra ?? [])];

  if (view === 'print' && selectedJob) {
    return (
      <>
        <div className="no-print" style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setView('list')}>
            ← Volver
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
        <PrintView job={selectedJob} settings={settings} materialsMap={materialsMap} />
      </>
    );
  }

  if (view === 'settings') {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Configuración</h1>
          <button className="btn btn-secondary" onClick={() => setView('list')}>
            ← Volver
          </button>
        </header>
        <div className="card" style={{ maxWidth: 500, margin: '2rem auto' }}>
          <h2 className="section-title">Costos de operación</h2>
          <div className="form-grid">
            <label>
              Electricidad (Bs/kWh)
              <input
                type="number"
                className="input"
                value={settings.electricidad_kwh}
                onChange={(e) => setSettings((s) => ({ ...s, electricidad_kwh: +e.target.value }))}
              />
            </label>
            <label>
              Consumo impresora (kW)
              <input
                type="number"
                className="input"
                value={settings.consumo_kw}
                onChange={(e) => setSettings((s) => ({ ...s, consumo_kw: +e.target.value }))}
              />
            </label>
            <label>
              Desgaste por hora (Bs)
              <input
                type="number"
                className="input"
                value={settings.desgaste_por_hora}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, desgaste_por_hora: +e.target.value }))
                }
              />
            </label>
            <label>
              Alerta inventario (g)
              <input
                type="number"
                className="input"
                value={settings.alerta_gramos}
                onChange={(e) => setSettings((s) => ({ ...s, alerta_gramos: +e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={saveSettings}>
            <Save size={16} /> Guardar
          </button>
        </div>
      </div>
    );
  }

  if (view === 'edit') {
    const total = computedTotal(draftJob);
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>{selectedJob ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setView('list')}>
              <X size={16} /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={saveJob} disabled={saving}>
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </header>

        <div className="edit-layout">
          {/* Client */}
          <div className="card">
            <h2 className="section-title">Datos del cliente</h2>
            <div className="form-grid">
              <label>
                Cotizador
                <input
                  className="input"
                  value={draftJob.cotizador}
                  onChange={(e) => setField('cotizador', e.target.value)}
                />
              </label>
              <label>
                Cliente
                <input
                  className="input"
                  value={draftJob.cliente}
                  onChange={(e) => setField('cliente', e.target.value)}
                />
              </label>
              <label>
                Teléfono
                <input
                  className="input"
                  value={draftJob.telefono}
                  onChange={(e) => setField('telefono', e.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  className="input"
                  type="email"
                  value={draftJob.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </label>
              <label>
                Ciudad
                <input
                  className="input"
                  value={draftJob.ciudad}
                  onChange={(e) => setField('ciudad', e.target.value)}
                />
              </label>
              <label>
                Estado
                <select
                  className="input"
                  value={draftJob.estado}
                  onChange={(e) => setField('estado', e.target.value)}
                >
                  <option>Pendiente</option>
                  <option>Confirmado</option>
                  <option>En proceso</option>
                  <option>Entregado</option>
                  <option>Cancelado</option>
                </select>
              </label>
              <label>
                Fecha cotización
                <input
                  className="input"
                  type="date"
                  value={draftJob.fecha}
                  onChange={(e) => setField('fecha', e.target.value)}
                />
              </label>
              <label>
                Fecha entrega
                <input
                  className="input"
                  type="date"
                  value={draftJob.fecha_entrega}
                  onChange={(e) => setField('fecha_entrega', e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">Piezas</h2>
              <button className="btn btn-ghost" onClick={addItem}>
                <Plus size={16} /> Agregar pieza
              </button>
            </div>

            {draftJob.items.map((item) => {
              const costs = calcItemCosts(item, settings, materialsMap);
              const expanded = expandedItems.has(item.id);
              return (
                <div key={item.id} className="item-card">
                  <div className="item-header" onClick={() => toggleExpand(item.id)}>
                    <div className="item-header-left">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="item-name">{item.pieza || '(sin nombre)'}</span>
                      <span className="item-meta">
                        x{item.cantidad} · {item.horas * item.cantidad}h · {formatBs(costs.costoBase)}
                      </span>
                    </div>
                    <button
                      className="btn btn-ghost btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="item-body">
                      <div className="form-grid">
                        <label>
                          Pieza
                          <input
                            className="input"
                            value={item.pieza}
                            onChange={(e) => updateItem(item.id, { pieza: e.target.value })}
                          />
                        </label>
                        <label>
                          Descripción
                          <input
                            className="input"
                            value={item.descripcion}
                            onChange={(e) => updateItem(item.id, { descripcion: e.target.value })}
                          />
                        </label>
                        <label>
                          Cantidad
                          <input
                            className="input"
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateItem(item.id, { cantidad: +e.target.value })}
                          />
                        </label>
                        <label>
                          Horas de impresión
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={0.5}
                            value={item.horas}
                            onChange={(e) => updateItem(item.id, { horas: +e.target.value })}
                          />
                        </label>
                        <label>
                          Mano de obra (Bs)
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={item.manoObra}
                            onChange={(e) => updateItem(item.id, { manoObra: +e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="materials-section">
                        <div className="section-header">
                          <span className="label-sm">Materiales</span>
                          <button className="btn btn-ghost" onClick={() => addMaterial(item.id)}>
                            <Plus size={14} /> Material
                          </button>
                        </div>
                        {item.materiales.map((mat) => (
                          <div key={mat.id} className="material-row">
                            <select
                              className="input"
                              value={mat.nombre}
                              onChange={(e) =>
                                updateMaterial(item.id, mat.id, {
                                  nombre: e.target.value,
                                  tipo: materialsMap[e.target.value]?.variantes[0] ?? 'Estándar',
                                })
                              }
                            >
                              {materials.map((m) => (
                                <option key={m.id}>{m.nombre}</option>
                              ))}
                            </select>
                            <select
                              className="input"
                              value={mat.tipo}
                              onChange={(e) =>
                                updateMaterial(item.id, mat.id, { tipo: e.target.value })
                              }
                            >
                              {(materialsMap[mat.nombre]?.variantes ?? ['Estándar']).map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                            <select
                              className="input"
                              value={mat.color}
                              onChange={(e) =>
                                updateMaterial(item.id, mat.id, { color: e.target.value })
                              }
                            >
                              {allColors.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              placeholder="Gramos"
                              value={mat.gramos}
                              onChange={(e) =>
                                updateMaterial(item.id, mat.id, { gramos: +e.target.value })
                              }
                            />
                            <button
                              className="btn btn-ghost btn-danger"
                              onClick={() => removeMaterial(item.id, mat.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="cost-preview">
                        <span>Material: {formatBs(costs.costoMaterial)}</span>
                        <span>Costos fijos: {formatBs(costs.costosF)}</span>
                        <span>Mano de obra: {formatBs(costs.manoObra)}</span>
                        <span className="cost-total">Total ítem: {formatBs(costs.costoBase)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Extras */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">Extras</h2>
              <button className="btn btn-ghost" onClick={addExtra}>
                <Plus size={16} /> Agregar
              </button>
            </div>
            {draftJob.extras.map((e) => (
              <div key={e.id} className="extra-row">
                <input
                  className="input"
                  placeholder="Descripción"
                  value={e.descripcion}
                  onChange={(ev) => updateExtra(e.id, { descripcion: ev.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Monto"
                  value={e.monto}
                  onChange={(ev) => updateExtra(e.id, { monto: +ev.target.value })}
                />
                <button className="btn btn-ghost btn-danger" onClick={() => removeExtra(e.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card summary-card">
            <h2 className="section-title">Resumen</h2>
            <div className="summary-row">
              <label>
                % Ganancia (markup)
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={draftJob.markup}
                  onChange={(e) => setField('markup', +e.target.value)}
                />
              </label>
            </div>
            <div className="summary-total">
              <span>Total cotización</span>
              <span>{formatBs(total)}</span>
            </div>
            <label style={{ marginTop: '0.75rem', display: 'block' }}>
              Notas
              <textarea
                className="input"
                rows={3}
                value={draftJob.notas}
                onChange={(e) => setField('notas', e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">⬡</span>
          <h1>3D CHELY</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => setView('settings')}>
            <Settings size={16} />
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva cotización
          </button>
        </div>
      </header>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No hay cotizaciones aún</p>
          <button className="btn btn-primary" onClick={openNew}>
            Crear primera cotización
          </button>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <div>
                  <h3>{job.cliente || '(sin cliente)'}</h3>
                  <p className="job-meta">
                    {job.ciudad && <span>{job.ciudad} · </span>}
                    {job.fecha}
                  </p>
                </div>
                <span className={`status-badge status-${job.estado.toLowerCase().replace(' ', '-')}`}>
                  {job.estado}
                </span>
              </div>
              <div className="job-card-body">
                <div className="job-stats">
                  <span>
                    <Package size={14} /> {job.items?.length ?? 0} pieza(s)
                  </span>
                  <span className="job-total">{formatBs(+job.total)}</span>
                </div>
                {job.items?.slice(0, 2).map((item) => (
                  <p key={item.id} className="job-item-preview">
                    · {item.pieza} {item.descripcion && `(${item.descripcion})`}
                  </p>
                ))}
                {(job.items?.length ?? 0) > 2 && (
                  <p className="job-item-preview">+{(job.items?.length ?? 0) - 2} más…</p>
                )}
              </div>
              <div className="job-card-actions">
                <button className="btn btn-ghost" onClick={() => openEdit(job)}>
                  <Edit2 size={14} /> Editar
                </button>
                <button className="btn btn-ghost" onClick={() => openPrint(job)}>
                  <Printer size={14} /> Imprimir
                </button>
                <button className="btn btn-ghost btn-danger" onClick={() => deleteJob(job.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
