import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getSessionAttendanceDetails } from '../../services/appointmentService';

interface ClientRow { id: string; name?: string; email?: string; attendanceStatus?: string; qrScannedAt?: Date; attendanceOrder?: number; }

export default function SessionAttendanceDetailsScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [meta, setMeta] = useState<{ present?: number; absent?: number; total?: number; date?: Date } | null>(null);

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

  const renderItem = ({ item }: { item: ClientRow }) => {
    const status = item.attendanceStatus || 'absent';
    const statusStyle = status === 'present' ? styles.present : styles.absent;
    return (
      <View style={styles.clientRow}>
        <Text style={styles.order}>{item.attendanceOrder && item.attendanceStatus === 'present' ? `#${item.attendanceOrder}` : ''}</Text>
        <Text style={styles.clientName}>{item.name || item.email || 'Client'}</Text>
        <Text style={[styles.status, statusStyle]}>{status}</Text>
        <Text style={styles.time}>{item.qrScannedAt ? new Date(item.qrScannedAt).toLocaleTimeString().slice(0,5) : '-'}</Text>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7667ac" /><Text style={styles.loading}>Chargement...</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Réessayer</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assiduité séance</Text>
      <Text style={styles.subtitle}>{meta?.date ? new Date(meta.date).toLocaleString() : ''}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryPresent}>{meta?.present} présents</Text>
        <Text style={styles.summaryAbsent}>{meta?.absent} absents</Text>
        <Text style={styles.summaryTotal}>{meta?.total} inscrits</Text>
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
  time: { width:50, textAlign:'right', fontSize:12, color:'#555' },
  sep: { height:1, backgroundColor:'#ddd' },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  loading: { marginTop:8, color:'#555' },
  error: { color:'#d93025', marginBottom:12 },
  retry: { color:'#7667ac', fontWeight:'600' },
  empty: { textAlign:'center', color:'#666', marginTop:40 },
});
