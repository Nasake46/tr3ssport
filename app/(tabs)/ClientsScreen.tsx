import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '@/firebase';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
// ajuste ce chemin si besoin
import PerformanceTestForm from '../../components/performance/PerformanceTestForm';

const COLORS = { oxford: '#121631', bone: '#E1DDCC' };

type UserRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: string;
  email?: string;
  phone?: string;
  data: Record<string, any>;
};

type PerfTest = {
  id: string;
  family: string;
  testName: string;
  unitType?: string;
  unitLabel?: string;
  valueNumber?: number;
  valueText?: string;
  testDate?: any;
};

export default function ClientsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // tests per user
  const [testsByUser, setTestsByUser] = useState<Record<string, PerfTest[]>>({});
  const [testsLoading, setTestsLoading] = useState<Record<string, boolean>>({});

  // create test modal
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [appointmentId, setAppointmentId] = useState('');
  const coachUidRef = useRef<string | null>(auth.currentUser?.uid ?? null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const base = collection(firestore, 'users');
      const qUsers = query(base, orderBy('firstName'));
      const snap = await getDocs(qUsers);
      const rows: UserRow[] = snap.docs.map(d => {
        const u = d.data() as any;
        const firstName = u.firstName || '';
        const lastName = u.lastName || '';
        return {
          id: d.id,
          firstName,
          lastName,
          displayName: u.displayName || `${firstName} ${lastName}`.trim() || 'Utilisateur',
          role: (u.role || '').toString(),
          email: u.email || u.mail || '',
          phone: u.phone || u.phoneNumber || '',
          data: u,
        };
      });
      rows.sort((a,b)=>`${a.lastName||''}${a.firstName||''}`.localeCompare(`${b.lastName||''}${b.firstName||''}`));
      setUsers(rows);
    } catch (e) {
      console.error('loadUsers error', e);
      Alert.alert('Erreur', "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      `${u.firstName||''} ${u.lastName||''}`.toLowerCase().includes(s) ||
      (u.displayName||'').toLowerCase().includes(s) ||
      (u.email||'').toLowerCase().includes(s) ||
      (u.phone||'').toLowerCase().includes(s) ||
      (u.role||'').toLowerCase().includes(s)
    );
  }, [users, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await loadUsers(); } finally { setRefreshing(false); }
  };

  const formatVal = (v: any) => {
    try {
      if (v && typeof v === 'object' && typeof v.toDate === 'function') {
        return v.toDate().toLocaleString();
      }
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  const openCreate = (u: UserRow) => {
    setSelectedUser(u);
    setAppointmentId('');
    setCreateOpen(true);
  };

  const handleSubmitTest = async (input: any) => {
    try {
      const docData = {
        ...input,
        testDate: input.testDate instanceof Date ? Timestamp.fromDate(input.testDate) : input.testDate,
        createdAt: serverTimestamp(),
        createdBy: coachUidRef.current,
      };
      await addDoc(collection(firestore, 'performanceTests'), docData);
      setCreateOpen(false);
      if (selectedUser) await loadUserTests(selectedUser.id);
    } catch (e) {
      console.error('create test error', e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le test.');
    }
  };

  const loadUserTests = async (userId: string) => {
    setTestsLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const base = collection(firestore, 'performanceTests');
      const qT = query(base, where('userId', '==', userId), orderBy('testDate', 'desc'));
      const snap = await getDocs(qT);
      const rows: PerfTest[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setTestsByUser(prev => ({ ...prev, [userId]: rows }));
    } catch (e) {
      console.warn('loadUserTests', e);
    } finally {
      setTestsLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleExpand = (u: UserRow) => {
    const next = !expanded[u.id];
    setExpanded(prev => ({ ...prev, [u.id]: next }));
    if (next && !testsByUser[u.id]) {
      loadUserTests(u.id);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tous les utilisateurs</Text>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: '#17a2b8' }]} onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#7667ac" />
          <TextInput
            placeholder="Rechercher nom, email, téléphone, rôle…"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: '#666' }}>Chargement…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.alertBox}><Text style={styles.alertText}>Aucun utilisateur.</Text></View>
        ) : (
          <View style={{ gap: 12, marginTop: 8 }}>
            {filtered.map(u => {
              const initials = `${(u.firstName||'U').charAt(0)}${(u.lastName||'').charAt(0)}`.toUpperCase();
              const isOpen = !!expanded[u.id];
              const uTests = testsByUser[u.id] || [];
              const testsBusy = !!testsLoading[u.id];
              return (
                <View key={u.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{u.displayName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {!!u.role && <View style={styles.rolePill}><Text style={styles.rolePillText}>{u.role}</Text></View>}
                        {!!u.email && <Text style={styles.sub}>{u.email}</Text>}
                      </View>
                      {!!u.phone && <Text style={styles.sub}>{u.phone}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => openCreate(u)}>
                        <View style={[styles.iconCircle, { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0E6B5A' }]}>
                          <Ionicons name="add" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleExpand(u)}>
                        <View style={[styles.iconCircle, { width: 38, height: 38, borderRadius: 19 }]}>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isOpen && (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailTitle}>Détails</Text>
                      {Object.keys(u.data).sort().map(k => (
                        <View key={k} style={styles.kvRow}>
                          <Text style={styles.kvKey}>{k}</Text>
                          <Text style={styles.kvVal}>{formatVal(u.data[k])}</Text>
                        </View>
                      ))}

                      <Text style={[styles.detailTitle, { marginTop: 12 }]}>Tests récents</Text>
                      {testsBusy ? (
                        <ActivityIndicator />
                      ) : uTests.length === 0 ? (
                        <Text style={{ color: '#666' }}>Aucun test.</Text>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {uTests.slice(0, 5).map(t => (
                            <View key={t.id} style={styles.testRow}>
                              <Text style={styles.testName}>{t.testName}</Text>
                              <Text style={styles.testMeta}>
                                {t.family} · {t.unitLabel || t.unitType || ''} · {(() => {
                                  try {
                                    const d = (t.testDate && typeof t.testDate.toDate === 'function') ? t.testDate.toDate() : null;
                                    return d ? d.toLocaleDateString() : '';
                                  } catch { return ''; }
                                })()}
                              </Text>
                              <Text style={styles.testVal}>
                                {typeof t.valueNumber === 'number' ? `${t.valueNumber}` : ''}
                                {t.valueText ? (typeof t.valueNumber === 'number' ? ` | ${t.valueText}` : t.valueText) : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Create Test Modal */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.oxford }}>Nouveau test</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.oxford} />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <>
                <Text style={{ color: '#666', marginBottom: 6 }}>Pour {selectedUser.displayName}</Text>
                <Text style={styles.label}>ID de rendez-vous (optionnel)</Text>
                <TextInput
                  value={appointmentId}
                  onChangeText={setAppointmentId}
                  placeholder="appointmentId"
                  style={styles.input}
                />
                <PerformanceTestForm
                  appointmentId={appointmentId || 'manual'}
                  userId={selectedUser.id}
                  coachId={coachUidRef.current || ''}
                  onSubmit={handleSubmitTest}
                />
              </>
            )}
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.oxford },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.oxford },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.oxford },
  alertBox: { backgroundColor: 'white', borderRadius: 10, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 1, marginTop: 12 },
  alertText: { textAlign: 'center', color: '#667085' },
  card: { backgroundColor: '#F0F0F5', borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  avatarText: { color: '#7667ac', fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.oxford },
  sub: { fontSize: 12, color: '#666' },
  rolePill: { backgroundColor: COLORS.oxford, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rolePillText: { color: '#fff', fontSize: 11 },
  detailBox: { marginTop: 10, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  detailTitle: { fontSize: 14, fontWeight: '700', color: COLORS.oxford, marginBottom: 6 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  kvKey: { width: 120, color: '#7667ac', fontWeight: '600', fontSize: 12 },
  kvVal: { flex: 1, color: '#333', fontSize: 12 },
  testRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  testName: { fontWeight: '700', color: COLORS.oxford },
  testMeta: { fontSize: 12, color: '#777' },
  testVal: { fontSize: 12, color: '#333' },
  label: { fontSize: 14, color: '#444', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 },
});