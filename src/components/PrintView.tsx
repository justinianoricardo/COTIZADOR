import type { Job, AppSettings, Material } from '../lib/types';
import { calcItemCosts, formatBs } from '../lib/calc';

interface PrintViewProps {
  job: Job;
  settings: AppSettings;
  materialsMap: Record<string, Material>;
}

export function PrintView({ job, settings, materialsMap }: PrintViewProps) {
  const totalBase = job.items.reduce((sum, item) => {
    const { costoBase } = calcItemCosts(item, settings, materialsMap);
    return sum + costoBase;
  }, 0);
  const totalManoObra = job.items.reduce((sum, item) => {
    const { manoObra } = calcItemCosts(item, settings, materialsMap);
    return sum + manoObra;
  }, 0);
  const extrasTotal = job.extras.reduce((s, e) => s + e.monto, 0);
  const precioTotal = (totalBase + totalManoObra + extrasTotal) * (1 + job.markup / 100);

  return (
    <div className="print-container">
      {/* Header */}
      <div className="print-header">
        <div className="print-logo">
          <span className="print-logo-icon">⬡</span>
          <div>
            <h1>3D CHELY</h1>
            <p>Cotización de Impresión 3D</p>
          </div>
        </div>
        <div className="print-header-right">
          <div className="print-badge">{job.estado}</div>
          <p className="print-id">N° {job.id.slice(-6).toUpperCase()}</p>
          <p>Fecha: {job.fecha}</p>
          <p>Entrega: {job.fecha_entrega}</p>
        </div>
      </div>

      {/* Client info */}
      <div className="print-client-grid">
        <div>
          <h2>Cliente</h2>
          <p><strong>{job.cliente}</strong></p>
          {job.telefono && <p>Tel: {job.telefono}</p>}
          {job.email && <p>{job.email}</p>}
          {job.ciudad && <p>{job.ciudad}</p>}
        </div>
        <div>
          <h2>Cotizador</h2>
          <p><strong>{job.cotizador}</strong></p>
        </div>
      </div>

      {/* Items table */}
      <table className="print-table">
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Descripción</th>
            <th className="text-center">Cant.</th>
            <th className="text-center">Hs. Impresión</th>
            <th className="text-right">Cant. Material</th>
            <th className="text-right">Precio c/u</th>
          </tr>
        </thead>
        <tbody>
          {job.items.map((item) => {
            const { costoBase, totalHoras, totalGramos } =
              calcItemCosts(item, settings, materialsMap);

            return (
              <tr key={item.id}>
                <td>{item.pieza}</td>
                <td>{item.descripcion}</td>
                <td className="text-center">{item.cantidad}</td>
                <td className="text-center">{totalHoras}h</td>
                <td className="text-right">{totalGramos}g</td>
                <td className="text-right">{formatBs(costoBase * (1 + job.markup / 100) + (item.manoObra * item.cantidad))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Extras hidden from PDF — summed into total */}

      {/* Totals — only precio total */}
      <div className="print-totals">
        <div className="print-total-final">
          <span>PRECIO FINAL</span>
          <span>{formatBs(precioTotal)}</span>
        </div>
      </div>

      {/* Notes */}
      {job.notas && (
        <div className="print-notes">
          <strong>Notas:</strong> {job.notas}
        </div>
      )}

      <div className="print-footer">
        <p>Gracias por su confianza</p>
      </div>
    </div>
  );
}
