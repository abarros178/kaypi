import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  FLAGS,
  postCheckIn,
  type CheckInEvent,
  type CheckInInput,
  type TipoMarcaje,
} from '@kaypi/shared';

interface CheckInPolicy {
  label: string;
  level: CheckInInput['nivelAplicado'];
  scope: 'employee' | 'shared';
  requiresBiometric: boolean;
  requiresLocation: boolean;
  requiresPhoto: boolean;
  requiresBeacon: boolean;
}

const FELIPE_DEVICE_POLICY: CheckInPolicy = {
  label: 'FELIPE_DEVICE_FACEID',
  level: 'LOGIN_FACIAL',
  scope: 'employee',
  requiresBiometric: true,
  requiresLocation: false,
  requiresPhoto: false,
  requiresBeacon: false,
};

const DIEGO_SHARED_SITE_POLICY: CheckInPolicy = {
  label: 'DIEGO_SHARED_SITE_GEO',
  level: 'LOGIN_GEO',
  scope: 'shared',
  requiresBiometric: false,
  requiresLocation: true,
  requiresPhoto: true,
  requiresBeacon: true,
};

const EMPLOYEES = [
  {
    id: 'emp_felipe',
    name: 'Felipe Gomez',
    email: 'felipe@kaypi.demo',
    officeId: 'ofi_cdmx',
    office: 'Oficina CDMX',
    policy: FELIPE_DEVICE_POLICY,
  },
  {
    id: 'emp_diego',
    name: 'Diego Ramirez',
    email: 'diego@kaypi.demo',
    officeId: 'ofi_cdmx',
    office: 'Oficina CDMX',
    policy: DIEGO_SHARED_SITE_POLICY,
  },
];

type Employee = (typeof EMPLOYEES)[number];
type FlowMode = 'employee' | 'shared' | null;

const PERSONAL_EMPLOYEE = EMPLOYEES[0];
const ADMIN_CODE = '0000';

const QUEUE_KEY = 'kaypi:mobile:checkin-queue';
const EVENTS_KEY = 'kaypi:mobile:daily-events';
const API_PORT = '3000';
const FALLBACK_API_URL = 'http://localhost:3000';
const MAESTRO_MODE = process.env.EXPO_PUBLIC_MAESTRO_MODE === '1';
const MAESTRO_LOCATION = { lat: 19.4326, lng: -99.1332, accuracyM: 12 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const KAYPI_LOGO = require('./src/assets/kaypi-logo.png') as number;

type StepState = 'idle' | 'running' | 'ok' | 'warn' | 'error';

interface Step {
  key: 'identity' | 'location' | 'photo' | 'beacon' | 'submit';
  label: string;
  detail: string;
  state: StepState;
}

interface QueueItem {
  input: CheckInInput;
  createdAt: string;
  lastError?: string;
}

interface CaptureState {
  biometricOk: boolean | null;
  photoRef: string | null;
  location: CheckInInput['ubicacion'] | null;
  beaconOk: boolean | null;
}

interface StoredEvents {
  date: string;
  events: CheckInEvent[];
}

const initialCapture: CaptureState = {
  biometricOk: null,
  photoRef: null,
  location: null,
  beaconOk: null,
};

function stepsForPolicy(policy: CheckInPolicy): Step[] {
  const steps: Step[] = [];
  if (policy.requiresBiometric) {
    steps.push({ key: 'identity', label: 'Face ID', detail: 'Waiting for device biometric', state: 'idle' });
  }
  if (policy.requiresLocation) {
    steps.push({ key: 'location', label: 'GPS', detail: 'Waiting for policy validation', state: 'idle' });
  }
  if (policy.requiresPhoto) {
    steps.push({ key: 'photo', label: 'Photo', detail: 'Waiting for policy validation', state: 'idle' });
  }
  if (policy.requiresBeacon) {
    steps.push({ key: 'beacon', label: 'Bluetooth', detail: 'Waiting for site beacon', state: 'idle' });
  }
  steps.push({ key: 'submit', label: 'Submit', detail: 'Waiting for punch', state: 'idle' });
  return steps;
}

const actionCopy: Record<TipoMarcaje, { label: string; busy: string; success: string }> = {
  IN: { label: 'Check in', busy: 'Preparing check in...', success: 'Check in confirmed.' },
  OUT: { label: 'Check out', busy: 'Preparing check out...', success: 'Check out confirmed.' },
  BREAK_START: { label: 'Lunch break', busy: 'Starting break...', success: 'Break started.' },
  BREAK_END: { label: 'End break', busy: 'Ending break...', success: 'Break ended.' },
};

function nuevoEventId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function eventsKey(employeeId: string): string {
  return `${EVENTS_KEY}:${employeeId}`;
}

function allEventKeys(): string[] {
  return EMPLOYEES.map((employee) => eventsKey(employee.id));
}

function inferApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
  return host ? `http://${host}:${API_PORT}` : FALLBACK_API_URL;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function currentShiftEvents(events: CheckInEvent[]): CheckInEvent[] {
  const lastOutIndex = events.reduce((lastIndex, event, index) => (event.tipo === 'OUT' ? index : lastIndex), -1);
  return events.slice(lastOutIndex + 1);
}

function isRetryableError(error: string, rejected?: boolean): boolean {
  if (rejected) return false;
  return !/input invalido|input inválido|oficina no encontrada|canal .* no habilitado/i.test(error);
}

function statusLabel(state: StepState): string {
  switch (state) {
    case 'running':
      return 'Running';
    case 'ok':
      return 'Ready';
    case 'warn':
      return 'Flagged';
    case 'error':
      return 'Review';
    default:
      return 'Pending';
  }
}

function localFlags(input: CheckInInput): string[] {
  const flags: string[] = [];

  if (input.nivelAplicado === 'LOGIN_GEO' && !input.ubicacion) {
    flags.push(FLAGS.FALTA_UBICACION);
  }

  if (input.nivelAplicado === 'LOGIN_FACIAL') {
    if (input.identidad?.facialOk === false) {
      flags.push(FLAGS.FACIAL_FALLO);
    } else if (input.identidad?.facialOk == null) {
      flags.push(FLAGS.FALTA_FACIAL);
    }
  }

  return flags;
}

function buildLocalEvent(input: CheckInInput, extraFlags: string[] = []): CheckInEvent {
  return {
    eventId: input.eventId,
    empleadoId: input.empleadoId,
    oficinaId: input.oficinaId,
    tipo: input.tipo,
    timestamp: {
      servidorUTC: new Date().toISOString(),
      tz: 'America/Mexico_City',
      clienteLocal: input.clienteLocal,
    },
    canal: input.canal,
    nivelAplicado: input.nivelAplicado,
    ubicacion: input.ubicacion ? { ...input.ubicacion, geofenceOk: true } : null,
    identidad: input.identidad ?? null,
    fuente: input.fuente,
    flags: [...new Set([...localFlags(input), ...extraFlags])],
    creadoPor: null,
  };
}

function computeWorkedMs(events: CheckInEvent[], now: Date): number {
  const checkIn = events.find((event) => event.tipo === 'IN');
  if (!checkIn) return 0;

  const checkInAt = new Date(checkIn.timestamp.servidorUTC).getTime();
  let endAt = now.getTime();
  let breakStartAt: number | null = null;
  let breakMs = 0;

  for (const event of events) {
    const eventAt = new Date(event.timestamp.servidorUTC).getTime();
    if (eventAt < checkInAt) continue;

    if (event.tipo === 'BREAK_START') {
      breakStartAt = eventAt;
    }

    if (event.tipo === 'BREAK_END' && breakStartAt != null) {
      breakMs += Math.max(0, eventAt - breakStartAt);
      breakStartAt = null;
    }

    if (event.tipo === 'OUT') {
      endAt = eventAt;
      if (breakStartAt != null) {
        breakMs += Math.max(0, endAt - breakStartAt);
        breakStartAt = null;
      }
      break;
    }
  }

  if (breakStartAt != null) {
    endAt = breakStartAt;
  }

  return Math.max(0, endAt - checkInAt - breakMs);
}

export default function App() {
  const [apiUrl] = useState(inferApiUrl);
  const [flowMode, setFlowMode] = useState<FlowMode>(null);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');
  const [sharedAdminLoggedIn, setSharedAdminLoggedIn] = useState(false);
  const [sharedNotice, setSharedNotice] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [, setCapture] = useState<CaptureState>(initialCapture);
  const [steps, setSteps] = useState<Step[]>(stepsForPolicy(PERSONAL_EMPLOYEE.policy));
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [events, setEvents] = useState<CheckInEvent[]>([]);
  const [, setLastEvent] = useState<CheckInEvent | null>(null);
  const [, setMessage] = useState('Enter an employee id to load the shared-site policy.');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const checkInPulse = useRef(new Animated.Value(0)).current;

  const sharedMode = flowMode === 'shared';
  const loggedIn = selectedEmployee != null;
  const shiftEvents = useMemo(() => currentShiftEvents(events), [events]);
  const latestEvent = shiftEvents.at(-1) ?? null;
  const hasCheckedInToday = shiftEvents.some((event) => event.tipo === 'IN');
  const onBreak = latestEvent?.tipo === 'BREAK_START';
  const activeDay = hasCheckedInToday && latestEvent?.tipo !== 'OUT';
  const breakAction: TipoMarcaje = onBreak ? 'BREAK_END' : 'BREAK_START';
  const workedMs = useMemo(() => computeWorkedMs(shiftEvents, now), [shiftEvents, now]);
  const employeeFirstName = selectedEmployee?.name.split(' ')[0] ?? '';
  const canResolveAdmin = adminCode.length > 0 && !busy;
  const canResolveCode = employeeCode.length > 0 && !busy;
  const sharedCondition = !activeDay ? 'Pending check-in' : onBreak ? 'On break' : 'Working';
  const sharedConditionDetail = !activeDay
    ? 'Check in is available'
    : onBreak
      ? 'Check out or end break is available'
      : 'Check out or lunch break is available';
  const selectedPolicy = selectedEmployee?.policy ?? (sharedMode ? DIEGO_SHARED_SITE_POLICY : FELIPE_DEVICE_POLICY);
  const pulseHaloScale = checkInPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.2],
  });
  const pulseHaloOpacity = checkInPulse.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0.42, 0.16, 0],
  });
  const buttonPulseScale = checkInPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.035, 1],
  });
  const buttonPulseColor = checkInPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [C.primary, '#8d84ff', C.primaryDeep],
  });

  useEffect(() => {
    void loadLocalState();
  }, []);

  useEffect(() => {
    if (!MAESTRO_MODE) return undefined;

    const reset = () => {
      resetForMaestro();
    };
    const subscription = Linking.addEventListener('url', reset);
    void Linking.getInitialURL().then((url) => {
      if (url) reset();
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!activeDay) return undefined;

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [activeDay]);

  useEffect(() => {
    if (!loggedIn || activeDay) {
      checkInPulse.stopAnimation();
      checkInPulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(checkInPulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(checkInPulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [activeDay, checkInPulse, loggedIn]);

  async function loadLocalState() {
    if (MAESTRO_MODE) {
      await AsyncStorage.multiRemove([QUEUE_KEY, EVENTS_KEY, ...allEventKeys()]);
      setQueue([]);
      setEvents([]);
      return;
    }

    const queueRaw = await AsyncStorage.getItem(QUEUE_KEY);
    setQueue(queueRaw ? (JSON.parse(queueRaw) as QueueItem[]) : []);
  }

  function resetForMaestro() {
    setFlowMode(null);
    setAdminCode('');
    setAdminError('');
    setSharedAdminLoggedIn(false);
    setSharedNotice('');
    setSelectedEmployee(null);
    setEmployeeCode('');
    setCodeError('');
    void resetLocalDay('Choose a check-in mode.');
  }

  async function saveQueue(next: QueueItem[]) {
    setQueue(next);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }

  async function loadEventsForEmployee(employeeId: string) {
    const raw = await AsyncStorage.getItem(eventsKey(employeeId));
    const stored = raw ? (JSON.parse(raw) as StoredEvents) : null;
    setEvents(stored?.date === todayKey() ? stored.events : []);
  }

  async function saveEvents(next: CheckInEvent[], employeeId: string) {
    setEvents(next);
    await AsyncStorage.setItem(eventsKey(employeeId), JSON.stringify({ date: todayKey(), events: next }));
  }

  async function resetLocalDay(nextMessage = 'Ready to check in again.', clearQueue = true) {
    setCapture(initialCapture);
    setSteps(stepsForPolicy(selectedPolicy));
    if (clearQueue) setQueue([]);
    setEvents([]);
    setLastEvent(null);
    setMessage(nextMessage);
    setBusy(false);
    setNow(new Date());
    const eventKeys = selectedEmployee ? [eventsKey(selectedEmployee.id)] : allEventKeys();
    await AsyncStorage.multiRemove(clearQueue ? [QUEUE_KEY, EVENTS_KEY, ...eventKeys] : eventKeys);
  }

  async function startEmployeeMode() {
    setFlowMode('employee');
    setSharedAdminLoggedIn(false);
    setSharedNotice('');
    setAdminCode('');
    setAdminError('');
    setEmployeeCode('');
    setCodeError('');
    setSelectedEmployee(PERSONAL_EMPLOYEE);
    setSteps(stepsForPolicy(PERSONAL_EMPLOYEE.policy));
    setMessage(`Policy ${PERSONAL_EMPLOYEE.policy.label} identified for ${PERSONAL_EMPLOYEE.office}.`);
    await loadEventsForEmployee(PERSONAL_EMPLOYEE.id);
  }

  function startSharedMode() {
    setFlowMode('shared');
    setSharedAdminLoggedIn(false);
    setSharedNotice('');
    setAdminCode('');
    setAdminError('');
    setSelectedEmployee(null);
    setEmployeeCode('');
    setCodeError('');
    setEvents([]);
    setSteps(stepsForPolicy(DIEGO_SHARED_SITE_POLICY));
    setMessage('Enter the admin code for this shared site.');
  }

  function returnToModeSelection() {
    setFlowMode(null);
    setSharedAdminLoggedIn(false);
    setSharedNotice('');
    setAdminCode('');
    setAdminError('');
    setSelectedEmployee(null);
    setEmployeeCode('');
    setCodeError('');
    setEvents([]);
    setMessage('Choose a check-in mode.');
  }

  function updateStep(key: Step['key'], patch: Partial<Step>) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function resetValidation(action: TipoMarcaje) {
    setCapture(initialCapture);
    setSteps(stepsForPolicy(selectedPolicy));
    setMessage(`${actionCopy[action].label} requires ${selectedPolicy.label} validations.`);
  }

  function resolveAdminCode() {
    if (adminCode !== ADMIN_CODE) {
      setAdminError('Admin code not recognized.');
      return;
    }

    setSharedAdminLoggedIn(true);
    setAdminCode('');
    setAdminError('');
    setSharedNotice('Admin session ready.');
    setMessage('Enter the employee id for this punch.');
  }

  async function resolveEmployeeCode() {
    const employeeId = employeeCode.trim().toLowerCase();
    const nextEmployee = EMPLOYEES.find((employee) => employee.id === employeeId && employee.policy.scope === 'shared');

    if (!nextEmployee) {
      setCodeError('Employee not recognized.');
      setEvents([]);
      return;
    }

    setSelectedEmployee(nextEmployee);
    setCodeError('');
    setSharedNotice('');
    setSteps(stepsForPolicy(nextEmployee.policy));
    setMessage(`Policy ${nextEmployee.policy.label} identified for ${nextEmployee.office}.`);
    await loadEventsForEmployee(nextEmployee.id);
  }

  function clearSharedEmployeeSession(nextNotice: string) {
    setSelectedEmployee(null);
    setEmployeeCode('');
    setCodeError('');
    setEvents([]);
    setSharedNotice(nextNotice);
    setSteps(stepsForPolicy(DIEGO_SHARED_SITE_POLICY));
    setMessage('Enter the next employee id.');
  }

  async function verifyDeviceBiometric(): Promise<boolean | null> {
    updateStep('identity', { state: 'running', detail: 'Requesting device biometric' });
    if (MAESTRO_MODE) {
      updateStep('identity', { state: 'ok', detail: 'Maestro: device biometric simulated' });
      return true;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        updateStep('identity', { state: 'warn', detail: 'Device biometric is not available' });
        return null;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm your identity',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      updateStep('identity', {
        state: result.success ? 'ok' : 'warn',
        detail: result.success ? 'Device biometric confirmed' : 'Device biometric did not pass',
      });
      return result.success;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Device biometric unavailable';
      updateStep('identity', { state: 'warn', detail });
      return null;
    }
  }

  async function getLocation(): Promise<CheckInInput['ubicacion'] | null> {
    updateStep('location', { state: 'running', detail: 'Requesting precise location' });
    if (MAESTRO_MODE) {
      updateStep('location', {
        state: 'ok',
        detail: `${MAESTRO_LOCATION.lat.toFixed(5)}, ${MAESTRO_LOCATION.lng.toFixed(5)} - ${MAESTRO_LOCATION.accuracyM}m`,
      });
      return MAESTRO_LOCATION;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        updateStep('location', { state: 'warn', detail: 'Permission denied; submitting without GPS' });
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30_000, requiredAccuracy: 100 });
      const current =
        lastKnown ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }));

      const location = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        accuracyM: current.coords.accuracy ?? undefined,
      };
      const accuracy = location.accuracyM != null ? `${Math.round(location.accuracyM)}m` : 'no accuracy';
      updateStep('location', {
        state: 'ok',
        detail: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} - ${accuracy}`,
      });
      return location;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Could not read GPS';
      updateStep('location', { state: 'warn', detail: `${detail}; submitting without GPS` });
      return null;
    }
  }

  async function takePhoto(): Promise<string | null> {
    updateStep('photo', { state: 'running', detail: 'Opening front camera' });
    if (MAESTRO_MODE) {
      updateStep('photo', { state: 'ok', detail: 'Maestro: photo simulated' });
      return 'maestro://checkin-photo.jpg';
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        updateStep('photo', { state: 'warn', detail: 'Permission denied; submitting without photo' });
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
        quality: 0.45,
        base64: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        updateStep('photo', { state: 'warn', detail: 'Photo skipped; punch will be reviewable' });
        return null;
      }

      const photoRef = result.assets[0].uri;
      updateStep('photo', { state: 'ok', detail: 'Punch photo captured' });
      return photoRef;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Camera unavailable';
      updateStep('photo', { state: 'warn', detail: `${detail}; submitting without photo` });
      return null;
    }
  }

  async function verifySiteBeacon(): Promise<boolean> {
    updateStep('beacon', { state: 'running', detail: 'Checking shared-site Bluetooth beacon' });
    await new Promise((resolve) => setTimeout(resolve, MAESTRO_MODE ? 150 : 500));
    updateStep('beacon', { state: 'ok', detail: 'Shared-site beacon detected' });
    return true;
  }

  async function runPolicyValidations(policy: CheckInPolicy): Promise<CaptureState> {
    const biometricOk = policy.requiresBiometric ? await verifyDeviceBiometric() : null;
    const location = policy.requiresLocation ? await getLocation() : null;
    const photoRef = policy.requiresPhoto ? await takePhoto() : null;
    const beaconOk = policy.requiresBeacon ? await verifySiteBeacon() : null;
    const nextCapture: CaptureState = {
      biometricOk,
      photoRef,
      location,
      beaconOk,
    };
    setCapture(nextCapture);
    return nextCapture;
  }

  function buildInput(action: TipoMarcaje, nextCapture: CaptureState): CheckInInput {
    if (!selectedEmployee) {
      throw new Error('Employee id is required before check-in.');
    }

    return {
      eventId: nuevoEventId(),
      empleadoId: selectedEmployee.id,
      oficinaId: selectedEmployee.officeId,
      tipo: action,
      canal: 'MOVIL',
      nivelAplicado: selectedPolicy.level,
      ubicacion: nextCapture.location ?? undefined,
      identidad:
        nextCapture.biometricOk != null || nextCapture.photoRef
          ? {
              ...(nextCapture.biometricOk != null ? { facialOk: nextCapture.biometricOk } : {}),
              ...(nextCapture.photoRef ? { fotoRef: nextCapture.photoRef } : {}),
            }
          : undefined,
      clienteLocal: new Date().toISOString(),
      fuente: 'NORMAL',
    };
  }

  async function recordEvent(event: CheckInEvent): Promise<CheckInEvent[]> {
    setLastEvent(event);
    const nextEvents = [...events, event];
    await saveEvents(nextEvents, event.empleadoId);
    return nextEvents;
  }

  function finishSharedPunch(event: CheckInEvent) {
    const employeeName = selectedEmployee?.name ?? event.empleadoId;
    clearSharedEmployeeSession(`${employeeName}: ${actionCopy[event.tipo].success}`);
  }

  async function enqueue(input: CheckInInput, error: string) {
    const next = [...queue, { input, createdAt: new Date().toISOString(), lastError: error }];
    await saveQueue(next);
    updateStep('submit', { state: 'warn', detail: 'Offline/API unavailable; punch queued' });
    setMessage(`${actionCopy[input.tipo].label} saved offline. It will retry with the same eventId.`);

    const event = buildLocalEvent(input, [FLAGS.SIN_RED_ENCOLADO]);
    await recordEvent(event);
    if (sharedMode) {
      finishSharedPunch(event);
    }
  }

  async function submit(input: CheckInInput) {
    updateStep('submit', { state: 'running', detail: 'Sending canonical event' });
    if (MAESTRO_MODE) {
      const event = buildLocalEvent(input);
      await recordEvent(event);
      if (sharedMode) {
        finishSharedPunch(event);
        return;
      }
      const flags = event.flags.length ? ` Flags: ${event.flags.join(', ')}` : '';
      updateStep('submit', { state: event.flags.length ? 'warn' : 'ok', detail: `Stamped ${formatTime(event.timestamp.servidorUTC)}.${flags}` });
      setMessage(actionCopy[event.tipo].success);
      return;
    }

    const result = await postCheckIn(apiUrl, input);

    if (result.ok) {
      await recordEvent(result.event);
      if (sharedMode) {
        finishSharedPunch(result.event);
        return;
      }
      const flags = result.event.flags.length ? ` Flags: ${result.event.flags.join(', ')}` : '';
      updateStep('submit', {
        state: result.event.flags.length ? 'warn' : 'ok',
        detail: `Stamped ${formatTime(result.event.timestamp.servidorUTC)}.${flags}`,
      });
      setMessage(actionCopy[result.event.tipo].success);
      return;
    }

    if (isRetryableError(result.error, result.rechazado)) {
      await enqueue(input, result.error);
      return;
    }

    updateStep('submit', { state: 'error', detail: result.error });
    setMessage(`Could not register punch: ${result.error}`);
  }

  async function runPunch(action: TipoMarcaje) {
    if (busy || !selectedEmployee) return;
    setBusy(true);
    setNow(new Date());
    setLastEvent(null);
    resetValidation(action);
    setMessage(actionCopy[action].busy);

    try {
      const nextCapture = await runPolicyValidations(selectedPolicy);
      await submit(buildInput(action, nextCapture));
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected error';
      setMessage(detail);
      updateStep('submit', { state: 'error', detail });
    } finally {
      setBusy(false);
      setNow(new Date());
    }
  }

  let screen: ReactNode;

  if (!flowMode) {
    screen = (
      <View style={styles.loginScreen} testID="mode-screen" accessibilityLabel="Kaypi mode selection screen">
        <View style={styles.loginTop}>
          <View style={styles.logoPlate} testID="kaypi-logo" accessibilityLabel="Kaypi logo" accessible>
            <Image source={KAYPI_LOGO} resizeMode="contain" style={styles.logo} />
          </View>
          <Text style={styles.title}>Choose check-in mode</Text>
          <View style={styles.modeList}>
            <Pressable
              testID="employee-mode-button"
              accessibilityLabel="Employee mode"
              accessibilityRole="button"
              style={styles.modeButton}
              onPress={() => void startEmployeeMode()}
            >
              <Text style={styles.modeTitle}>Employee</Text>
              <Text style={styles.modeSubtitle}>Personal device with clock and break controls</Text>
            </Pressable>
            <Pressable
              testID="shared-site-mode-button"
              accessibilityLabel="Shared site mode"
              accessibilityRole="button"
              style={styles.modeButton}
              onPress={startSharedMode}
            >
              <Text style={styles.modeTitle}>Shared site</Text>
              <Text style={styles.modeSubtitle}>Admin station for multiple employee punches</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          testID="refresh-day-button"
          accessibilityLabel="Refresh day"
          accessibilityRole="button"
          style={styles.loginRefreshButton}
          onPress={() => void resetLocalDay('Ready.')}
        >
          <Text style={styles.refreshButtonText}>Refresh day</Text>
        </Pressable>
      </View>
    );
  } else if (sharedMode && !sharedAdminLoggedIn) {
    screen = (
      <View style={styles.loginScreen} testID="admin-login-screen" accessibilityLabel="Shared site admin login screen">
        <View style={styles.loginTop}>
          <View style={styles.logoPlate} testID="kaypi-logo" accessibilityLabel="Kaypi logo" accessible>
            <Image source={KAYPI_LOGO} resizeMode="contain" style={styles.logo} />
          </View>
          <Text style={styles.title}>Shared site</Text>
          <View style={styles.codePanel} testID="admin-code-panel" accessibilityLabel="Admin code panel">
            <View style={styles.policyBadge}>
              <Text style={styles.policyText}>ADMIN SITE</Text>
            </View>
            <Text style={styles.inputLabel}>Admin code</Text>
            <TextInput
              testID="admin-code-input"
              accessibilityLabel="Admin code"
              value={adminCode}
              onChangeText={(value) => {
                setAdminCode(value.replace(/\D/g, '').slice(0, 6));
                if (adminError) setAdminError('');
              }}
              onSubmitEditing={() => {
                if (canResolveAdmin) resolveAdminCode();
              }}
              keyboardType="number-pad"
              returnKeyType="done"
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              maxLength={6}
              placeholder="Enter admin code"
              placeholderTextColor={C.muted}
              style={styles.codeInput}
            />
            {adminError ? (
              <Text style={styles.codeError} testID="admin-code-error">
                {adminError}
              </Text>
            ) : null}
          </View>
          <Pressable
            testID="admin-login-button"
            accessibilityLabel="Continue with admin code"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canResolveAdmin }}
            style={[styles.primaryButton, !canResolveAdmin && styles.buttonDisabled]}
            onPress={resolveAdminCode}
            disabled={!canResolveAdmin}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
        <Pressable
          testID="change-mode-button"
          accessibilityLabel="Change mode"
          accessibilityRole="button"
          style={styles.loginRefreshButton}
          onPress={returnToModeSelection}
        >
          <Text style={styles.refreshButtonText}>Change mode</Text>
        </Pressable>
      </View>
    );
  } else if (sharedMode && !loggedIn) {
    screen = (
      <View style={styles.loginScreen} testID="shared-code-screen" accessibilityLabel="Shared site employee id screen">
        <View style={styles.loginTop}>
          <View style={styles.logoPlate} testID="kaypi-logo" accessibilityLabel="Kaypi logo" accessible>
            <Image source={KAYPI_LOGO} resizeMode="contain" style={styles.logo} />
          </View>
          <Text style={styles.title}>Employee punch</Text>
          {sharedNotice ? (
            <Text style={styles.sharedNotice} testID="shared-punch-confirmation">
              {sharedNotice}
            </Text>
          ) : null}
          <View style={styles.codePanel} testID="employee-code-panel" accessibilityLabel="Employee id panel">
            <View style={styles.policyBadge}>
              <Text style={styles.policyText}>SHARED SITE</Text>
            </View>
            <Text style={styles.inputLabel}>Employee id</Text>
            <TextInput
              testID="employee-code-input"
              accessibilityLabel="Employee id"
              value={employeeCode}
              onChangeText={(value) => {
                setEmployeeCode(value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32));
                if (codeError) setCodeError('');
              }}
              onSubmitEditing={() => {
                if (canResolveCode) void resolveEmployeeCode();
              }}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              maxLength={32}
              placeholder="emp_diego"
              placeholderTextColor={C.muted}
              style={styles.codeInput}
            />
            {codeError ? (
              <Text style={styles.codeError} testID="employee-code-error">
                {codeError}
              </Text>
            ) : null}
          </View>
          <Pressable
            testID="code-login-button"
            accessibilityLabel="Continue with employee id"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canResolveCode }}
            style={[styles.primaryButton, !canResolveCode && styles.buttonDisabled]}
            onPress={() => void resolveEmployeeCode()}
            disabled={!canResolveCode}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>

        <View style={styles.bottomStack}>
          <Pressable
            testID="refresh-day-button"
            accessibilityLabel="Refresh day"
            accessibilityRole="button"
            style={styles.loginRefreshButton}
            onPress={() => {
              setEmployeeCode('');
              setCodeError('');
              setSharedNotice('');
              void resetLocalDay();
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh day</Text>
          </Pressable>
          <Pressable
            testID="change-mode-button"
            accessibilityLabel="Change mode"
            accessibilityRole="button"
            style={styles.textButton}
            onPress={returnToModeSelection}
          >
            <Text style={styles.textButtonText}>Change mode</Text>
          </Pressable>
        </View>
      </View>
    );
  } else {
    screen = (
      <View
        style={[styles.cleanScreen, flowMode === 'employee' && activeDay && styles.cleanScreenWithBottomBar]}
        testID="checkin-screen"
        accessibilityLabel="Kaypi check-in screen"
      >
        {!activeDay ? (
          <View style={styles.checkInReady}>
            <Text
              style={styles.greetingText}
              testID="checkin-greeting"
              accessibilityLabel={`Hola ${employeeFirstName}`}
            >
              Hola, {employeeFirstName}
            </Text>
            {sharedMode ? (
              <View
                style={styles.recognitionPanel}
                testID="shared-recognition-panel"
                accessibilityLabel="Shared site recognition summary"
              >
                <Text style={styles.recognitionName} testID="recognized-employee">
                  {selectedEmployee?.name}
                </Text>
                <Text style={styles.recognitionMeta} testID="recognized-policy">
                  {selectedEmployee?.policy.label} / {selectedEmployee?.policy.level}
                </Text>
                <Text style={styles.recognitionCondition} testID="recognized-condition">
                  {sharedCondition}
                </Text>
                <Text style={styles.recognitionDetail}>{sharedConditionDetail}</Text>
              </View>
            ) : null}
            <View style={styles.pulseButtonWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseHalo,
                  { opacity: pulseHaloOpacity, transform: [{ scale: pulseHaloScale }] },
                ]}
              />
              <AnimatedPressable
                testID="checkin-button"
                accessibilityLabel="Check in"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                style={[
                  styles.checkInCircle,
                  { backgroundColor: buttonPulseColor, transform: [{ scale: buttonPulseScale }] },
                  busy && styles.buttonDisabled,
                ]}
                onPress={() => void runPunch('IN')}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={styles.checkInCircleText}>Check in</Text>}
              </AnimatedPressable>
            </View>
          </View>
        ) : sharedMode ? (
          <View style={styles.sharedActionPanel} testID="shared-action-panel" accessibilityLabel="Shared employee action panel">
            <View
              style={styles.recognitionPanel}
              testID="shared-recognition-panel"
              accessibilityLabel="Shared site recognition summary"
            >
              <Text style={styles.recognitionName} testID="recognized-employee">
                {selectedEmployee?.name}
              </Text>
              <Text style={styles.recognitionMeta} testID="recognized-policy">
                {selectedEmployee?.policy.label} / {selectedEmployee?.policy.level}
              </Text>
              <Text style={styles.recognitionCondition} testID="recognized-condition">
                {sharedCondition}
              </Text>
              <Text style={styles.recognitionDetail}>{sharedConditionDetail}</Text>
            </View>
            <View style={styles.sharedActionButtons} testID="bottom-actions" accessibilityLabel="Shared punch actions">
              <Pressable
                testID="checkout-button"
                accessibilityLabel="Check out"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                style={[styles.bottomButton, styles.checkoutButton, busy && styles.buttonDisabled]}
                onPress={() => void runPunch('OUT')}
                disabled={busy}
              >
                <Text style={styles.bottomButtonText}>Check out</Text>
              </Pressable>
              <Pressable
                testID="break-button"
                accessibilityLabel={actionCopy[breakAction].label}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                style={[styles.bottomButton, styles.breakButton, busy && styles.buttonDisabled]}
                onPress={() => void runPunch(breakAction)}
                disabled={busy}
              >
                <Text style={[styles.bottomButtonText, styles.breakButtonText]}>{actionCopy[breakAction].label}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.clockOnly} testID="work-clock-panel" accessibilityLabel="Work clock">
            <Text style={styles.clockState}>{onBreak ? 'On break' : 'Working'}</Text>
            <Text style={styles.clockValue} testID="work-clock">{formatDuration(workedMs)}</Text>
          </View>
        )}

        {busy ? (
          <View style={styles.validationSheet} testID="validation-steps" accessibilityLabel="Policy validation steps">
            {steps.map((step) => (
              <View key={step.key} style={styles.compactStep} testID={`step-${step.key}`}>
                <Text style={styles.compactStepLabel}>{step.label}</Text>
                <Text style={[styles.compactStepState, stepTextStyles[step.state]]}>
                  {statusLabel(step.state)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {flowMode === 'employee' && activeDay ? (
          <View style={styles.bottomBar} testID="bottom-actions" accessibilityLabel="Bottom check-in actions">
            <Pressable
              testID="checkout-button"
              accessibilityLabel="Check out"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={[styles.bottomButton, styles.checkoutButton, busy && styles.buttonDisabled]}
              onPress={() => void runPunch('OUT')}
              disabled={busy}
            >
              <Text style={styles.bottomButtonText}>Check out</Text>
            </Pressable>
            <Pressable
              testID="break-button"
              accessibilityLabel={actionCopy[breakAction].label}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={[styles.bottomButton, styles.breakButton, busy && styles.buttonDisabled]}
              onPress={() => void runPunch(breakAction)}
              disabled={busy}
            >
              <Text style={[styles.bottomButtonText, styles.breakButtonText]}>{actionCopy[breakAction].label}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="checkin-safe-area" accessibilityLabel="Kaypi check-in safe area">
      <StatusBar style="dark" />
      {screen}
    </SafeAreaView>
  );
}

const C = {
  bg: '#f8f8fa',
  fg: '#352c60',
  muted: '#7380b1',
  primary: '#7a6ff0',
  primaryDeep: '#665dc9',
  primarySoft: '#efeefd',
  primaryFg: '#ffffff',
  border: '#dedce4',
  card: '#ffffff',
  warning: '#f5a623',
  danger: '#ff4348',
  success: '#00e1c8',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loginScreen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 26,
  },
  loginTop: { gap: 16 },
  modeList: { gap: 12 },
  modeButton: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.card,
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  modeTitle: { color: C.fg, fontSize: 22, fontWeight: '800' },
  modeSubtitle: { color: C.muted, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  logoPlate: {
    alignSelf: 'flex-start',
    width: 154,
    height: 64,
    borderRadius: 8,
    backgroundColor: C.card,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  title: { color: C.fg, fontSize: 30, fontWeight: '800', lineHeight: 34 },
  codePanel: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  inputLabel: { color: C.fg, fontSize: 15, fontWeight: '800' },
  codeInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    color: C.fg,
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  codeError: { color: C.danger, fontSize: 13, fontWeight: '700' },
  sharedNotice: {
    color: C.fg,
    backgroundColor: C.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  policyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  policyText: { color: C.primary, fontSize: 11, fontWeight: '800' },
  primaryButton: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: C.primaryFg, fontSize: 16, fontWeight: '800' },
  loginRefreshButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  refreshButtonText: { color: C.fg, fontSize: 14, fontWeight: '800' },
  bottomStack: { gap: 10 },
  textButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  textButtonText: { color: C.primary, fontSize: 14, fontWeight: '800' },
  cleanScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cleanScreenWithBottomBar: { paddingBottom: 110 },
  pulseButtonWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    width: 198,
    height: 198,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  checkInCircle: {
    width: 184,
    height: 184,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  checkInReady: { alignItems: 'center', gap: 22 },
  greetingText: { color: C.fg, fontSize: 28, fontWeight: '800', lineHeight: 32 },
  checkInCircleText: { color: C.primaryFg, fontSize: 24, fontWeight: '800' },
  clockOnly: { alignItems: 'center', gap: 8 },
  clockState: { color: C.muted, fontSize: 16, fontWeight: '700' },
  clockValue: { color: C.fg, fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 58 },
  recognitionPanel: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.card,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  recognitionName: { color: C.fg, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  recognitionMeta: { color: C.primary, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  recognitionCondition: { color: C.fg, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  recognitionDetail: { color: C.muted, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  sharedActionPanel: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 18 },
  sharedActionButtons: { width: '100%', gap: 10 },
  validationSheet: {
    width: '100%',
    maxWidth: 320,
    marginTop: 28,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.card,
    padding: 12,
    gap: 8,
  },
  compactStep: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  compactStepLabel: { color: C.fg, fontSize: 13, fontWeight: '700' },
  compactStepState: { fontSize: 12, fontWeight: '800' },
  stepText_idle: { color: C.muted },
  stepText_running: { color: C.primary },
  stepText_ok: { color: C.success },
  stepText_warn: { color: C.warning },
  stepText_error: { color: C.danger },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    gap: 10,
  },
  bottomButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  checkoutButton: { backgroundColor: C.fg },
  breakButton: { backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primary },
  bottomButtonText: { color: C.primaryFg, fontSize: 15, fontWeight: '800' },
  breakButtonText: { color: C.primary },
});

const stepTextStyles: Record<StepState, { color: string }> = {
  idle: styles.stepText_idle,
  running: styles.stepText_running,
  ok: styles.stepText_ok,
  warn: styles.stepText_warn,
  error: styles.stepText_error,
};
