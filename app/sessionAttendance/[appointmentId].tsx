import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { subscribeToAttendanceProgress, getSessionAttendanceDetails, manualStartSession } from '../../services/appointmentService';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';
import { auth } from '@/firebase';

interface ClientRow { id: string; name?: string; email?: string; attendanceStatus?: string; qrScannedAt?: Date; attendanceOrder?: number; }

export default function SessionAttendanceDetailsScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [meta, setMeta] = useState<{ present?: number; absent?: number; total?: number; date?: Date } | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);
  const coachId = auth.currentUser?.uid || '';
  const [showScanner, setShowScanner] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) { setError('ID manquant'); setLoading(false); return; }
    setError(null);
    try {
      const res = await getSessionAttendanceDetails(appointmentId as string);
      setClients(res.clients as any);
      setMeta({ present: res.present, absent: res.absent, total: res.total, date: res.appointment?.date });
    } catch {
      setError('Erreur de chargement');
    } finally { setLoading(false); }
  }, [appointmentId]);

  useEffect(() => { load(); }, [load]);

  // Abonnement temps réel aux présences
  useEffect(() => {
    if (!appointmentId) return;
    // cleanup précédent
    if (unsubRef.current) { try { unsubRef.current(); } catch {} }
    unsubRef.current = subscribeToAttendanceProgress(appointmentId as string, (data:any) => {
      setMeta(m => ({ ...m, present: data.present, total: data.total, absent: data.absent }));
      const rows: ClientRow[] = (data.clients || []).map((c:any) => ({ id: c.id, name: c.name, email: c.email, attendanceStatus: c.attendanceStatus, attendanceOrder: c.attendanceOrder }));
      setClients(rows);
    });
    return () => { if (unsubRef.current) { try { unsubRef.current(); } catch {} } };
  }, [appointmentId]);

  const handleManualStart = async () => {
    if (!appointmentId || !coachId) return;
    try {
      const res = await manualStartSession(appointmentId as string, coachId);
      if (!res.success) setError(res.message || 'Démarrage impossible');
    } catch { setError('Démarrage impossible'); }
  };

  const handleRescan = () => {
    // Ouvrir le scanner directement en mode scanOnly
    setShowScanner(true);
  };

  const renderItem = ({ item }: { item: ClientRow }) => {
    const raw = (item.attendanceStatus as 'present'|'absent'|'pending'|undefined) || 'pending';
    const statusStyle = raw === 'present' ? styles.present : raw === 'absent' ? styles.absent : styles.pending;
    const statusLabel = raw === 'present' ? 'Présent' : raw === 'absent' ? 'Absent' : 'En attente';
    return (
      <View style={styles.clientRow}>
        <Text style={styles.order}>{item.attendanceOrder && item.attendanceStatus === 'present' ? `#${item.attendanceOrder}` : ''}</Text>
        <Text style={styles.clientName}>{item.name || item.email || 'Client'}</Text>
        <Text style={[styles.status, statusStyle]}>{statusLabel}</Text>
        <Text style={styles.time}>{item.qrScannedAt ? new Date(item.qrScannedAt).toLocaleTimeString().slice(0,5) : '-'}</Text>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7667ac" /><Text style={styles.loading}>Chargement...</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Réessayer</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <Modal visible={showScanner} animationType="none" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <QRCodeScannerOptimized
            coachId={coachId}
            mode="scanOnly"
            autoOpenCamera
            onClose={() => setShowScanner(false)}
            onParticipantScanned={(res: any) => {
              if (res?.appointmentId) {
                setShowScanner(false);
              }
            }}
            onSessionStarted={() => {
              setShowScanner(false);
            }}
          />
        </View>
      </Modal>
      <Text style={styles.title}>Assiduité séance</Text>
      <Text style={styles.subtitle}>{meta?.date ? new Date(meta.date).toLocaleString() : ''}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryPresent}>{meta?.present} présents</Text>
        <Text style={styles.summaryAbsent}>{meta?.absent} absents</Text>
        <Text style={styles.summaryTotal}>{meta?.total} inscrits</Text>
      </View>
      <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
        <TouchableOpacity onPress={handleManualStart} style={{ backgroundColor:'#7667ac', paddingHorizontal:12, paddingVertical:8, borderRadius:6 }}>
          <Text style={{ color:'#fff', fontWeight:'700' }}>Démarrer la séance</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRescan} style={{ backgroundColor:'#007AFF', paddingHorizontal:12, paddingVertical:8, borderRadius:6 }}>
          <Text style={{ color:'#fff', fontWeight:'700' }}>Scanner des QR</Text>
        </TouchableOpacity>
      </View>
      <FlatList data={[...clients].sort((a,b)=>((a.name||a.email||'').localeCompare(b.name||b.email||'', 'fr', {sensitivity:'base'})))} keyExtractor={i => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={styles.sep} />} ListEmptyComponent={<Text style={styles.empty}>Aucun client</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: '#F5F5F8', padding:16 },
  title: { fontSize:22, fontWeight:'700', color:'#7667ac', marginBottom:4 },
  subtitle: { fontSize:12, color:'#666', marginBottom:12 },
  summaryRow: { flexDirection:'row', gap:12, marginBottom:12, flexWrap:'wrap' },
  summaryPresent: { backgroundColor:'#e6f9ef', color:'#1e8e3e', paddingHorizontal:10, paddingVertical:6, borderRadius:8, fontSize:12 },
  summaryAbsent: { backgroundColor:'#fdecea', color:'#d93025', paddingHorizontal:10, paddingVertical:6, borderRadius:8, fontSize:12 },
  summaryTotal: { backgroundColor:'#eee', color:'#555', paddingHorizontal:10, paddingVertical:6, borderRadius:8, fontSize:12 },
  clientRow: { flexDirection:'row', alignItems:'center', paddingVertical:10 },
  order: { width:34, fontSize:12, color:'#7667ac', fontWeight:'600' },
  clientName: { flex:1, fontSize:14, color:'#333' },
  status: { textTransform:'capitalize', fontSize:12, fontWeight:'600', paddingHorizontal:8, paddingVertical:4, borderRadius:6, overflow:'hidden' },
  present: { backgroundColor:'#1e8e3e22', color:'#1e8e3e' },
  absent: { backgroundColor:'#d9302522', color:'#d93025' },
  pending: { backgroundColor:'#f59e0b22', color:'#b45309' },
  time: { width:50, textAlign:'right', fontSize:12, color:'#555' },
  sep: { height:1, backgroundColor:'#ddd' },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  loading: { marginTop:8, color:'#555' },
  error: { color:'#d93025', marginBottom:12 },
  retry: { color:'#7667ac', fontWeight:'600' },
  empty: { textAlign:'center', color:'#666', marginTop:40 },
});
