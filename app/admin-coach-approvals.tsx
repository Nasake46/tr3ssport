import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { router } from 'expo-router';

type Application = {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  companyName?: string;
  siretNumber?: string;
  diploma?: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function AdminCoachApprovals() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Application[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(firestore, 'coachApplications'), where('status', '==', 'pending')));
      const list: Application[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setItems(list);
    } catch (e) {
      console.error('Erreur chargement demandes coach:', e);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (app: Application) => {
    setActing(app.id);
    try {
      // 1) Marquer la demande comme approuvée
      await updateDoc(doc(firestore, 'coachApplications', app.id), {
        status: 'approved',
        approvedAt: new Date(),
      });

      // 2) Mettre à jour le user associé
      await updateDoc(doc(firestore, 'users', app.userId), {
        role: 'coach',
        coachApplicationStatus: 'approved',
        coachApprovedAt: new Date(),
        updatedAt: new Date(),
      });

      setItems(prev => prev.filter(i => i.id !== app.id));
    } catch (e: any) {
      console.error('Erreur approbation:', e);
      Alert.alert('Erreur', e?.message || 'Action impossible');
    } finally {
      setActing(null);
    }
  };

  const reject = async (app: Application) => {
    setActing(app.id);
    try {
      await updateDoc(doc(firestore, 'coachApplications', app.id), {
        status: 'rejected',
        rejectedAt: new Date(),
      });

      await updateDoc(doc(firestore, 'users', app.userId), {
        coachApplicationStatus: 'rejected',
        updatedAt: new Date(),
      });

      setItems(prev => prev.filter(i => i.id !== app.id));
    } catch (e: any) {
      console.error('Erreur rejet:', e);
      Alert.alert('Erreur', e?.message || 'Action impossible');
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{'< Retour'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Approbation des coachs</Text>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.email}>{item.email}</Text>
              {item.companyName ? <Text style={styles.meta}>Société: {item.companyName}</Text> : null}
              {item.siretNumber ? <Text style={styles.meta}>SIRET: {item.siretNumber}</Text> : null}
              {item.diploma ? <Text style={styles.meta}>Diplôme: {item.diploma}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => reject(item)} disabled={acting === item.id}>
                  <Text style={styles.btnText}>Rejeter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => approve(item)} disabled={acting === item.id}>
                  <Text style={styles.btnText}>Approuver</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucune demande en attente.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { color: '#007AFF' },
  title: { fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, elevation: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { color: '#333', marginBottom: 8 },
  meta: { color: '#555', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  approve: { backgroundColor: '#28a745' },
  reject: { backgroundColor: '#dc3545' },
  btnText: { color: 'white', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
});
