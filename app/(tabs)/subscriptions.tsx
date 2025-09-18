// app/subscriptions.tsx
import React, { useState } from 'react';
import { View, Text, Alert, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COLORS = {
  bg: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  line: '#E5E7EB',
  chip: '#F4AF00',
  card: '#F2F4F5',
};

const SUBSCRIPTIONS = [
  { id: 'basic', name: 'Abonnement Basic', price: 1000, desc: 'Accès de base aux fonctionnalités' },
  { id: 'premium', name: 'Abonnement Premium', price: 2500, desc: 'Toutes les fonctionnalités + prioritaire' },
];

export default function SubscriptionsScreen() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSubscribe = async (subscriptionId: string) => {
    setLoadingId(subscriptionId);
    try {
      const res = await fetch('http://192.168.1.124:4242/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });

      const data = await res.json();
      if (data?.url) {
        setLoadingId(null); // important avant navigation
        router.replace(data.url);
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer le paiement.');
        setLoadingId(null);
      }
    } catch (e) {
      console.error('Erreur abonnement:', e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
      setLoadingId(null);
    }
  };

  const renderItem = ({ item }: { item: typeof SUBSCRIPTIONS[number] }) => {
    const isLoading = loadingId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Ionicons name="star" size={16} color="#2B2B2B" />
            <Text style={styles.badgeText}>{item.id === 'premium' ? 'Populaire' : 'Essentiel'}</Text>
          </View>
          <Text style={styles.price}>{(item.price / 100).toFixed(2)} € / mois</Text>
        </View>

        <Text style={styles.cardTitle}>{item.name}</Text>
        {!!item.desc && <Text style={styles.cardDesc}>{item.desc}</Text>}

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            <Text style={styles.featureText}>
              {(item.id === 'premium' ? 'Toutes' : 'Les principales') + ' fonctionnalités incluses'}
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.featureText}>Renouvellement mensuel, sans engagement</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
          onPress={() => handleSubscribe(item.id)}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>S'abonner</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Intro / Hero */}
      <View style={styles.hero}>
        <Text style={styles.h1}>Choisissez votre formule</Text>
        <Text style={styles.sub}>
          Profitez de Tr3ssport au meilleur niveau. Changez ou annulez à tout moment.
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={SUBSCRIPTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 36, height: 36 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },

  hero: { paddingHorizontal: 20, marginTop: 8, marginBottom: 6 },
  h1: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sub: { marginTop: 4, fontSize: 14, color: COLORS.sub },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  badgeText: { color: '#2B2B2B', fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  cardTitle: { marginTop: 8, fontSize: 18, fontWeight: '700', color: COLORS.text },
  cardDesc: { marginTop: 4, fontSize: 14, color: COLORS.sub },

  features: { marginTop: 10, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: COLORS.sub },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
