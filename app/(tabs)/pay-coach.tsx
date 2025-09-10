import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '@/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

// --- Styles shared with CoachHome look & feel ---
const COLORS = {
  oxford: '#121631',
  bone: '#E1DDCC',
};

// Optional: read from env, fallback to local dev
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.124:4242';

// Types
interface Coach {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  hourlyRate?: number;
}

export default function PayCoachScreen() {
  const router = useRouter();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const selectedCoach = useMemo(
    () => coaches.find(c => c.id === selectedCoachId) || null,
    [coaches, selectedCoachId]
  );

  // Load the real coach list from Firestore: users where role == 'coach'
  const loadCoaches = async () => {
    setListLoading(true);
    try {
      const base = collection(firestore, 'users');
      // Keep it simple to avoid composite indexes: order by firstName
      const q = query(base, where('role', '==', 'coach'), orderBy('firstName'));
      const snap = await getDocs(q);
      const rows: Coach[] = snap.docs.map(d => {
        const data = d.data() as any;
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const displayName = data.displayName || `${firstName} ${lastName}`.trim() || 'Coach';
        return {
          id: d.id,
          firstName,
          lastName,
          displayName,
          avatarUrl: data.avatarUrl || '',
          hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined,
        } as Coach;
      });

      // Fallback sort by lastName then firstName (client-side)
      rows.sort((a, b) => `${a.lastName||''}${a.firstName||''}`.localeCompare(`${b.lastName||''}${b.firstName||''}`));

      setCoaches(rows);
      setSelectedCoachId(rows[0]?.id ?? null);
    } catch (e) {
      console.error('loadCoaches error', e);
      Alert.alert('Erreur', "Impossible de charger la liste des coachs.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadCoaches(); }, []);

  const handlePayment = async () => {
    if (!selectedCoachId) {
      Alert.alert('Choix requis', 'Sélectionnez un coach.');
      return;
    }

    const cents = Math.round(parseFloat((amount || '0').replace(',', '.')) * 100);

    if (!cents || cents < 50) {
      Alert.alert('Montant invalide', 'Entrez un montant d’au moins 0,50 €.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pay-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: selectedCoachId, amount: cents }),
      });

      const data = await res.json();

      if (data?.url && typeof data.url === 'string') {
        // Open external checkout URL robustly on native & web
        try {
          if (Platform.OS === 'web') {
            window.location.href = data.url as string;
          } else {
            await WebBrowser.openBrowserAsync(data.url);
          }
        } catch (err) {
          try { await Linking.openURL(data.url); } catch {}
        }
      } else {
        Alert.alert('Erreur', 'Impossible de lancer le paiement.');
      }
    } catch (err) {
      console.error('pay error', err);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rémunérer un coach</Text>
          <TouchableOpacity onPress={loadCoaches} disabled={listLoading}>
            <View style={[styles.iconCircle, { backgroundColor: '#17a2b8' }]}> 
              {listLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={22} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Coach list */}
        <Text style={styles.sectionTitle}>Choisissez un coach</Text>
        {listLoading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: '#666' }}>Chargement des coachs…</Text>
          </View>
        ) : coaches.length === 0 ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>Aucun coach trouvé.</Text>
          </View>
        ) : (
          <View style={styles.coachGrid}>
            {coaches.map(coach => {
              const isSelected = selectedCoachId === coach.id;
              const initials = `${(coach.firstName||'C').charAt(0)}${(coach.lastName||'').charAt(0)}`.toUpperCase();
              return (
                <TouchableOpacity
                  key={coach.id}
                  style={[styles.coachCard, isSelected && styles.coachCardSelected]}
                  onPress={() => setSelectedCoachId(coach.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.profileCircle, { backgroundColor: '#F0F0F5' }]}>
                    <Text style={styles.profileText}>{initials}</Text>
                  </View>
                  <Text style={styles.coachName} numberOfLines={1}>
                    {coach.displayName || 'Coach'}
                  </Text>
                  {typeof coach.hourlyRate === 'number' && (
                    <Text style={styles.coachSub}>{coach.hourlyRate.toFixed(0)} €/h</Text>
                  )}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Amount */}
        <Text style={styles.sectionTitle}>Montant (€)</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountInputWrap}>
            <TextInput
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="Ex : 50.00"
              style={styles.amountInput}
            />
          </View>
          <View style={styles.amountHint}>
            <Ionicons name="information-circle-outline" size={18} color="#7667ac" />
            <Text style={styles.amountHintText}>Minimum 0,50 €</Text>
          </View>
        </View>

        {/* Pay button */}
        <TouchableOpacity style={[styles.payButton, loading && { opacity: 0.7 }]} onPress={handlePayment} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={styles.payText}>Payer {selectedCoach ? `— ${selectedCoach.displayName}` : ''}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Subtle note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Le paiement ouvre une page sécurisée. Revenez ici après validation.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.oxford },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#7667ac', marginTop: 16, marginBottom: 8 },

  // Shared avatar styles
  profileCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 14, color: '#7667ac', fontWeight: '600' },

  // Icon bubble
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.oxford,
  },

  // Alerts
  alertBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  alertText: { textAlign: 'center', color: '#667085' },

  // Coach grid
  coachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  coachCard: {
    width: '47%',
    backgroundColor: '#F0F0F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  coachCardSelected: { borderColor: '#7667ac' },
  coachName: { marginTop: 8, fontSize: 13, fontWeight: '600', color: COLORS.oxford },
  coachSub: { fontSize: 11, color: '#666', marginTop: 2 },
  checkBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0E6B5A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Amount
  amountRow: { marginTop: 6 },
  amountInputWrap: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  amountInput: { fontSize: 16, color: COLORS.oxford },
  amountHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  amountHintText: { color: '#7667ac', fontSize: 12 },

  // Pay button
  payButton: {
    marginTop: 18,
    backgroundColor: COLORS.oxford,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontWeight: '700' },

  // Note
  noteBox: {
    marginTop: 12,
    backgroundColor: COLORS.bone,
    borderRadius: 10,
    padding: 12,
  },
  noteText: { color: '#4a4a4a', fontSize: 12 },
});
