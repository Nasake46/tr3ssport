import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../firebase';
import { getPastSessionsForCoach } from '../services/appointmentService';

interface PastSessionItem {
  id: string;
  date?: Date;
  description?: string;
  sessionType?: string;
  presentCount?: number;
  absentCount?: number;
  totalClients?: number;
  duration?: number;
}

export default function PastSessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PastSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setError('Utilisateur non connecté'); setLoading(false); return; }
    setError(null);
    try {
      const data = await getPastSessionsForCoach(user.uid);
      setSessions(data as any);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: PastSessionItem }) => {
    const d = item.date ? new Date(item.date) : undefined;
    const present = item.presentCount ?? 0;
    const absent = item.absentCount ?? 0;
    const total = item.totalClients ?? (present + absent);
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId: item.id } } as any)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.sessionType || item.description || 'Séance'}</Text>
          <Text style={styles.date}>{d ? d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0,5) : ''}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.badgePresent}>{present} présents</Text>
          <Text style={styles.badgeAbsent}>{absent} absents</Text>
          <Text style={styles.badgeTotal}>{total} inscrits</Text>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#7667ac" /><Text style={styles.loadingText}>Chargement...</Text></View>;
  }
  if (error) {
    return <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Réessayer</Text></TouchableOpacity></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Séances passées</Text>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.empty}>Aucune séance passée.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F8', padding: 16 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#7667ac', marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  loadingText: { marginTop: 8, color: '#444' },
  error: { color: '#e74c3c', marginBottom: 12, fontSize: 16 },
  retry: { color: '#7667ac', fontWeight: '600' },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1, paddingRight: 8 },
  date: { fontSize: 12, color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badgePresent: { backgroundColor: '#e6f9ef', color: '#1e8e3e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12 },
  badgeAbsent: { backgroundColor: '#fdecea', color: '#d93025', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12 },
  badgeTotal: { backgroundColor: '#eee', color: '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12 },
  pct: { marginLeft: 'auto', fontSize: 14, fontWeight: '700', color: '#7667ac' },
});
