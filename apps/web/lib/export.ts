/** Genera CSV a partir de encabezados + filas (escapa comillas, comas y saltos). */
export function toCSV(headers: string[], rows: Array<Array<string | number>>): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((fila) => fila.map(esc).join(',')).join('\n');
}

/** Respuesta de descarga CSV (con BOM para que Excel respete UTF-8). */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(`﻿${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}

export function pdfResponse(buffer: Uint8Array, filename: string): Response {
  // En runtime Response acepta Uint8Array/Buffer; el cast evita el estrechamiento de
  // Uint8Array<ArrayBufferLike> vs BodyInit en TS reciente.
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
