import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebase';
import * as banService from '@/services/banService';
import * as userService from '@/services/userService';

export default function AdminBansPage() {
  const [loading, setLoading] = useState(true);
  const [bans, setBans] = useState<banService.BanRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const u = auth.currentUser;
        if (!u) {
          Alert.alert('Erreur', 'Vous devez être connecté');
          router.back();
          return;
        }
        const access = await userService.isUserAdminOrObserver(u.uid);
        if (!access.allowed) {
          Alert.alert('Accès refusé', "Vous n'avez pas les permissions nécessaires", [{ text: 'OK', onPress: () => router.back() }]);
          return;
        }
        const data = await banService.getAllBans();
        // Tri par date desc si possible
        data.sort((a, b) => {
          const da = (a as any).bannedAt?.toDate ? (a as any).bannedAt.toDate() : new Date((a as any).bannedAt || 0);
          const db = (b as any).bannedAt?.toDate ? (b as any).bannedAt.toDate() : new Date((b as any).bannedAt || 0);
          return db.getTime() - da.getTime();
        });
        setBans(data);
      } catch (e: any) {
        console.error('Load bans error:', e);
        setError(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const renderItem = ({ item }: { item: banService.BanRecord }) => {
    const d = (item as any).bannedAt?.toDate ? (item as any).bannedAt.toDate() : null;
    const when = d ? d.toLocaleString('fr-FR') : 'Date inconnue';
    return (
      <View style={styles.banItem}>
        <View style={styles.rowTop}>
          <Text style={styles.email}>{item.email || item.userId}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{item.roleAtBan || 'inconnu'}</Text></View>
        </View>
        <Text style={styles.reason}>{item.reason}</Text>
        <Text style={styles.meta}>Banni le {when} par {item.bannedByEmail || item.bannedBy}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Utilisateurs bannis' }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Utilisateurs bannis' }} />
        <Text style={{ color: '#d32f2f' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Utilisateurs bannis', headerBackTitle: 'Retour' }} />
      <FlatList
        data={bans}
        keyExtractor={(i, idx) => (i.id as string) || `${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun utilisateur banni</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  banItem: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  email: { fontSize: 16, fontWeight: '600', color: '#333' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#6c757d', borderRadius: 12 },
  roleBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  reason: { color: '#333', fontSize: 14, marginBottom: 4 },
  meta: { color: '#666', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
