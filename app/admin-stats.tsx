import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { firestore } from '@/firebase';

type WeekBucket = { label: string; start: Date; end: Date; count: number };

const getMonthRange = (base = new Date()) => {
  const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getWeekBucketsForMonth = (base = new Date()): WeekBucket[] => {
  const { start, end } = getMonthRange(base);
  // Construire des semaines Lundi->Dimanche couvrant tout le mois
  const buckets: WeekBucket[] = [];
  const cursor = new Date(start);
  // Aller au lundi précédent (ou jour même si lundi)
  const day = cursor.getDay(); // 0=Dimanche ... 1=Lundi
  const deltaToMonday = (day === 0 ? -6 : 1 - day);
  cursor.setDate(cursor.getDate() + deltaToMonday);

  let idx = 1;
  while (cursor <= end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    // tronquer aux bornes du mois
    const bucketStart = new Date(Math.max(weekStart.getTime(), start.getTime()));
    const bucketEnd = new Date(Math.min(weekEnd.getTime(), end.getTime()));
    const label = `${bucketStart.getDate()}-${bucketEnd.getDate()}`;
    buckets.push({ label, start: bucketStart, end: bucketEnd, count: 0 });
    idx += 1;
    cursor.setDate(cursor.getDate() + 7);
  }
  return buckets;
};

export default function AdminStatsScreen() {
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<WeekBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  const monthRange = useMemo(() => getMonthRange(baseDate), [baseDate]);
  const weekBuckets = useMemo(() => getWeekBucketsForMonth(baseDate), [baseDate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(firestore, 'appointments'),
          where('date', '>=', Timestamp.fromDate(monthRange.start)),
          where('date', '<=', Timestamp.fromDate(monthRange.end)),
          orderBy('date', 'asc')
        );
        const snap = await getDocs(q);
        // copier buckets
        const next = weekBuckets.map(b => ({ ...b }));
        snap.forEach(docSnap => {
          const data: any = docSnap.data();
          const d = data?.date?.toDate ? data.date.toDate() : (data?.date ? new Date(data.date) : null);
          if (!d) return;
          // Option: exclure annulés
          if ((data?.status || '').toLowerCase() === 'cancelled') return;
          for (const b of next) {
            if (d >= b.start && d <= b.end) { b.count += 1; break; }
          }
        });
        setBuckets(next);
      } catch (e: any) {
        console.error('Erreur chargement stats:', e);
        setError(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [baseDate]);

  const total = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);
  const max = useMemo(() => buckets.reduce((m, b) => Math.max(m, b.count), 0), [buckets]);
  const chartHeight = 160;
  const chartWidth = Dimensions.get('window').width - 40; // padding

  const monthLabel = useMemo(
    () => baseDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    [baseDate]
  );

  const goPrevMonth = () => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() - 1);
    setBaseDate(d);
  };

  const goNextMonth = () => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + 1);
    setBaseDate(d);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Statistiques système', headerBackTitle: 'Retour' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#007AFF" />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cours par semaine</Text>
        </View>

        <View style={styles.monthNavRow}>
          <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthLabel}</Text>
          <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total ce mois: {total}</Text>
            <View style={[styles.chartArea, { height: chartHeight, width: chartWidth }]}>
              {buckets.map((b, idx) => {
                const h = max > 0 ? Math.round((b.count / max) * (chartHeight - 24)) : 0;
                return (
                  <View key={b.label} style={styles.barContainer}>
                    <View style={[styles.bar, { height: h }]} />
                    <Text style={styles.barLabel}>{b.label}</Text>
                    <Text style={styles.barValue}>{b.count}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.legend}>Exclut les cours annulés</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingRight: 8 },
  backText: { color: '#007AFF', fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#333', marginLeft: 8 },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  monthText: { fontSize: 16, fontWeight: '600', color: '#333', textTransform: 'capitalize' },
  loadingBox: { backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  errorText: { color: '#d32f2f', padding: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#333' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4, alignSelf: 'center' },
  barContainer: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: 24, backgroundColor: '#007AFF', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontSize: 12, color: '#555', marginTop: 4 },
  barValue: { fontSize: 10, color: '#333' },
  legend: { marginTop: 8, fontSize: 12, color: '#666' },
});
