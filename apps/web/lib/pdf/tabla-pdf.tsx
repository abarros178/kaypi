import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface TablaPDFProps {
  titulo: string;
  subtitulo: string;
  headers: string[];
  rows: string[][];
  /** Índices de columnas alineadas a la derecha (números). */
  alinearDerecha?: number[];
}

const COLOR = {
  primary: '#13b3a4',
  fg: '#27272f',
  muted: '#71717a',
  border: '#e6e6ea',
  headBg: '#f4f4f6',
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: COLOR.fg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLOR.primary },
  brand: { fontSize: 12, fontWeight: 700 },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitulo: { fontSize: 9, color: COLOR.muted, marginBottom: 14 },
  table: { borderTopWidth: 1, borderColor: COLOR.border },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLOR.border },
  headRow: { backgroundColor: COLOR.headBg },
  cell: { flex: 1, paddingVertical: 5, paddingHorizontal: 6 },
  cellHead: { fontWeight: 700, color: COLOR.muted },
  right: { textAlign: 'right' },
  footer: { marginTop: 16, fontSize: 8, color: COLOR.muted },
});

function TablaPDF({ titulo, subtitulo, headers, rows, alinearDerecha = [] }: TablaPDFProps) {
  const der = new Set(alinearDerecha);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.dot} />
          <Text style={styles.brand}>Kaypi</Text>
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.subtitulo}>{subtitulo}</Text>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]}>
            {headers.map((h, i) => (
              <Text key={i} style={[styles.cell, styles.cellHead, der.has(i) ? styles.right : {}]}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((r, ri) => (
            <View key={ri} style={styles.row} wrap={false}>
              {r.map((c, ci) => (
                <Text key={ci} style={[styles.cell, der.has(ci) ? styles.right : {}]}>
                  {c}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generado por Kaypi · Asistencia verificada · datos a partir de marcajes sellados por el servidor.
        </Text>
      </Page>
    </Document>
  );
}

export function renderTablaPDF(props: TablaPDFProps): Promise<Buffer> {
  return renderToBuffer(<TablaPDF {...props} />);
}
