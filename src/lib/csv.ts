function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function descargarCSV<T extends object>(nombreArchivo: string, filas: T[], columnas: (keyof T & string)[]): void {
  const encabezado = columnas.join(",");
  const cuerpo = filas.map((fila) => columnas.map((c) => escapeCell(fila[c])).join(","));
  const contenido = "\uFEFF" + [encabezado, ...cuerpo].join("\r\n");
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
