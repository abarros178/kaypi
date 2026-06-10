import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { postCheckIn, type CheckInInput } from '@kaypi/shared';

// Simulador iOS: localhost · Emulador Android: http://10.0.2.2:3000 · Device físico: http://<IP-de-tu-PC>:3000
const API_URL = 'http://localhost:3000';

// Demo: en producción usar expo-crypto / react-native-get-random-values (Hermes no trae crypto.randomUUID).
function demoUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  const [estado, setEstado] = useState('Listo para marcar');
  const [cargando, setCargando] = useState(false);

  async function marcar() {
    setCargando(true);
    setEstado('Enviando…');
    const input: CheckInInput = {
      eventId: demoUuid(),
      empleadoId: 'emp_felipe',
      oficinaId: 'ofi_cdmx',
      tipo: 'IN',
      canal: 'MOVIL',
      nivelAplicado: 'LOGIN_FACIAL',
      ubicacion: { lat: 19.4326, lng: -99.1332, accuracyM: 10 },
      identidad: { facialOk: true },
      clienteLocal: new Date().toISOString(),
      fuente: 'NORMAL',
    };
    const r = await postCheckIn(API_URL, input);
    setCargando(false);
    setEstado(r.ok ? `Entrada confirmada\n${r.event.timestamp.servidorUTC}` : `Error: ${r.error}`);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.brand}>Kaypi</Text>
      </View>

      <Text style={styles.title}>Asistencia verificada</Text>
      <Text style={styles.subtitle}>Presencia confirmada · facial nativo + GPS</Text>

      <View style={styles.card}>
        <Pressable
          style={[styles.boton, cargando && styles.botonOff]}
          onPress={marcar}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>{cargando ? 'Registrando…' : 'Marcar entrada'}</Text>
        </Pressable>
        <Text style={styles.estado}>{estado}</Text>
      </View>

      <Text style={styles.nota}>
        Andamiaje del día 0 (Felipe). El contrato (@kaypi/shared) y la línea de diseño ya están
        listos. Apunta tu API en API_URL. Facial nativo, GPS y cola offline: siguiente paso.
      </Text>
    </View>
  );
}

const C = {
  bg: '#fcfcfd',
  fg: '#27272f',
  muted: '#71717a',
  primary: '#13b3a4',
  primaryFg: '#f7fffd',
  border: '#e6e6ea',
  card: '#ffffff',
  success: '#1fbf66',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24, paddingTop: 96, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: C.success },
  brand: { fontSize: 18, fontWeight: '600', color: C.fg, letterSpacing: -0.3 },
  title: { fontSize: 30, fontWeight: '700', color: C.fg, letterSpacing: -0.5, marginTop: 16 },
  subtitle: { fontSize: 15, color: C.muted },
  card: {
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 16,
  },
  boton: { backgroundColor: C.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  botonOff: { opacity: 0.6 },
  botonTexto: { color: C.primaryFg, fontSize: 16, fontWeight: '600' },
  estado: { color: C.muted, fontSize: 13, textAlign: 'center', fontVariant: ['tabular-nums'] },
  nota: { marginTop: 'auto', marginBottom: 40, color: C.muted, fontSize: 12, lineHeight: 18 },
});
