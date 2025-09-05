import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { generateQRCodeForAppointment, scanQRCode, generateParticipantQRCode, scanParticipantQRCode, manualStartSession, getSessionAttendanceDetails } from '../services/appointmentService';
import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Simple util to pretty print JSON
const J = (o: any) => <Text style={styles.json}>{JSON.stringify(o, null, 2)}</Text>;

export default function TestNewFeaturesScreen() {
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [coachId, setCoachId] = useState<string>('');
  const [clientUserId, setClientUserId] = useState<string>('');
  const [participantToken, setParticipantToken] = useState<string>('');
  const [appointmentToken, setAppointmentToken] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [attendanceDetails, setAttendanceDetails] = useState<any>(null);

  const log = (label: string, data?: any) => {
    setLogs(l => [{ ts: new Date().toISOString(), label, data }, ...l]);
  };

  const withTry = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { log('ERREUR', e?.message || e); }
  };

  const loadAppointment = async () => withTry(async () => {
    if (!appointmentId) return;
    const snap = await getDoc(doc(firestore, 'appointments', appointmentId));
    log('APPOINTMENT_DOC', snap.exists() ? snap.data() : 'NOT_FOUND');
  });

  const genParticipantQR = async () => withTry(async () => {
    if (!appointmentId || !clientUserId) return;
    const res = await generateParticipantQRCode(appointmentId, clientUserId);
    log('GEN_PARTICIPANT_QR', res);
    if (res.success && res.token) setParticipantToken(res.token);
  });

  const scanParticipant = async () => withTry(async () => {
    if (!participantToken || !coachId) return;
    const res = await scanParticipantQRCode(participantToken, coachId);
    log('SCAN_PARTICIPANT_QR', res);
  });

  const genAppointmentQR = async () => withTry(async () => {
    if (!appointmentId) return;
    const token = await generateQRCodeForAppointment(appointmentId);
    log('GEN_APPOINTMENT_QR', { token });
    setAppointmentToken(token);
  });

  const scanAppointmentQR = async () => withTry(async () => {
    if (!appointmentToken || !coachId) return;
    const res = await scanQRCode(appointmentToken, coachId);
    log('SCAN_APPOINTMENT_QR', res);
  });

  const doManualStart = async () => withTry(async () => {
    if (!appointmentId || !coachId) return;
    const res = await manualStartSession(appointmentId, coachId);
    log('MANUAL_START', res);
  });

  const loadAttendance = async () => withTry(async () => {
    if (!appointmentId) return;
    const res = await getSessionAttendanceDetails(appointmentId);
    setAttendanceDetails(res);
    log('ATTENDANCE_DETAILS', res);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Test Nouvelles Fonctionnalités</Text>
      <Text style={styles.subtitle}>Entrées</Text>
      <View style={styles.row}><Text style={styles.label}>AppointmentId:</Text><Input value={appointmentId} onChange={setAppointmentId} /></View>
      <View style={styles.row}><Text style={styles.label}>Coach UserId:</Text><Input value={coachId} onChange={setCoachId} /></View>
      <View style={styles.row}><Text style={styles.label}>Client UserId:</Text><Input value={clientUserId} onChange={setClientUserId} /></View>

      <Text style={styles.subtitle}>Actions Participant</Text>
      <Btn label="Générer QR Participant" onPress={genParticipantQR} />
      <Btn label="Scanner QR Participant" onPress={scanParticipant} />

      <Text style={styles.subtitle}>Actions Séance</Text>
      <Btn label="Générer QR Séance" onPress={genAppointmentQR} />
      <Btn label="Scanner QR Séance" onPress={scanAppointmentQR} />
      <Btn label="Démarrage Manuel" onPress={doManualStart} />
      <Btn label="Charger Attendance" onPress={loadAttendance} />
      <Btn label="Charger Doc RDV" onPress={loadAppointment} />

      <Text style={styles.subtitle}>Tokens</Text>
      <Text style={styles.token}>Participant: {participantToken || '—'}</Text>
      <Text style={styles.token}>Séance: {appointmentToken || '—'}</Text>

      <Text style={styles.subtitle}>Attendance Details</Text>
      {attendanceDetails ? (
        <View style={styles.box}>
          {J(attendanceDetails)}
        </View>
      ) : <Text style={styles.placeholder}>Aucun détail chargé</Text>}

      <Text style={styles.subtitle}>Logs (dernier en haut)</Text>
      {logs.slice(0,50).map((l, i) => (
        <View key={i} style={styles.logLine}>
          <Text style={styles.logTs}>{l.ts}</Text>
          <Text style={styles.logLabel}>{l.label}</Text>
          <Text style={styles.logData}>{typeof l.data === 'object' ? JSON.stringify(l.data) : String(l.data)}</Text>
        </View>
      ))}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const Input = ({ value, onChange }: { value: string; onChange: (v: string)=>void }) => {
  return (
    <TouchableOpacity style={styles.input} onPress={() => {
      const v = prompt('Nouvelle valeur', value) || '';
      onChange(v);
    }}>
      <Text style={styles.inputText}>{value || 'tap pour entrer'}</Text>
    </TouchableOpacity>
  );
};

const Btn = ({ label, onPress }: { label: string; onPress: ()=>void }) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    <Text style={styles.btnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#4dabf7', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { width: 120, color: '#ccc', fontSize: 13 },
  input: { flex: 1, backgroundColor: '#222', padding: 10, borderRadius: 6 },
  inputText: { color: '#bbb', fontSize: 13 },
  btn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, marginVertical: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  token: { color: '#ddd', fontSize: 12 },
  box: { backgroundColor: '#1e1e1e', padding: 10, borderRadius: 6 },
  placeholder: { color: '#555', fontStyle: 'italic' },
  json: { color: '#9ae6b4', fontSize: 11, fontFamily: 'monospace' },
  logLine: { marginBottom: 6, backgroundColor: '#1a1a1a', padding: 8, borderRadius: 4 },
  logTs: { color: '#666', fontSize: 10 },
  logLabel: { color: '#fff', fontWeight: '600', fontSize: 12 },
  logData: { color: '#bbb', fontSize: 11 },
});
